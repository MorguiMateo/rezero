import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

type ProgressModule = typeof import("../src/lib/reading-progress");

const storageKey = "reading-progress";
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
let moduleId = 0;

class TestStorage {
  values = new Map<string, string>();
  blockReads = false;
  blockWrites = false;
  reads = 0;

  getItem(key: string) {
    this.reads += 1;
    if (this.blockReads) throw new Error("Storage access denied");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.blockWrites) throw new Error("Storage quota exceeded");
    this.values.set(key, value);
  }

  clear() {
    this.values.clear();
  }
}

function installStorage() {
  const storage = new TestStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  return storage;
}

async function loadStore(): Promise<ProgressModule> {
  // Each module instance represents a separate tab, without any mounted subscribers.
  const url = new URL("../src/lib/reading-progress.ts", import.meta.url);
  url.searchParams.set("tab", String(moduleId++));
  return import(url.href);
}

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

const firstChapter = { work: "re-zero", volume: "volume-01", chapter: "chapter-01", title: "First" };
const secondChapter = { ...firstChapter, chapter: "chapter-02", title: "Second" };
const otherWork = { ...firstChapter, work: "prequel", title: "Prequel" };
const position = { block: 4, percent: 20, done: false };

test("interleaved writes preserve other tabs' chapters and last-read works without subscribers", async () => {
  const storage = installStorage();
  const firstTab = await loadStore();
  const secondTab = await loadStore();

  firstTab.recordChapterVisit(firstChapter);
  secondTab.saveChapterProgress(secondChapter, { ...position, percent: 60 }, null);
  secondTab.saveChapterProgress(otherWork, position, null);
  firstTab.saveChapterProgress(firstChapter, position, null);

  const saved = JSON.parse(storage.getItem(storageKey)!);
  assert.equal(saved.chapters["re-zero/volume-01/chapter-02"].percent, 60);
  assert.equal(saved.chapters["prequel/volume-01/chapter-01"].percent, 20);
  assert.equal(saved.last.prequel.title, "Prequel");
  assert.equal(saved.last["re-zero"].chapter, "chapter-01");
  assert.deepEqual([...storage.values.keys()], [storageKey]);
});

test("recording a visit uses the latest saved chapter percent", async () => {
  installStorage();
  const firstTab = await loadStore();
  const secondTab = await loadStore();
  firstTab.readProgress();
  secondTab.saveChapterProgress(firstChapter, { ...position, percent: 70 }, null);

  firstTab.recordChapterVisit(firstChapter);

  assert.equal(firstTab.readProgress().last["re-zero"].percent, 70);
  assert.equal(firstTab.readProgress().chapters["re-zero/volume-01/chapter-01"].percent, 70);
});

test("clearing one work preserves another tab's latest unrelated work", async () => {
  installStorage();
  const firstTab = await loadStore();
  const secondTab = await loadStore();
  firstTab.saveChapterProgress(firstChapter, position, null);
  secondTab.saveChapterProgress(otherWork, position, null);

  firstTab.clearWorkProgress("re-zero");

  const progress = secondTab.readProgress();
  assert.deepEqual(Object.keys(progress.chapters), ["prequel/volume-01/chapter-01"]);
  assert.deepEqual(Object.keys(progress.last), ["prequel"]);
});

test("a remote work clear does not resurrect cached chapters or their completed state", async () => {
  installStorage();
  const firstTab = await loadStore();
  const secondTab = await loadStore();
  firstTab.saveChapterProgress(firstChapter, { ...position, percent: 100, done: true }, null);
  firstTab.saveChapterProgress(secondChapter, position, null);
  secondTab.clearWorkProgress("re-zero");

  firstTab.saveChapterProgress(firstChapter, position, null);

  const progress = firstTab.readProgress();
  assert.deepEqual(Object.keys(progress.chapters), ["re-zero/volume-01/chapter-01"]);
  assert.equal(progress.chapters["re-zero/volume-01/chapter-01"].done, false);
});

test("a remote storage clear is observed without subscriptions", async () => {
  const storage = installStorage();
  const tab = await loadStore();
  tab.saveChapterProgress(firstChapter, position, null);
  tab.saveChapterProgress(secondChapter, position, null);
  storage.clear();

  tab.recordChapterVisit(otherWork);

  assert.deepEqual(tab.readProgress().chapters, {});
  assert.deepEqual(Object.keys(tab.readProgress().last), ["prequel"]);
});

test("unchanged storage returns stable snapshots and external changes replace them once", async () => {
  installStorage();
  const firstTab = await loadStore();
  const secondTab = await loadStore();
  const initial = firstTab.readProgress();
  assert.strictEqual(firstTab.readProgress(), initial);

  secondTab.saveChapterProgress(firstChapter, position, null);
  const updated = firstTab.readProgress();
  assert.notStrictEqual(updated, initial);
  assert.strictEqual(firstTab.readProgress(), updated);

  firstTab.saveChapterProgress(secondChapter, position, null);
  const localUpdate = firstTab.readProgress();
  assert.strictEqual(firstTab.readProgress(), localUpdate);
});

test("blocked storage retains in-memory visits, chapter updates and clears", async () => {
  const storage = installStorage();
  storage.blockReads = true;
  storage.blockWrites = true;
  const tab = await loadStore();
  tab.recordChapterVisit(firstChapter);
  tab.saveChapterProgress(firstChapter, position, null);
  tab.saveChapterProgress(otherWork, position, null);
  const saved = tab.readProgress();
  assert.strictEqual(tab.readProgress(), saved);
  assert.equal(saved.chapters["re-zero/volume-01/chapter-01"].percent, 20);

  tab.clearWorkProgress("re-zero");
  assert.deepEqual(Object.keys(tab.readProgress().last), ["prequel"]);
  assert.deepEqual(Object.keys(tab.readProgress().chapters), ["prequel/volume-01/chapter-01"]);

  storage.blockReads = false;
  assert.deepEqual(Object.keys(tab.readProgress().last), ["prequel"]);
});

test("quota failures do not let readable stale storage erase this visit's changes", async () => {
  const storage = installStorage();
  const tab = await loadStore();
  tab.saveChapterProgress(firstChapter, position, null);
  const persisted = storage.getItem(storageKey);
  storage.blockWrites = true;

  tab.saveChapterProgress(secondChapter, position, null);
  const saved = tab.readProgress();
  assert.strictEqual(tab.readProgress(), saved);
  assert.equal(Object.keys(saved.chapters).length, 2);
  tab.clearWorkProgress("re-zero");
  assert.deepEqual(tab.readProgress().chapters, {});
  assert.equal(storage.getItem(storageKey), persisted);

  storage.blockWrites = false;
  tab.saveChapterProgress(otherWork, position, null);
  assert.deepEqual(Object.keys(JSON.parse(storage.getItem(storageKey)!).chapters), ["prequel/volume-01/chapter-01"]);
});

test("prerender and hydration use the null server snapshot without accessing storage", async () => {
  const storage = installStorage();
  const tab = await loadStore();
  function ReadingStatus() {
    const progress = tab.useReadingProgress();
    return createElement("span", null, progress === null ? "loading" : "ready");
  }

  assert.equal(renderToString(createElement(ReadingStatus)), "<span>loading</span>");
  assert.equal(storage.reads, 0);
});
