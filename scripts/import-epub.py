#!/usr/bin/env python3
"""Convert a reviewed EPUB recipe offline into a NEW staging directory.

Requires pandoc and cwebp; never downloads, overwrites content, or runs in builds.
"""

import argparse
import copy
import hashlib
import json
import posixpath
import re
import subprocess
import tempfile
import xml.etree.ElementTree as xml
import zipfile
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlsplit


def runCommand(arguments, source=None):
    return subprocess.run(arguments, input=source, text=True, capture_output=True,
                          check=True, timeout=120).stdout


def parseHtml(element):
    source = xml.tostring(element, encoding="unicode", method="html")
    return json.loads(runCommand([
        "pandoc", "--sandbox", "-f", "html-native_divs-native_spans", "-t", "json",
    ], source))


def archivePath(basePath, reference):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc:
        raise ValueError(f"External EPUB resource: {reference}")
    result = posixpath.normpath(posixpath.join(posixpath.dirname(basePath), unquote(parsed.path)))
    if result.startswith("../") or result.startswith("/") or "\\" in result:
        raise ValueError(f"Unsafe EPUB resource: {reference}")
    return result


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


def plainText(value):
    parts = []
    for node in nodes(value):
        if node.get("t") == "Str":
            parts.append(node["c"])
        elif node.get("t") in ("Space", "SoftBreak", "LineBreak"):
            parts.append(" ")
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def normalizeAst(value, noteBlocks, noteCounts):
    if isinstance(value, list):
        return [normalizeAst(child, noteBlocks, noteCounts) for child in value]
    if not isinstance(value, dict):
        return value
    kind = value.get("t")
    if kind in ("RawBlock", "RawInline"):
        raise ValueError("Unexpected raw markup in EPUB")
    # Emphasis on punctuation alone (a closing quote, a lone "!") can become literal
    # * or ** in CommonMark. Keep every character, but discard that publisher decoration.
    if kind in ("Emph", "Strong", "Underline") and not any(character.isalnum() for character in plainText(value["c"])):
        return {"t": "Span", "c": [["", [], []], normalizeAst(value["c"], noteBlocks, noteCounts)]}
    # CommonMark has no underline; represent that emphasis without raw HTML.
    if kind == "Underline":
        return {"t": "Emph", "c": normalizeAst(value["c"], noteBlocks, noteCounts)}
    if kind == "Link":
        target = value["c"][2][0]
        if target.startswith("epub-note:"):
            noteId = target.removeprefix("epub-note:")
            noteCounts[noteId] += 1
            return {"t": "Note", "c": copy.deepcopy(noteBlocks[noteId])}
        raise ValueError(f"Unmapped EPUB link: {target}")
    return {key: normalizeAst(child, noteBlocks, noteCounts) for key, child in value.items()}


def removeKeepingTail(parent, child):
    index = list(parent).index(child)
    if child.tail:
        if index:
            parent[index - 1].tail = (parent[index - 1].tail or "") + child.tail
        else:
            parent.text = (parent.text or "") + child.tail
    parent.remove(child)


def writeYaml(filePath, data):
    filePath.parent.mkdir(parents=True, exist_ok=True)
    filePath.write_text("\n".join(f"{key}: {json.dumps(value, ensure_ascii=False)}"
                                  for key, value in data.items()) + "\n")


