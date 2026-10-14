#!/usr/bin/env python3
"""Reviewable, offline PDF -> Markdown import; never writes into content/.

Requires PyMuPDF, pandoc and cwebp (no app dependencies).
  import-pdf.py extract book.pdf recipe.json --volume 16 --project 'Ale ツ Translations'
  # Review groups, page lines, image actions and notes; set reviewed to true.
  import-pdf.py convert book.pdf recipe.json NEW-staging-directory

Pages are one-based and ranges inclusive. Recipes retain span styles and geometry,
record every removed line/image, and can be edited without re-extracting the PDF.
Raster headings need manual transcription; this is not an OCR importer.
"""

import argparse
import hashlib
import json
import re
import statistics
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

import pymupdf


contentPath = Path(__file__).resolve().parent.parent / "content"


def checkDestination(path):
    resolvedPath = path.resolve()
    if resolvedPath == contentPath or contentPath in resolvedPath.parents:
        raise ValueError("The content/ submodule is never an import destination")
    if path.exists():
        raise ValueError(f"Destination already exists: {path}")


def runCommand(arguments, source=None):
    return subprocess.run(arguments, input=source, text=True, capture_output=True,
                          check=True, timeout=120).stdout


def writeJson(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def writeYaml(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(f"{key}: {json.dumps(value, ensure_ascii=False)}"
                              for key, value in data.items()) + "\n")


def webpSize(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Expected WebP")
    chunk = data[12:16]
    if chunk == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
        return {"width": int.from_bytes(data[26:28], "little") & 0x3fff,
                "height": int.from_bytes(data[28:30], "little") & 0x3fff}
    if chunk == b"VP8L" and data[20] == 0x2f:
        bits = int.from_bytes(data[21:25], "little")
        return {"width": (bits & 0x3fff) + 1, "height": ((bits >> 14) & 0x3fff) + 1}
    if chunk == b"VP8X":
        return {"width": int.from_bytes(data[24:27], "little") + 1,
                "height": int.from_bytes(data[27:30], "little") + 1}
    raise ValueError("Unknown WebP chunk")


def normalizeText(text):
    return re.sub(r"\s+", " ", text.replace("\u00ad", "")).strip()


def lineText(line):
    return normalizeText("".join(span["text"] for span in line["spans"]))


def recoverDrawnDashes(page, lines):
    # Word exports can draw an underscore/rule over space glyphs instead of
    # encoding a dialogue dash. Recover only thin black rules over actual spaces;
    # ordinary underlining of letters, page furniture and scene rules stay out.
    rules = [drawing["rect"] for drawing in page.get_drawings()
             if drawing["fill"] == (0., 0., 0.) and 0 < drawing["rect"].height < 2
             and 8 < drawing["rect"].width < 70
             and 45 < drawing["rect"].y0 < page.rect.height - 70]
    if not rules:
        return
    rawSpans = {tuple(round(value, 2) for value in span["bbox"]): span
                for block in page.get_text("rawdict", flags=pymupdf.TEXTFLAGS_TEXT)["blocks"]
                for line in block.get("lines", []) for span in line["spans"]}
    matchedRules = set()
    for line in lines:
        for span in line["spans"]:
            rawSpan = rawSpans.get(tuple(span["bbox"]))
            if not rawSpan:
                continue
            characters = [character["c"] for character in rawSpan["chars"]]
            recovered = 0
            for rule in rules:
                if tuple(rule) in matchedRules:
                    continue
                matches = [index for index, character in enumerate(rawSpan["chars"])
                           if character["c"].isspace()
                           and rule.x0 - 1 < character["bbox"][0] < rule.x1 - 1
                           and abs(character["bbox"][3] - rule.y0) < 10]
                if matches:
                    characters[matches[0]] = "—"
                    for index in matches[1:]:
                        characters[index] = ""
                    recovered += 1
                    matchedRules.add(tuple(rule))
            if recovered:
                span["text"] = "".join(characters)
                span["recoveredDashes"] = recovered

    for rule in rules:
        if tuple(rule) in matchedRules:
            continue
        # A drawn dash can wrap onto the next line while its blank text glyph
        # stays with the opening quote on the previous line.
        for line in lines:
            visibleSpans = [span for span in line["spans"] if span["text"].strip()]
            if not visibleSpans:
                continue
            span = visibleSpans[0]
            if (span["text"].lstrip().startswith(('”', '"'))
                    and abs(span["bbox"][0] - rule.x1) < 2
                    and span["bbox"][1] < rule.y0 < span["bbox"][3]):
                recoveredSpan = {**span, "text": "—", "recoveredDashes": 1,
                                 "bbox": [rule.x0, span["bbox"][1], rule.x1, span["bbox"][3]]}
                line["spans"].insert(0, recoveredSpan)
                line["bbox"][0] = min(line["bbox"][0], rule.x0)
                break


def getPageLines(page):
    lines = []
    for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_TEXT)["blocks"]:
        for line in block.get("lines", []):
            if not any(span["text"].strip() for span in line["spans"]):
                continue
            spans = [{"text": span["text"], "font": span["font"],
                      "size": round(span["size"], 2), "flags": span["flags"],
                      "bbox": [round(value, 2) for value in span["bbox"]]}
                     for span in line["spans"] if span["text"]]
            if spans:
                lines.append({"bbox": [round(value, 2) for value in line["bbox"]],
                              "spans": spans, "kind": "text"})
    recoverDrawnDashes(page, lines)
    # Some word processors put opening/closing quotes in separate same-baseline
    # lines. Merge them by position, not by the PDF's object order.
    lines.sort(key=lambda line: (round(line["bbox"][1] / 2), line["bbox"][0]))
    mergedLines = []
    for line in lines:
        if (mergedLines and abs(line["bbox"][1] - mergedLines[-1]["bbox"][1]) < 3
                and line["bbox"][0] >= mergedLines[-1]["bbox"][2] - 1):
            previous = mergedLines[-1]
            previous["spans"].extend(line["spans"])
            previous["bbox"][2] = max(previous["bbox"][2], line["bbox"][2])
            previous["bbox"][3] = max(previous["bbox"][3], line["bbox"][3])
        else:
            mergedLines.append(line)
    return mergedLines


def extractPdf(pdfPath, recipePath, volumeNumber, project, downloadedAt, workMetadata):
    checkDestination(recipePath)
    with pymupdf.open(pdfPath) as document:
        if not document.is_pdf or document.needs_pass:
            raise ValueError("Expected an unlocked PDF")
        pageLines = [getPageLines(page) for page in document]
        edgeCounts = Counter(lineText(line) for page, lines in zip(document, pageLines)
                             for line in lines if line["bbox"][1] < page.rect.height * .06
                             or line["bbox"][1] > page.rect.height * .89)
        repeatedEdges = {text for text, count in edgeCounts.items()
                         if count >= max(3, len(document) * .02) and not text.isdigit()
                         and sum(character.isalpha() for character in text) >= 5
                         and not text.startswith(('"', '“', '«'))}
        pages, images, groups, notes, warnings = [], [], [], [], []
        imageNumber = 0
        sourceCharacters = 0
        sourceNonWhitespace = 0
        for pageNumber, (page, lines) in enumerate(zip(document, pageLines), 1):
            rawText = page.get_text()
            sourceCharacters += len(rawText)
            sourceNonWhitespace += len(re.sub(r"\s", "", rawText))
            removedLines, keptLines = [], []
            for line in lines:
                text = lineText(line)
                isEdge = line["bbox"][1] < page.rect.height * .06 or line["bbox"][1] > page.rect.height * .89
                reason = None
                if text in repeatedEdges and isEdge:
                    reason = "running-header-or-footer"
                elif text.isdigit() and line["bbox"][1] > page.rect.height * .9:
                    reason = "page-number"
                elif (line["bbox"][1] > page.rect.height * .9 and
                      ("mp4directs" in text or "Goldenagato" in text or text == "|")):
                    reason = "publisher-watermark"
                if reason:
                    removedLines.append({"text": text, "reason": reason, "bbox": line["bbox"]})
                    continue
                if re.fullmatch(r"(?:Parte\s+)?\d{1,2}", text):
                    line.update(kind="heading", number=int(text.split()[-1]))
                elif re.fullmatch(r"(?:\*\s*){3,}|(?:[◆◇✦※]\s*)+", text):
                    line["kind"] = "sceneBreak"
                keptLines.append(line)
            pageInfo = {"page": pageNumber, "width": page.rect.width, "height": page.rect.height,
                        "rawCharacters": len(rawText), "lines": keptLines, "removedLines": removedLines}
            pages.append(pageInfo)
            for index, line in enumerate(keptLines):
                text = lineText(line)
                match = re.fullmatch(r"CAP[IÍ]TULO\s+(\d+)|PR[ÓO]LOGO|EP[ÍI]LOGO|NOTA DEL TRADUCTOR|PALABRAS DEL AUTOR:", text, re.I)
                if not match:
                    continue
                chapterNumber = int(match[1]) if match[1] else None
                slug = f"capitulo-{chapterNumber:02}" if chapterNumber else (
                    "prologo" if text.upper().startswith("PR") else
                    "palabras-del-traductor" if text.upper().startswith("NOTA") else "posfacio")
                label = f"Capítulo {chapterNumber}" if chapterNumber else (
                    "Prólogo" if slug == "prologo" else
                    "Palabras del traductor" if slug == "palabras-del-traductor" else "Posfacio")
                number = chapterNumber if chapterNumber else (0 if slug == "prologo" else 102 if slug == "palabras-del-traductor" else 100)
                line.update(kind="omit", reason="section-title")
                titleLines = []
                if chapterNumber or slug == "prologo":
                    for candidate in keptLines[index + 1:]:
                        candidateText = lineText(candidate)
                        if candidate["kind"] != "text" or not candidateText.isupper():
                            break
                        titleLines.append(candidateText)
                        candidate.update(kind="omit", reason="section-title")
                groups.append({"slug": slug, "title": label + (": " + " ".join(titleLines).capitalize() if titleLines else ""),
                               "number": number, "startPage": pageNumber})
            for imageInfo in page.get_image_info(xrefs=True):
                width, height = imageInfo["width"], imageInfo["height"]
                bbox = [round(value, 2) for value in imageInfo["bbox"]]
                isDecoration = min(width, height) < 100 or bbox[1] > page.rect.height * .88
                image = {"page": pageNumber, "xref": imageInfo["xref"], "bbox": bbox,
                         "width": width, "height": height,
                         "action": "skip" if isDecoration else "extract"}
                if isDecoration:
                    image["reason"] = "small-decoration-or-footer; review for raster subsection numbers"
                else:
                    imageNumber += 1
                    image["target"] = f"re-zero/v{volumeNumber:02}/" + ("portada.webp" if imageNumber == 1 else f"insert{imageNumber - 1}.webp")
                    image["alt"] = "Portada" if imageNumber == 1 else "Ilustración"
                images.append(image)
            # Superscript markers and matching small bottom-of-page definitions are
            # proposed as notes, never silently discarded if they cannot be linked.
            bodySize = Counter(span["size"] for line in keptLines for span in line["spans"]
                               for _ in span["text"]).most_common(1)
            if bodySize:
                bodySize = bodySize[0][0]
                markers = [(line, span) for line in keptLines for span in line["spans"]
                           if span["flags"] & 1 and re.fullmatch(r"\[?\d+\]?", span["text"].strip())]
                for markerLine, markerSpan in markers:
                    noteId = markerSpan["text"].strip(" []")
                    candidates = [line for line in keptLines if line["bbox"][1] > page.rect.height * .65
                                  and max(span["size"] for span in line["spans"]) < bodySize * .85]
                    firstIndex = next((index for index, line in enumerate(candidates)
                                       if re.match(rf"^{re.escape(noteId)}[.)\s]", lineText(line))), None)
                    if firstIndex is None:
                        warnings.append(f"Unresolved superscript on page {pageNumber}: {noteId}")
                        continue
                    definitionLines = []
                    for candidate in candidates[firstIndex:]:
                        if definitionLines and re.match(r"^\d+[.)\s]", lineText(candidate)):
                            break
                        definitionLines.append(candidate)
                        candidate.update(kind="omit", reason="footnote-definition")
                    uniqueId = f"p{pageNumber}-{noteId}"
                    markerSpan["noteId"] = uniqueId
                    definition = re.sub(rf"^{re.escape(noteId)}[.)\s]+", "", " ".join(lineText(line) for line in definitionLines))
                    notes.append({"id": uniqueId, "page": pageNumber, "text": definition})
        if groups:
            if groups[0]["startPage"] > 1:
                groups.insert(0, {"slug": "ilustraciones", "title": "Ilustraciones", "number": -2, "startPage": 1})
            for index, group in enumerate(groups):
                group["endPage"] = groups[index + 1]["startPage"] - 1 if index + 1 < len(groups) else len(document)
        else:
            groups = [{"slug": "contenido", "title": "Contenido (revisar títulos rasterizados)",
                       "number": 1, "startPage": 1, "endPage": len(document)}]
            warnings.append("No text section titles found; transcribe raster titles and edit groups")
        if workMetadata:
            work = {key: json.loads(value.strip()) for key, value in
                    (line.split(":", 1) for line in workMetadata.read_text().splitlines() if line and not line.startswith("#"))}
        else:
            work = {"title": "Re:Zero − Empezar de cero en un mundo diferente", "author": "Tappei Nagatsuki",
                    "description": f"Novela ligera de Re:Zero en español, traducida por {project}, con ilustraciones de Shinichirō Ōtsuka.",
                    "label": "Novela ligera", "cover": f"re-zero/v{volumeNumber:02}/portada.webp"}
        recipe = {"version": 1, "reviewed": False, "pdf": str(pdfPath.resolve()),
                  "sha256": hashlib.sha256(pdfPath.read_bytes()).hexdigest(),
                  "source": {"project": project, "catalogue": "https://sites.google.com/view/la-biblioteca-de-echidna/novela-ligera",
                             "language": "es", "edition": "LN", "volume": volumeNumber, "downloadedAt": downloadedAt},
                  "workSlug": "re-zero", "volumeSlug": f"volumen-{volumeNumber:02}",
                  "work": work, "volume": {"title": f"Volumen {volumeNumber}", "number": volumeNumber},
                  "groups": groups, "ignoredPages": [], "images": images, "notes": notes, "pages": pages,
                  "warnings": warnings, "knownImperfections": [], "paragraphOverrides": [],
                  "pdfCharacters": sourceCharacters, "pdfNonWhitespaceCharacters": sourceNonWhitespace}
        recipePath.parent.mkdir(parents=True, exist_ok=True)
        writeJson(recipePath, recipe)
        print(json.dumps({"recipe": str(recipePath), "pages": len(pages), "sections": len(groups), "warnings": warnings}, ensure_ascii=False))


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


def plainText(value):
    return normalizeText("".join(node["c"] if node.get("t") == "Str" else " "
                                 if node.get("t") in ("Space", "SoftBreak", "LineBreak") else ""
                                 for node in nodes(value)))


def textInlines(text):
    return [{"t": "Space"} if part.isspace() else {"t": "Str", "c": part}
            for part in re.findall(r"\s+|\S+", text)]


def makeInlines(runs, noteMap, noteCounts):
    inlines = []
    for run in runs:
        if "noteId" in run:
            noteId = run["noteId"]
            noteCounts[noteId] += 1
            inlines.append({"t": "Note", "c": [{"t": "Para", "c": textInlines(noteMap[noteId])}]})
            continue
        text = re.sub(r"\s+", " ", run["text"])
        # Keep spaces outside emphasis and do not emphasize punctuation-only runs.
        leadingSpace, trailingSpace = text.startswith(" "), text.endswith(" ")
        if leadingSpace:
            inlines.append({"t": "Space"})
        bodyText = text.strip()
        styled = run.get("italic") or run.get("bold")
        prefix, suffix = "", ""
        if styled and any(character.isalnum() for character in bodyText):
            # A delimiter inserted between a word and its following comma/period
            # cannot open CommonMark emphasis. Keep boundary punctuation outside.
            prefix = re.match(r"^[^\w]*", bodyText)[0]
            bodyText = bodyText[len(prefix):]
            suffix = re.search(r"[^\w]*$", bodyText)[0]
            if suffix:
                bodyText = bodyText[:-len(suffix)]
        inlines.extend(textInlines(prefix))
        body = textInlines(bodyText)
        if any(character.isalnum() for character in bodyText):
            if run.get("italic"):
                body = [{"t": "Emph", "c": body}]
            if run.get("bold"):
                body = [{"t": "Strong", "c": body}]
        inlines.extend(body)
        inlines.extend(textInlines(suffix))
        if trailingSpace:
            inlines.append({"t": "Space"})
    # Adjacent PDF spans may each contribute a space.
    result = []
    for inline in inlines:
        if inline["t"] == "Space" and (not result or result[-1]["t"] == "Space"):
            continue
        result.append(inline)
    if result and result[-1]["t"] == "Space":
        result.pop()
    return result


def addRun(runs, run):
    if runs and run.get("text", "").isspace() and "noteId" not in runs[-1]:
        run = {**run, "italic": runs[-1].get("italic"), "bold": runs[-1].get("bold")}
    if (runs and "noteId" not in run and "noteId" not in runs[-1]
            and runs[-1].get("italic") == run.get("italic") and runs[-1].get("bold") == run.get("bold")):
        runs[-1]["text"] += run["text"]
    else:
        runs.append(run)


def lineRuns(line):
    runs = []
    previousSpan = None
    for span in line["spans"]:
        if previousSpan and span["bbox"][0] - previousSpan["bbox"][2] > span["size"] * .25:
            addRun(runs, {"text": " "})
        if "noteId" in span:
            runs.append({"noteId": span["noteId"]})
        else:
            font = span["font"].lower()
            addRun(runs, {"text": span["text"], "italic": bool(span["flags"] & 2 or "italic" in font or "oblique" in font),
                          "bold": bool(span["flags"] & 16 or "bold" in font)})
        previousSpan = span
    return runs


def isNewParagraph(previous, line, layout, newPage):
    if "newParagraph" in line:
        return line["newParagraph"]
    previousText, text = lineText(previous), lineText(line)
    left, right, spacing = layout
    endsSentence = bool(re.search(r'[.!?…]["»”\')\]]*$', previousText))
    startsSentence = text[:1].isupper() or text.startswith(('"', '“', '«', '—'))
    isIndented = line["bbox"][0] > left + 9 and line["bbox"][0] < left + 40
    # A PDF can switch margins partway through a page. Full-width successive
    # lines at the same offset are continuations, not repeated first-line indents.
    if (abs(line["bbox"][0] - previous["bbox"][0]) < 2
            and previous["bbox"][2] > right - 15 and not endsSentence):
        isIndented = False
    if newPage:
        return isIndented or (endsSentence and startsSentence)
    gap = line["bbox"][1] - previous["bbox"][1]
    danglingWord = re.search(r"\b(?:el|la|los|las|un|una|de|del|y|o|que|su|sus|a|en|por|para|con)$", previousText, re.I)
    if danglingWord and not text.startswith(('"', '“', '«', '—')) and gap < spacing * 2.2:
        return False
    return (gap > spacing * 1.22 or isIndented or
            (previous["bbox"][2] < right - 45 and endsSentence and startsSentence))


def chapterBlocks(group, recipe, imageMap, noteCounts):
    blocks, runs = [], []
    noteMap = {note["id"]: note["text"] for note in recipe["notes"]}
    previous = None
    previousPage = None
    dehyphenated = 0
    def flushParagraph():
        if runs:
            blocks.append({"t": "Para", "c": makeInlines(runs, noteMap, noteCounts)})
            runs.clear()
    for pageNumber in range(group["startPage"], group["endPage"] + 1):
        page = recipe["pages"][pageNumber - 1]
        textLines = [line for line in page["lines"] if line["kind"] == "text"]
        left = min((line["bbox"][0] for line in textLines), default=0)
        right = max((line["bbox"][2] for line in textLines), default=page["width"])
        distances = [b["bbox"][1] - a["bbox"][1] for a, b in zip(textLines, textLines[1:])
                     if 5 < b["bbox"][1] - a["bbox"][1] < 35]
        spacing = statistics.median(distances) if distances else 20
        # Use the tight line spacing rather than the wider paragraph spacing.
        if distances:
            spacing = min(spacing, sorted(distances)[len(distances) // 4])
        events = [(line["bbox"][1], "line", line) for line in page["lines"] if line["kind"] != "omit"]
        events.extend((image["bbox"][1], "image", image) for image in recipe["images"]
                      if image["page"] == pageNumber and image["action"] != "skip")
        for _, kind, item in sorted(events, key=lambda event: event[0]):
            if kind == "image":
                flushParagraph()
                if item["action"] == "heading":
                    blocks.append({"t": "Header", "c": [2, ["", [], []], textInlines(str(item["number"]))]})
                elif item["action"] == "sceneBreak":
                    blocks.append({"t": "HorizontalRule"})
                else:
                    target = imageMap[item["target"]]
                    blocks.append({"t": "Para", "c": [{"t": "Image", "c": [["", [], []],
                                   textInlines(item.get("alt", "Ilustración")), [target, ""]]}]})
                previous = None
            elif item["kind"] != "text":
                flushParagraph()
                blocks.append({"t": "Header", "c": [2, ["", [], []], textInlines(str(item["number"]))]}
                              if item["kind"] == "heading" else {"t": "HorizontalRule"})
                previous = None
            else:
                if previous and isNewParagraph(previous, item, (left, right, spacing), pageNumber != previousPage):
                    flushParagraph()
                elif runs:
                    currentText = lineText(item)
                    # Only a word-ending hyphen followed by a lowercase continuation
                    # is dehyphenated; dialogue dashes and whole compound words stay.
                    if ("text" in runs[-1] and re.search(r"\w-$", runs[-1]["text"].rstrip())
                            and currentText[:1].islower()):
                        runs[-1]["text"] = runs[-1]["text"].rstrip()[:-1]
                        dehyphenated += 1
                    else:
                        addRun(runs, {"text": " "})
                for run in lineRuns(item):
                    addRun(runs, run)
                previous, previousPage = item, pageNumber
    flushParagraph()
    return blocks, dehyphenated


def validateRecipe(recipe, document):
    if not recipe.get("reviewed") or recipe.get("warnings"):
        raise ValueError("Review the recipe, resolve warnings, and set reviewed to true")
    if len(recipe["pages"]) != len(document) or [page["page"] for page in recipe["pages"]] != list(range(1, len(document) + 1)):
        raise ValueError("Recipe page inventory does not match PDF")
    recoveredDashes = sum(span.get("recoveredDashes", 0) for page in recipe["pages"]
                          for line in page["lines"] for span in line["spans"])
    accountedCharacters = sum(len(re.sub(r"\s", "", lineText(line)))
                              for page in recipe["pages"] for line in page["lines"])
    accountedCharacters += sum(len(re.sub(r"\s", "", line["text"]))
                               for page in recipe["pages"] for line in page["removedLines"])
    if accountedCharacters != recipe["pdfNonWhitespaceCharacters"] + recoveredDashes:
        raise ValueError("Recipe lost or changed source text; all characters must remain accounted for")
    groups = recipe["groups"]
    if not groups:
        raise ValueError("Recipe has no sections")
    slugs = [recipe["workSlug"], recipe["volumeSlug"], *[group["slug"] for group in groups]]
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) for slug in slugs):
        raise ValueError("Unsafe content slug")
    if len({group["slug"] for group in groups}) != len(groups) or len({group["number"] for group in groups}) != len(groups):
        raise ValueError("Duplicate section slug or number")
    assignedPages = [page for group in groups for page in range(group["startPage"], group["endPage"] + 1)]
    ignoredPages = [item["page"] for item in recipe["ignoredPages"]]
    if Counter(assignedPages + ignoredPages) != Counter(range(1, len(document) + 1)):
        raise ValueError("Every PDF page must be assigned or explicitly ignored exactly once")
    if assignedPages != sorted(assignedPages):
        raise ValueError("Recipe changes PDF reading order")
    destinations = []
    for image in recipe["images"]:
        if image["action"] not in ("skip", "extract", "render", "heading", "sceneBreak"):
            raise ValueError("Unknown image action")
        if image["page"] not in assignedPages and image["action"] != "skip":
            raise ValueError("Unassigned image")
        if image["action"] in ("extract", "render"):
            target = Path(image["target"])
            if target.is_absolute() or ".." in target.parts or "\\" in str(target) or target.suffix != ".webp":
                raise ValueError("Unsafe image destination")
            destinations.append(str(target))
    if len(destinations) != len(set(destinations)):
        raise ValueError("Duplicate image destination; use unique names for placements")
    if len({note["id"] for note in recipe["notes"]}) != len(recipe["notes"]):
        raise ValueError("Duplicate note id")
    return groups


def importPdf(pdfPath, recipePath, outputPath):
    checkDestination(outputPath)
    recipe = json.loads(recipePath.read_text())
    if hashlib.sha256(pdfPath.read_bytes()).hexdigest() != recipe["sha256"]:
        raise ValueError("PDF hash differs from the reviewed extraction")
    with pymupdf.open(pdfPath) as document:
        groups = validateRecipe(recipe, document)
        outputPath.parent.mkdir(parents=True, exist_ok=True)
        # Failed conversions leave no partial staging directory. The final rename
        # occurs only after image, AST round-trip, note and page coverage checks.
        with tempfile.TemporaryDirectory(prefix=".pdf-import-", dir=outputPath.parent) as temporary:
            stagingPath = Path(temporary) / "staging"
            stagingPath.mkdir()
            imageManifest, imageMap = {}, {}
            for image in recipe["images"]:
                if image["action"] not in ("extract", "render"):
                    continue
                originalPath = Path(temporary) / "image.png"
                if image["action"] == "render" or not image["xref"]:
                    page = document[image["page"] - 1]
                    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=pymupdf.Rect(image["bbox"]), alpha=False)
                else:
                    pixmap = pymupdf.Pixmap(document, image["xref"])
                    extracted = document.extract_image(image["xref"])
                    if extracted.get("smask"):
                        if pixmap.alpha:
                            pixmap = pymupdf.Pixmap(pixmap, 0)
                        pixmap = pymupdf.Pixmap(pixmap, pymupdf.Pixmap(document, extracted["smask"]))
                    if pixmap.colorspace and pixmap.colorspace.n not in (1, 3):
                        pixmap = pymupdf.Pixmap(pymupdf.csRGB, pixmap)
                pixmap.save(originalPath)
                imagePath = stagingPath / "images" / image["target"]
                imagePath.parent.mkdir(parents=True, exist_ok=True)
                runCommand(["cwebp", "-quiet", "-q", "90", "-m", "6", "-metadata", "none", str(originalPath), "-o", str(imagePath)])
                imageManifest[image["target"]] = webpSize(imagePath.read_bytes())
                imageMap[image["target"]] = image["target"]
            apiVersion = json.loads(runCommand(["pandoc", "--sandbox", "-f", "markdown", "-t", "json"], ""))["pandoc-api-version"]
            noteCounts, report = Counter(), []
            for group in groups:
                beforeNotes = sum(noteCounts.values())
                blocks, dehyphenated = chapterBlocks(group, recipe, imageMap, noteCounts)
                ast = {"pandoc-api-version": apiVersion, "meta": {}, "blocks": blocks}
                markdown = runCommand(["pandoc", "--sandbox", "-f", "json", "-t", "gfm-raw_html", "--wrap=none"], json.dumps(ast))
                markdown = re.sub(r"(?m)^-{3,}$", "***", markdown)
                markdown = re.sub(r"(?<!\\)~", r"\\~", markdown)
                roundTrip = json.loads(runCommand(["pandoc", "--sandbox", "-f", "gfm", "-t", "json"], markdown))
                if plainText(blocks) != plainText(roundTrip["blocks"]):
                    raise ValueError(f"Text changed during Markdown round-trip: {group['slug']}")
                before, after = Counter(node.get("t") for node in nodes(blocks)), Counter(node.get("t") for node in nodes(roundTrip["blocks"]))
                for kind in ("Image", "Emph", "Strong", "Note", "Header", "HorizontalRule"):
                    if before[kind] != after[kind]:
                        raise ValueError(f"Lost {kind} in {group['slug']}")
                chapterPath = stagingPath / "novela" / recipe["workSlug"] / recipe["volumeSlug"] / (group["slug"] + ".md")
                chapterPath.parent.mkdir(parents=True, exist_ok=True)
                chapterPath.write_text(f"---\ntitle: {json.dumps(group['title'], ensure_ascii=False)}\nnumber: {group['number']}\n---\n\n{markdown}")
                report.append({"slug": group["slug"], "title": group["title"], "number": group["number"],
                               "pages": [group["startPage"], group["endPage"]], "characters": len(plainText(blocks)),
                               "nonWhitespaceCharacters": len(re.sub(r"\s", "", plainText(blocks))),
                               "images": before["Image"], "notes": sum(noteCounts.values()) - beforeNotes,
                               "italics": before["Emph"], "subsections": before["Header"], "dehyphenated": dehyphenated,
                               "recoveredDashes": sum(span.get("recoveredDashes", 0)
                                                      for page in recipe["pages"][group["startPage"] - 1:group["endPage"]]
                                                      for line in page["lines"] if line["kind"] == "text"
                                                      for span in line["spans"])})
            if set(noteCounts) != {note["id"] for note in recipe["notes"]} or any(count != 1 for count in noteCounts.values()):
                raise ValueError("Missing or repeated translator notes")
            workPath = stagingPath / "novela" / recipe["workSlug"]
            writeYaml(workPath / "work.yaml", recipe["work"])
            writeYaml(workPath / recipe["volumeSlug"] / "volume.yaml", recipe["volume"])
            writeJson(stagingPath / "images.json", dict(sorted(imageManifest.items())))
            skippedImages = {}
            for image in recipe["images"]:
                if image["action"] == "skip":
                    key = (image["xref"], image["reason"])
                    skipped = skippedImages.setdefault(key, {"xref": image["xref"], "width": image["width"],
                                                            "height": image["height"], "reason": image["reason"], "pages": []})
                    skipped["pages"].append(image["page"])
            removedLines = [{"page": page["page"], **line} for page in recipe["pages"] for line in page["removedLines"]]
            omittedLines = [{"page": page["page"], "text": lineText(line), "reason": line.get("reason", "reviewed-omission")}
                            for page in recipe["pages"] for line in page["lines"] if line["kind"] == "omit"]
            writeJson(stagingPath / "import-report.json", {
                "source": recipe["source"], "sha256": recipe["sha256"],
                "recipeSha256": hashlib.sha256(recipePath.read_bytes()).hexdigest(),
                "sections": report, "images": len(imageMap), "notes": sum(noteCounts.values()),
                "pdfCharacters": recipe["pdfCharacters"], "pdfNonWhitespaceCharacters": recipe["pdfNonWhitespaceCharacters"],
                "extractedCharacters": sum(section["characters"] for section in report),
                "extractedNonWhitespaceCharacters": sum(section["nonWhitespaceCharacters"] for section in report),
                "pageCoverage": {"total": len(document), "assigned": sum(group["endPage"] - group["startPage"] + 1 for group in groups),
                                 "ignored": recipe["ignoredPages"]},
                "skippedImages": list(skippedImages.values()), "removedLines": removedLines, "omittedLines": omittedLines,
                "knownImperfections": recipe.get("knownImperfections", []),
                "paragraphOverrides": recipe.get("paragraphOverrides", []),
                "textCoverage": {"sourceNonWhitespaceCharacters": recipe["pdfNonWhitespaceCharacters"],
                                 "accountedOriginalCharacters": recipe["pdfNonWhitespaceCharacters"],
                                 "recoveredDrawnDashes": sum(section["recoveredDashes"] for section in report)},
                "validation": "All sections passed pandoc GFM round-trip text, images, italics, notes and headings checks"})
            checkDestination(outputPath)
            stagingPath.rename(outputPath)
    print(json.dumps({"staging": str(outputPath), "sections": len(report), "images": len(imageMap), "notes": sum(noteCounts.values())}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    extraction = commands.add_parser("extract", help="Write a new reviewable recipe")
    extraction.add_argument("pdf", type=Path)
    extraction.add_argument("recipe", type=Path)
    extraction.add_argument("--volume", type=int, required=True)
    extraction.add_argument("--project", required=True)
    extraction.add_argument("--downloaded-at", dest="downloadedAt", default="2026-10-14")
    extraction.add_argument("--work-metadata", dest="workMetadata", type=Path, help="Optional JSON-compatible work.yaml to copy")
    conversion = commands.add_parser("convert", help="Convert a reviewed recipe into new staging")
    conversion.add_argument("pdf", type=Path)
    conversion.add_argument("recipe", type=Path)
    conversion.add_argument("output", type=Path)
    options = parser.parse_args()
    if options.command == "extract":
        extractPdf(options.pdf, options.recipe, options.volume, options.project, options.downloadedAt, options.workMetadata)
    else:
        importPdf(options.pdf, options.recipe, options.output)
