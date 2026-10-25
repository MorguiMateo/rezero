import { useSyncExternalStore } from "react";

// Reading progress lives only in this browser's localStorage, next to the theme
// (see AGENTS.md). It is read after hydration, so prerendered HTML never depends on it.
const storageKey = "reading-progress";

export type ChapterProgress = {
  // Index of the first visible block (paragraph, image…) among the chapter's top-level elements.
  block: number;
  // Whole percent of the chapter read, 0–100.
  percent: number;
  done: boolean;
  at: number;
};

export type LastRead = {
  volume: string;
  chapter: string;
  title: string;
  percent: number;
  at: number;
};

export type ReadingProgress = {
  v: 1;
  // Keyed by "work/volume/chapter".
  chapters: Record<string, ChapterProgress>;
  // Keyed by work slug.
  last: Record<string, LastRead>;
};

export type ChapterRef = {
  work: string;
  volume: string;
  chapter: string;
  title: string;
};

export type NextChapterRef = { volume: string; chapter: string; title: string };

// Below this, a chapter counts as just opened: no percent shown and no offer to resume.
export const minShownPercent = 3;

const emptyProgress: ReadingProgress = { v: 1, chapters: {}, last: {} };

export function chapterKey(work: string, volume: string, chapter: string) {
  return `${work}/${volume}/${chapter}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isChapterProgress(value: unknown): value is ChapterProgress {
  return (
    isRecord(value) &&
    isCount(value.block) &&
    isCount(value.percent) &&
    value.percent <= 100 &&
    typeof value.done === "boolean" &&
    isCount(value.at)
  );
}

function isLastRead(value: unknown): value is LastRead {
  return (
    isRecord(value) &&
    typeof value.volume === "string" &&
    typeof value.chapter === "string" &&
    typeof value.title === "string" &&
    isCount(value.percent) &&
    value.percent <= 100 &&
    isCount(value.at)
  );
}

// Anything malformed is dropped entry by entry; a corrupt value never breaks a page.
function parseProgress(raw: string | null): ReadingProgress {
  if (!raw) return emptyProgress;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyProgress;
  }
  if (!isRecord(value) || value.v !== 1 || !isRecord(value.chapters) || !isRecord(value.last)) return emptyProgress;
  return {
    v: 1,
    chapters: Object.fromEntries(Object.entries(value.chapters).filter(([, entry]) => isChapterProgress(entry))),
    last: Object.fromEntries(Object.entries(value.last).filter(([, entry]) => isLastRead(entry))),
  } as ReadingProgress;
}

let cache: ReadingProgress | undefined;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

export function readProgress(): ReadingProgress {
  try {
    const raw = localStorage.getItem(storageKey);
    // Imperative readers may have no storage-event subscribers. Check storage
    // on every read, but keep the snapshot stable while its raw value is unchanged.
    if (!cache || raw !== cachedRaw) {
      cache = parseProgress(raw);
      cachedRaw = raw;
    }
  } catch {
    // Preserve this visit's in-memory progress while storage is unavailable.
  }
  return (cache ??= emptyProgress);
}

function writeProgress(next: ReadingProgress) {
  cache = next;
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(storageKey, raw);
    cachedRaw = raw;
  } catch {
    // Keep the snapshot and its previous raw value: an unchanged persisted value
    // must not replace in-memory progress after a failed write.
  }
  listeners.forEach((listener) => listener());
}

export function recordChapterVisit({ work, volume, chapter, title }: ChapterRef) {
  const progress = readProgress();
  const saved = progress.chapters[chapterKey(work, volume, chapter)];
  writeProgress({
    ...progress,
    last: { ...progress.last, [work]: { volume, chapter, title, percent: saved?.percent ?? 0, at: Date.now() } },
  });
}

// Once a chapter is finished, "Continue reading" points at the next one.
export function saveChapterProgress(
  ref: ChapterRef,
  position: { block: number; percent: number; done: boolean },
  next: NextChapterRef | null,
) {
  const progress = readProgress();
  const key = chapterKey(ref.work, ref.volume, ref.chapter);
  const done = position.done || (progress.chapters[key]?.done ?? false);
  const at = Date.now();
  const last =
    position.done && next
      ? { ...next, percent: progress.chapters[chapterKey(ref.work, next.volume, next.chapter)]?.percent ?? 0, at }
      : { volume: ref.volume, chapter: ref.chapter, title: ref.title, percent: position.percent, at };
  writeProgress({
    v: 1,
    chapters: { ...progress.chapters, [key]: { block: position.block, percent: position.percent, done, at } },
    last: { ...progress.last, [ref.work]: last },
  });
}

export function clearWorkProgress(work: string) {
  const progress = readProgress();
  const last = { ...progress.last };
  delete last[work];
  writeProgress({
    v: 1,
    chapters: Object.fromEntries(Object.entries(progress.chapters).filter(([key]) => !key.startsWith(`${work}/`))),
    last,
  });
}

function onStorage(event: StorageEvent) {
  // Refresh from current storage, not the event payload (which may be outdated).
  if (event.key !== null && event.key !== storageKey) return;
  readProgress();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

// null during the build and the hydration render, so prerendered HTML and the
// first client render always match; the saved value appears right after.
export function useReadingProgress(): ReadingProgress | null {
  return useSyncExternalStore(subscribe, readProgress, () => null);
}