def importEpub(epubPath, recipePath, outputPath):
    recipe = json.loads(recipePath.read_text())
    if outputPath.exists():
        raise ValueError("Staging directory already exists; choose a new destination")
    slugPattern = r"[a-z0-9]+(?:-[a-z0-9]+)*"
    for slug in [recipe["workSlug"], recipe["volumeSlug"], *[g["slug"] for g in recipe["groups"]]]:
        if not re.fullmatch(slugPattern, slug):
            raise ValueError(f"Invalid content slug: {slug}")
    groups = recipe["groups"]
    if len({g["slug"] for g in groups}) != len(groups) or len({g["number"] for g in groups}) != len(groups):
        raise ValueError("Duplicate chapter slug or number")
    with zipfile.ZipFile(epubPath) as archive, tempfile.TemporaryDirectory() as temporary:
        if archive.read("mimetype") != b"application/epub+zip" or archive.testzip():
            raise ValueError("Invalid EPUB archive")
        packagePath = xml.fromstring(archive.read("META-INF/container.xml")).find(".//{*}rootfile").get("full-path")
        package = xml.fromstring(archive.read(packagePath))
        items = {item.get("id"): item for item in package.findall(".//{*}manifest/{*}item")}
        spine = [archivePath(packagePath, items[item.get("idref")].get("href"))
                 for item in package.findall(".//{*}spine/{*}itemref")]
        assigned = [file for group in groups for file in group["files"]]
        ignored = recipe.get("ignored", [])
        if Counter(assigned + ignored) != Counter(spine):
            raise ValueError("Recipe must account for every spine item exactly once")
        if assigned != [file for file in spine if file not in ignored]:
            raise ValueError("Recipe changes EPUB reading order")
        outputPath.mkdir(parents=True)
        imageManifest = {}
        imageMap = {}
        for image in recipe["images"]:
            sourcePath, targetPath = image["source"], image["target"]
            if archivePath("root", targetPath) != targetPath or not targetPath.endswith(".webp"):
                raise ValueError("Unsafe image destination")
            originalPath = Path(temporary) / "image"
            originalPath.write_bytes(archive.read(sourcePath))
            imagePath = outputPath / "images" / targetPath
            imagePath.parent.mkdir(parents=True, exist_ok=True)
            runCommand(["cwebp", "-quiet", "-lossless", "-exact", str(originalPath), "-o", str(imagePath)])
            # cwebp lossless emits a VP8L header containing the original dimensions.
            data = imagePath.read_bytes()
            if data[12:16] != b"VP8L" or data[20] != 0x2f:
                raise ValueError("Expected lossless WebP")
            sizeBits = int.from_bytes(data[21:25], "little")
            imageManifest[targetPath] = {"width": (sizeBits & 0x3fff) + 1,
                                         "height": ((sizeBits >> 14) & 0x3fff) + 1}
            imageMap[sourcePath] = targetPath

        # Each note is the list item or paragraph around an anchor whose id the
        # chapters link to (notas.xhtml#<id>); editions differ in the markup.
        noteBlocks = {}
        if recipe.get("notes"):
            noteDocument = xml.fromstring(archive.read(recipe["notes"]))
            parents = {child: parent for parent in noteDocument.iter() for child in parent}
            for link in noteDocument.findall(".//{*}a[@id]"):
                noteId = link.get("id")
                if noteId in noteBlocks:
                    raise ValueError(f"Duplicate translator note: {noteId}")
                element = link
                while element.tag.split("}")[-1] not in ("li", "p"):
                    element = parents[element]
                # Some editions repeat the note number ("[1]") before its text.
                for marker in element.findall(".//{*}sup"):
                    if re.fullmatch(r"\[?\d+\]?", "".join(marker.itertext()).strip()):
                        removeKeepingTail(parents[marker], marker)
                for anchor in element.findall(".//{*}a"):
                    anchor.tag = "span"
                    anchor.attrib.clear()
                element.tag = "p"
                noteBlocks[noteId] = parseHtml(element)["blocks"]

        noteCounts = Counter()
        report = []
        for group in groups:
            combined = None
            for sourcePath in group["files"]:
                document = xml.fromstring(archive.read(sourcePath))
                body = document.find("{*}body")
                for element in body.iter():
                    tag = element.tag.split("}")[-1]
                    element.tag = tag
                    if tag == "img":
                        targetPath = imageMap[archivePath(sourcePath, element.get("src"))]
                        element.set("src", targetPath)
                        isCover = targetPath in (recipe["work"].get("cover"), recipe.get("volumeCover"))
                        element.set("alt", "Portada" if isCover else "Ilustración")
                    if tag == "a":
                        href = element.get("href", "")
                        target = urlsplit(href)
                        if target.scheme or target.netloc:
                            # Credits link to the translators' social pages; keep the text only.
                            element.tag = "span"
                            element.attrib.clear()
                        elif recipe.get("notes") and target.fragment and archivePath(sourcePath, href) == recipe["notes"]:
                            element.set("href", f"epub-note:{target.fragment}")
                        elif archivePath(sourcePath, href) not in spine:
                            raise ValueError(f"Unexpected link: {href}")
                        else:
                            element.tag = "span"
                            element.attrib.clear()
                    if tag == "sup":
                        element.tag = "span"
                part = parseHtml(body)
                # The route already renders the chapter title; keep numbered subsections.
                part["blocks"] = [block for block in part["blocks"]
                                  if not (block["t"] == "Header" and block["c"][0] == 1
                                          and group.get("omitHeading", True))]
                if combined is None:
                    combined = part
                else:
                    combined["blocks"].extend(part["blocks"])
            combined = normalizeAst(combined, noteBlocks, noteCounts)
            markdown = runCommand(["pandoc", "--sandbox", "-f", "json", "-t", "gfm-raw_html",
                                   "--wrap=none"], json.dumps(combined))
            markdown = re.sub(r"(?m)^-{3,}$", "***", markdown)
            # GFM reads two "~" in a paragraph ("Hola~ ... adiós~") as strikethrough.
            markdown = re.sub(r"(?<!\\)~", r"\\~", markdown)
            roundTrip = json.loads(runCommand(["pandoc", "--sandbox", "-f", "gfm", "-t", "json"], markdown))
            before, after = plainText(combined["blocks"]), plainText(roundTrip["blocks"])
            if before != after:
                index = next((i for i, pair in enumerate(zip(before, after)) if pair[0] != pair[1]),
                             min(len(before), len(after)))
                raise ValueError(f"Text changed during conversion: {group['slug']}: "
                                 f"{before[index - 60:index + 60]!r} != {after[index - 60:index + 60]!r}")
            before = Counter(node.get("t") for node in nodes(combined))
            after = Counter(node.get("t") for node in nodes(roundTrip))
            for kind in ("Image", "Emph", "Strong", "Note"):
                if before[kind] != after[kind]:
                    raise ValueError(f"Lost {kind} in {group['slug']}")
            chapterPath = outputPath / "novela" / recipe["workSlug"] / recipe["volumeSlug"] / (group["slug"] + ".md")
            chapterPath.parent.mkdir(parents=True, exist_ok=True)
            chapterPath.write_text(f"---\ntitle: {json.dumps(group['title'], ensure_ascii=False)}\nnumber: {group['number']}\n---\n\n{markdown}")
            report.append({"slug": group["slug"], "parts": len(group["files"]),
                           "images": before["Image"], "notes": before["Note"],
                           "characters": len(plainText(combined["blocks"]))})
        if set(noteCounts) != set(noteBlocks) or any(count != 1 for count in noteCounts.values()):
            raise ValueError("Missing or repeated translator notes")
        workPath = outputPath / "novela" / recipe["workSlug"]
        writeYaml(workPath / "work.yaml", recipe["work"])
        writeYaml(workPath / recipe["volumeSlug"] / "volume.yaml", recipe["volume"])
        (outputPath / "images.json").write_text(json.dumps(imageManifest, ensure_ascii=False, indent=2) + "\n")
        (outputPath / "import-report.json").write_text(json.dumps({
            "source": recipe["source"], "sha256": hashlib.sha256(epubPath.read_bytes()).hexdigest(),
            "sections": report, "images": len(imageMap), "notes": sum(noteCounts.values()),
        }, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"staging": str(outputPath), "sections": len(report),
                          "images": len(imageMap), "notes": sum(noteCounts.values())}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("epub", type=Path)
    parser.add_argument("recipe", type=Path)
    parser.add_argument("output", type=Path)
    options = parser.parse_args()
    importEpub(options.epub, options.recipe, options.output)
