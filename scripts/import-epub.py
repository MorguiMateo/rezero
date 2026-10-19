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
import sys
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


def moveEdgePunctuation(inlines):
    def isWord(node, edge):
        # A word, or emphasis that ends (or starts) with one: "**muerte***." cannot open either.
        if isinstance(node, dict) and node.get("t") in ("Emph", "Strong") and node["c"]:
            return isWord(node["c"][edge], edge)
        return (isinstance(node, dict) and node.get("t") == "Str" and node["c"]
                and node["c"][edge].isalnum())
    def isSpace(node):
        return isinstance(node, dict) and node.get("t") in ("Space", "SoftBreak")
    result = list(inlines)
    output = []
    for index, node in enumerate(result):
        if not (isinstance(node, dict) and node.get("t") in ("Emph", "Strong") and node["c"]):
            output.append(node)
            continue
        inner = node["c"]
        after = result[index + 1] if index + 1 < len(result) else None
        before = output[-1] if output else None
        prefix, suffix = [], []
        last = inner[-1]
        if isWord(after, 0) and last.get("t") == "Str" and not last["c"][-1].isalnum():
            match = re.search(r"[^\w]+$", last["c"])
            moved, last["c"] = match.group(), last["c"][:match.start()]
            if not last["c"]:
                inner.pop()
            if after.get("t") == "Str":
                after["c"] = moved + after["c"]
            else:
                suffix = [{"t": "Str", "c": moved}]
            while inner and isSpace(inner[-1]):
                suffix.insert(0, inner.pop())
        first = inner[0] if inner else None
        if first and isWord(before, -1) and first.get("t") == "Str" and not first["c"][0].isalnum():
            match = re.match(r"[^\w]+", first["c"])
            moved, first["c"] = match.group(), first["c"][match.end():]
            if not first["c"]:
                inner.pop(0)
            if before.get("t") == "Str":
                before["c"] = before["c"] + moved
            else:
                prefix = [{"t": "Str", "c": moved}]
            while inner and isSpace(inner[0]):
                prefix.append(inner.pop(0))
        output.extend(prefix + ([node] if inner else []) + suffix)
    return output


def trimBreaks(inlines, edge):
    """Drop breaks and spaces at one edge (0 start, -1 end), also inside edge emphasis."""
    inlines = copy.deepcopy(inlines)
    while inlines:
        node = inlines[edge]
        if node.get("t") in ("LineBreak", "Space", "SoftBreak"):
            inlines.pop(edge)
        elif node.get("t") in ("Emph", "Strong", "Underline"):
            node["c"] = trimBreaks(node["c"], edge)
            if node["c"]:
                break
            inlines.pop(edge)
        elif node.get("t") == "Span":
            node["c"][1] = trimBreaks(node["c"][1], edge)
            if node["c"][1]:
                break
            inlines.pop(edge)
        else:
            break
    return inlines


def withoutNotes(value):
    if isinstance(value, list):
        return [withoutNotes(child) for child in value
                if not (isinstance(child, dict) and child.get("t") == "Link"
                        and child["c"][2][0].startswith("epub-note:"))]
    if isinstance(value, dict):
        return {key: withoutNotes(child) for key, child in value.items()}
    return value


