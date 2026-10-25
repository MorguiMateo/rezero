import copy
import runpy
import unittest
from pathlib import Path


importer = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts" / "import-epub.py"))
moveEdgePunctuation = importer["moveEdgePunctuation"]
normalizeAst = importer["normalizeAst"]


def textNode(text):
    return {"t": "Str", "c": text}


def emphasisNode(text, kind="Emph"):
    return {"t": kind, "c": [textNode(text)]}


class MoveEdgePunctuationTests(unittest.TestCase):
    def testSuffixUnderscores(self):
        for kind in ("Emph", "Strong"):
            for punctuation in ("_", "__", "!_", "_!", "＿_", "――"):
                with self.subTest(kind=kind, punctuation=punctuation):
                    self.assertEqual(
                        moveEdgePunctuation([emphasisNode("text" + punctuation, kind), textNode("next")]),
                        [emphasisNode("text", kind), textNode(punctuation + "next")],
                    )

    def testPrefixUnderscores(self):
        for kind in ("Emph", "Strong"):
            for punctuation in ("_", "__", "!_", "_!", "_＿", "«¿"):
                with self.subTest(kind=kind, punctuation=punctuation):
                    self.assertEqual(
                        moveEdgePunctuation([textNode("before"), emphasisNode(punctuation + "text", kind)]),
                        [textNode("before" + punctuation), emphasisNode("text", kind)],
                    )

    def testUnicodeWordBoundaries(self):
        for word in ("café", "日本語", "١٢٣"):
            with self.subTest(word=word):
                self.assertEqual(
                    moveEdgePunctuation([emphasisNode(word + "_！"), textNode(word)]),
                    [emphasisNode(word), textNode("_！" + word)],
                )
                self.assertEqual(
                    moveEdgePunctuation([textNode(word), emphasisNode("¿_" + word)]),
                    [textNode(word + "¿_"), emphasisNode(word)],
                )

    def testBothEdges(self):
        self.assertEqual(
            moveEdgePunctuation([textNode("before"), emphasisNode("_text_"), textNode("after")]),
            [textNode("before_"), emphasisNode("text"), textNode("_after")],
        )

    def testEmphasizedNeighbors(self):
        self.assertEqual(
            moveEdgePunctuation([emphasisNode("text_"), emphasisNode("next", "Strong")]),
            [emphasisNode("text"), textNode("_"), emphasisNode("next", "Strong")],
        )
        self.assertEqual(
            moveEdgePunctuation([emphasisNode("before", "Strong"), emphasisNode("_text")]),
            [emphasisNode("before", "Strong"), textNode("_"), emphasisNode("text")],
        )

    def testOrdinaryTextIsUnchanged(self):
        for inlines in (
            [emphasisNode("text"), textNode("next")],
            [textNode("before"), emphasisNode("text")],
            [emphasisNode("café"), textNode("日本語")],
            [emphasisNode("text_"), {"t": "Space"}, textNode("next")],
            [textNode("before"), {"t": "Space"}, emphasisNode("_text")],
            [emphasisNode("_text_")],
        ):
            with self.subTest(inlines=inlines):
                self.assertEqual(moveEdgePunctuation(copy.deepcopy(inlines)), inlines)

    def testNormalizeAstRepairsUnderscoreBoundaries(self):
        for inlines, expected in (
            ([emphasisNode("text_"), textNode("next")], [emphasisNode("text"), textNode("_next")]),
            ([textNode("before"), emphasisNode("_text")], [textNode("before_"), emphasisNode("text")]),
        ):
            with self.subTest(inlines=inlines):
                self.assertEqual(
                    normalizeAst({"t": "Para", "c": inlines}, {}, {}),
                    {"t": "Para", "c": expected},
                )


if __name__ == "__main__":
    unittest.main()
