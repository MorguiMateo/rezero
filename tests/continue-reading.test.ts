import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContinueReading, LatestReading } from "../src/components/continue-reading.tsx";
import { ResumeToastSkeleton } from "../src/components/resume-toast.tsx";

test("prerendered reading actions show skeletons without consulting browser storage", () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let storageReads = 0;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      storageReads++;
      throw new Error("Browser storage is unavailable during prerendering");
    },
  });

  try {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(LatestReading, { works: [{ slug: "re-zero", title: "Re:Zero" }] }),
      createElement(ContinueReading, { work: "re-zero" }),
      createElement(ResumeToastSkeleton),
    ));

    assert.equal(storageReads, 0);
    assert.equal((html.match(/aria-label="Cargando progreso de lectura"/g) ?? []).length, 3);
    assert.doesNotMatch(html, /<(?:a|button)\b/);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
