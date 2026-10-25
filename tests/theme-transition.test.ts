import assert from "node:assert/strict";
import test from "node:test";
import { cloneThemeContent } from "../src/lib/theme-wave.ts";

// Only model the DOM surface used to snapshot images; no layout or fetching is
// simulated here. Browser checks cover the actual request/loading lifecycle.
function imageFixture({
  complete = false,
  naturalWidth = 0,
  currentSrc = "",
  attributes = { src: "/pending.webp", loading: "lazy", decoding: "async" },
}: {
  complete?: boolean;
  naturalWidth?: number;
  currentSrc?: string;
  attributes?: Record<string, string>;
} = {}) {
  const values = new Map(Object.entries(attributes));
  return {
    tagName: "IMG",
    complete,
    naturalWidth,
    currentSrc,
    style: {} as Record<string, string>,
    get src() { return values.get("src") ?? ""; },
    set src(value: string) { values.set("src", value); },
    get loading() { return values.get("loading"); },
    set loading(value: string | undefined) { values.set("loading", value!); },
    get decoding() { return values.get("decoding"); },
    set decoding(value: string | undefined) { values.set("decoding", value!); },
    getAttribute: (name: string) => values.get(name) ?? null,
    removeAttribute: (name: string) => values.delete(name),
    getBoundingClientRect: () => ({ width: 620.5, height: 910.25 }),
    querySelectorAll: () => [],
  };
}

function snapshot(source: object, clone: object) {
  return cloneThemeContent(source as Element, {
    importNode(node: object, deep: boolean) {
      assert.equal(node, source);
      assert.equal(deep, true);
      return clone;
    },
  } as unknown as Document);
}

test("pending, queued and broken images keep their geometry without downloadable sources", () => {
  for (const state of [
    { complete: false, naturalWidth: 0, currentSrc: "/pending.webp" },
    { complete: true, naturalWidth: 0, currentSrc: "" },
    { complete: true, naturalWidth: 0, currentSrc: "/broken.webp" },
    { complete: false, naturalWidth: 1400, currentSrc: "/changing.webp" },
  ]) {
    const original = imageFixture(state);
    const clone = imageFixture({ attributes: {
      src: "/pending.webp", srcset: "/pending-2x.webp 2x", sizes: "100vw",
      loading: "lazy", decoding: "async", width: "1400", height: "2055",
    } });

    assert.equal(snapshot(original, clone), clone);
    for (const attribute of ["src", "srcset", "sizes"]) {
      assert.equal(clone.getAttribute(attribute), null);
    }
    assert.deepEqual(clone.style, {
      boxSizing: "border-box", width: "620.5px", height: "910.25px", visibility: "hidden",
    });
    assert.equal(clone.getAttribute("width"), "1400");
    assert.equal(clone.getAttribute("height"), "2055");
    assert.equal(clone.loading, "lazy");
    assert.equal(clone.decoding, "async");
    assert.equal(original.src, "/pending.webp");
    assert.deepEqual(original.style, {});
  }
});

test("loaded responsive images reuse only the selected resource, never picture or srcset alternatives", () => {
  const original = imageFixture({
    complete: true, naturalWidth: 1400, currentSrc: "https://example.test/selected.webp",
  });
  const clone = imageFixture({ attributes: {
    src: "/fallback.webp", srcset: "/unused-2x.webp 2x", sizes: "100vw",
  } });
  const candidate = imageFixture({ attributes: {
    src: "/unused-source.webp", srcset: "/unused-picture.webp 2x", media: "(min-width: 800px)",
  } });
  const source = { tagName: "PICTURE", querySelectorAll: () => [original] };
  const copy = {
    tagName: "PICTURE",
    querySelectorAll: (selector: string) => selector === "img" ? [clone] : [candidate],
  };

  snapshot(source, copy);

  assert.equal(clone.src, "https://example.test/selected.webp");
  assert.equal(clone.getAttribute("srcset"), null);
  assert.equal(clone.getAttribute("sizes"), null);
  assert.equal(candidate.getAttribute("srcset"), null);
  assert.equal(candidate.getAttribute("src"), null);
  assert.equal(candidate.getAttribute("media"), "(min-width: 800px)");
  assert.equal(clone.loading, "eager");
  assert.equal(clone.decoding, "sync");
  assert.deepEqual(clone.style, {});
  assert.equal(original.loading, "lazy");
});