def normalizeAst(value, noteBlocks, noteCounts):
    if isinstance(value, list):
        result = []
        for child in value:
            child = normalizeAst(child, noteBlocks, noteCounts)
            # "*texto\\\n*" never closes in CommonMark; keep edge breaks outside the emphasis.
            if isinstance(child, dict) and child.get("t") in ("Emph", "Strong") and child["c"]:
                inner = child["c"]
                lead = [] if inner[0].get("t") != "LineBreak" else [inner.pop(0)]
                trail = [] if not inner or inner[-1].get("t") != "LineBreak" else [inner.pop()]
                result.extend(lead + ([child] if inner else []) + trail)
            else:
                result.append(child)
        # "*wasou――*todos" cannot close in CommonMark: punctuation at the inner edge of
        # emphasis touching a letter outside. Move that punctuation out of the emphasis.
        result = moveEdgePunctuation(result)
        # GFM autolinks a bare URL and would swallow the "\" of a hard break right after it.
        return [{"t": "Space"} if isinstance(node, dict) and node.get("t") == "LineBreak" and index
                and isinstance(result[index - 1], dict) and result[index - 1].get("t") == "Str"
                and re.search(r"(https?://|www\.)\S*$", result[index - 1]["c"]) else node
                for index, node in enumerate(result)]
    if not isinstance(value, dict):
        return value
    kind = value.get("t")
    if kind in ("RawBlock", "RawInline"):
        raise ValueError("Unexpected raw markup in EPUB")
    # A line break at either end of a paragraph would become a literal "\" in Markdown.
    if kind in ("Para", "Plain"):
        value = {"t": kind, "c": trimBreaks(trimBreaks(value["c"], 0), -1)}
    # Emphasis on punctuation alone (a closing quote, a lone "!") can become literal
    # * or ** in CommonMark. Keep every character, but discard that publisher decoration.
    # A note marker alone in bold or italics ("*palabra**[^2]***") counts as no text either.
    if kind in ("Emph", "Strong", "Underline") and not any(character.isalnum() for character in plainText(withoutNotes(value["c"]))):
        return {"t": "Span", "c": [["", [], []], normalizeAst(value["c"], noteBlocks, noteCounts)]}
    # ATX headings cannot hold hard line breaks; read them as spaces.
    if kind == "Header":
        level, attributes, inlines = value["c"]
        value = {"t": kind, "c": [level, attributes, json.loads(json.dumps(trimBreaks(trimBreaks(inlines, 0), -1))
                                                              .replace('{"t": "LineBreak"}', '{"t": "Space"}'))]}
    # <i><i>x</i></i> is still italic, but Markdown cannot nest emphasis directly.
    while kind in ("Emph", "Underline") and len(value["c"]) == 1 and value["c"][0].get("t") in ("Emph", "Underline"):
        value = {"t": "Emph", "c": value["c"][0]["c"]}
        kind = "Emph"
    # CommonMark has no underline; represent that emphasis without raw HTML.
    if kind == "Underline":
        return {"t": "Emph", "c": normalizeAst(value["c"], noteBlocks, noteCounts)}
    if kind == "Link":
        target = value["c"][2][0]
        if target.startswith("epub-note:"):
            noteId = target.removeprefix("epub-note:")
            if noteId not in noteBlocks:
                # A marker pointing at a note the edition never wrote ("ntX"); drop the marker.
                print(f"warning: dropped reference to missing note {noteId!r}", file=sys.stderr)
                return {"t": "Span", "c": [["", [], []], []]}
            noteCounts[noteId] += 1
            return {"t": "Note", "c": normalizeAst(copy.deepcopy(noteBlocks[noteId]), noteBlocks, noteCounts)}
        raise ValueError(f"Unmapped EPUB link: {target}")
    return {key: normalizeAst(child, noteBlocks, noteCounts) for key, child in value.items()}


def linkAncestors(element, parents):
    while element in parents:
        element = parents[element]
        yield element


def removeKeepingTail(parent, child):
    index = list(parent).index(child)
    if child.tail:
        if index:
            parent[index - 1].tail = (parent[index - 1].tail or "") + child.tail
        else:
            parent.text = (parent.text or "") + child.tail
    parent.remove(child)


def unwrap(parent, child):
    """Replace an element by its content, keeping text and tail in place."""
    index = list(parent).index(child)
    grandchildren = list(child)
    if child.text:
        if index:
            parent[index - 1].tail = (parent[index - 1].tail or "") + child.text
        else:
            parent.text = (parent.text or "") + child.text
    for offset, grandchild in enumerate(grandchildren):
        parent.insert(index + offset, grandchild)
    if grandchildren:
        grandchildren[-1].tail = (grandchildren[-1].tail or "") + (child.tail or "")
        parent.remove(child)
    else:
        removeKeepingTail(parent, child)


def webpSize(data):
    # cwebp writes a single VP8 (lossy) or VP8L (lossless) chunk, or VP8X when there is alpha.
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Expected WebP")
    chunk = data[12:16]
    if chunk == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
        return {"width": int.from_bytes(data[26:28], "little") & 0x3fff,
                "height": int.from_bytes(data[28:30], "little") & 0x3fff}
    if chunk == b"VP8L" and data[20] == 0x2f:
        sizeBits = int.from_bytes(data[21:25], "little")
        return {"width": (sizeBits & 0x3fff) + 1, "height": ((sizeBits >> 14) & 0x3fff) + 1}
    if chunk == b"VP8X":
        return {"width": int.from_bytes(data[24:27], "little") + 1,
                "height": int.from_bytes(data[27:30], "little") + 1}
    raise ValueError("Unknown WebP chunk")


def writeYaml(filePath, data):
    filePath.parent.mkdir(parents=True, exist_ok=True)
    filePath.write_text("\n".join(f"{key}: {json.dumps(value, ensure_ascii=False)}"
                                  for key, value in data.items()) + "\n")


def importEpub(epubPath, recipePath, outputPath, quality=None):
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
            encoding = ["-lossless", "-exact"] if quality is None else ["-q", str(quality), "-m", "6"]
            runCommand(["cwebp", "-quiet", *encoding, "-metadata", "none", str(originalPath), "-o", str(imagePath)])
            imageManifest[targetPath] = webpSize(imagePath.read_bytes())
            imageMap[sourcePath] = targetPath

        # Each note is the list item or paragraph around an anchor whose id the
        # chapters link to (notas.xhtml#<id>); editions differ in the markup.
        noteBlocks = {}
        if recipe.get("notes"):
            noteDocument = xml.fromstring(archive.read(recipe["notes"]))
            parents = {child: parent for parent in noteDocument.iter() for child in parent}
            # Ids sit on the note itself (<li id>, <aside id>) or on an anchor inside it.
            holders = [element for element in noteDocument.iter()
                       if element.get("id") and element.tag.split("}")[-1] in ("li", "aside")]
            anchors = [link for link in noteDocument.findall(".//{*}a[@id]")
                       if not any(holder in linkAncestors(link, parents) for holder in holders)]
            # A note split across paragraphs can repeat its anchor id; the note is then the
            # closest element that holds every copy (the editor's <div class="nota">).
            split = {noteId: links for noteId in {link.get("id") for link in anchors}
                     if len(links := [link for link in anchors if link.get("id") == noteId]) > 1}
            for link in holders + anchors:
                noteId = link.get("id")
                if noteId in split and link is not split[noteId][0]:
                    continue
                if noteId in noteBlocks:
                    raise ValueError(f"Duplicate translator note: {noteId}")
                element = link
                if noteId in split:
                    element = next(ancestor for ancestor in linkAncestors(link, parents)
                                   if all(ancestor in linkAncestors(other, parents) for other in split[noteId]))
                    for anchor in element.findall(".//{*}a"):
                        unwrap(parents[anchor], anchor)
                    parents = {child: parent for parent in noteDocument.iter() for child in parent}
                while element.tag.split("}")[-1] not in ("li", "p", "aside", "div"):
                    element = parents[element]
                # Some editions repeat the note number ("[1]") before its text.
                for marker in element.findall(".//{*}sup"):
                    if re.fullmatch(r"[\[(❮]?\d+[\])❯]?", "".join(marker.itertext()).strip()):
                        removeKeepingTail(parents[marker], marker)
                    else:
                        marker.tag = "span"
                for anchor in element.findall(".//{*}a"):
                    anchor.tag = "span"
                    anchor.attrib.clear()
                hasBlocks = any(child.tag.split("}")[-1] in ("p", "div") for child in element)
                element.tag = "div" if hasBlocks else "p"
                element.attrib.clear()
                noteBlocks[noteId] = parseHtml(element)["blocks"]

        noteCounts = Counter()
        report = []
        for group in groups:
            combined = None
            for sourcePath in group["files"]:
                document = xml.fromstring(archive.read(sourcePath))
                body = document.find("{*}body")
                # Full-page covers are often <svg><image xlink:href="…"/></svg>; keep them as <img>.
                for svg in [element for element in body.iter() if element.tag.endswith("}svg")]:
                    image = next(element for element in svg.iter() if element.tag.endswith("}image"))
                    source = image.get("{http://www.w3.org/1999/xlink}href") or image.get("href")
                    tail = svg.tail
                    svg.clear()
                    svg.tag, svg.tail = "img", tail
                    svg.set("src", source)
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
                            # "noteLinks" repairs markers that point at the wrong note ("<file>#<marker id>": note id).
                            noteId = recipe.get("noteLinks", {}).get(f"{sourcePath}#{element.get('id')}", target.fragment)
                            element.set("href", f"epub-note:{noteId}")
                        elif archivePath(sourcePath, href) not in spine:
                            raise ValueError(f"Unexpected link: {href}")
                        else:
                            element.tag = "span"
                            element.attrib.clear()
                    if tag == "sup":
                        element.tag = "span"
                    # Captioned images (colour credits) read as an image paragraph plus a caption.
                    if tag == "figure":
                        element.tag = "div"
                    if tag == "figcaption":
                        element.tag = "p"
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
            # Some editions space paragraphs with empty ones (<p><br/></p>).
            combined["blocks"] = [block for block in combined["blocks"]
                                  if not (block["t"] in ("Para", "Plain") and not block["c"])]
            markdown = runCommand(["pandoc", "--sandbox", "-f", "json", "-t", "gfm-raw_html",
                                   "--wrap=none"], json.dumps(combined))
            markdown = re.sub(r"(?m)^-{3,}$", "***", markdown)
            # GFM reads two "~" in a paragraph ("Hola~ ... adiós~") as strikethrough.
            markdown = re.sub(r"(?<!\\)~", r"\\~", markdown)
            roundTrip = json.loads(runCommand(["pandoc", "--sandbox", "-f", "gfm", "-t", "json"], markdown))
            before, after = plainText(combined["blocks"]), plainText(roundTrip["blocks"])
            if before != after:
                Path(tempfile.gettempdir(), "import-epub-failed.md").write_text(markdown)
                index = next((i for i, pair in enumerate(zip(before, after)) if pair[0] != pair[1]),
                             min(len(before), len(after)))
                raise ValueError(f"Text changed during conversion: {group['slug']}: "
                                 f"{before[max(0, index - 60):index + 60]!r} != {after[max(0, index - 60):index + 60]!r}")
            before = Counter(node.get("t") for node in nodes(combined))
            after = Counter(node.get("t") for node in nodes(roundTrip))
            for kind in ("Image", "Emph", "Strong", "Note"):
                if before[kind] != after[kind]:
                    Path(tempfile.gettempdir(), "import-epub-failed.md").write_text(markdown)
                    raise ValueError(f"Lost {kind} in {group['slug']}")
            chapterPath = outputPath / "novela" / recipe["workSlug"] / recipe["volumeSlug"] / (group["slug"] + ".md")
            chapterPath.parent.mkdir(parents=True, exist_ok=True)
            chapterPath.write_text(f"---\ntitle: {json.dumps(group['title'], ensure_ascii=False)}\nnumber: {group['number']}\n---\n\n{markdown}")
            report.append({"slug": group["slug"], "parts": len(group["files"]),
                           "images": before["Image"], "notes": before["Note"],
                           "characters": len(plainText(combined["blocks"]))})
        # "unusedNotes" lists template leftovers ("[2] TEXTO") that no chapter links to.
        expectedNotes = set(noteBlocks) - set(recipe.get("unusedNotes", []))
        # "sharedNotes" lists notes the edition links from more than one place on purpose.
        shared = set(recipe.get("sharedNotes", []))
        if set(noteCounts) != expectedNotes or any(count != 1 for note, count in noteCounts.items() if note not in shared):
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
    parser.add_argument("--quality", type=int, help="lossy WebP quality (default: lossless)")
    options = parser.parse_args()
    importEpub(options.epub, options.recipe, options.output, options.quality)
