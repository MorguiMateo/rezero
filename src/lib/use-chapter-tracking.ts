import { type RefObject, useEffect, useRef, useState } from "react";
import {
  type ChapterProgress,
  type ChapterRef,
  type NextChapterRef,
  chapterKey,
  minShownPercent,
  readProgress,
  recordChapterVisit,
  saveChapterProgress,
} from "./reading-progress";

// Roughly the reader bar's height: a block hidden under it does not count as visible.
const topInset = 64;
const saveDelay = 600;

type Position = { block: number; percent: number; done: boolean };

// Binary search: the chapter's top-level blocks are laid out top to bottom.
function firstVisibleBlock(article: HTMLElement) {
  const blocks = article.children;
  let low = 0;
  let high = blocks.length - 1;
  let found = Math.max(high, 0);
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (blocks[middle].getBoundingClientRect().bottom > topInset) {
      found = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return found;
}

function measure(article: HTMLElement): Position {
  const rect = article.getBoundingClientRect();
  const viewport = window.innerHeight;
  // Seeing the end of the text (notes included) finishes the chapter.
  const done = rect.bottom <= viewport + 1;
  const read = rect.height > 0 ? (viewport - rect.top) / rect.height : 0;
  const percent = done ? 100 : Math.min(99, Math.max(0, Math.round(read * 100)));
  return { block: firstVisibleBlock(article), percent, done };
}

// Saves where the reader is in a chapter and offers to jump back to a saved spot.
// The caller must remount it per chapter (key), so state never leaks between chapters.
export function useChapterTracking(
  articleRef: RefObject<HTMLElement | null>,
  { work, volume, chapter, title }: ChapterRef,
  next: NextChapterRef | null,
) {
  const [resume, setResume] = useState<ChapterProgress | null>(null);
  // While a saved spot is on offer, saving pauses so a quick look at the top
  // does not overwrite it; it ends when the reader resumes, dismisses or scrolls past it.
  const offeredRef = useRef<ChapterProgress | null>(null);
  const nextVolume = next?.volume;
  const nextChapter = next?.chapter;
  const nextTitle = next?.title;

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const ref = { work, volume, chapter, title };
    const nextRef =
      nextVolume && nextChapter && nextTitle ? { volume: nextVolume, chapter: nextChapter, title: nextTitle } : null;
    const saved = readProgress().chapters[chapterKey(work, volume, chapter)];
    recordChapterVisit(ref);

    let latest: Position | null = null;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    function save() {
      clearTimeout(timer);
      if (!dirty || !latest || offeredRef.current) return;
      dirty = false;
      saveChapterProgress(ref, latest, nextRef);
    }

    function update() {
      frame = 0;
      latest = measure(article!);
      const offered = offeredRef.current;
      if (offered) {
        if (latest.block < offered.block) return;
        offeredRef.current = null;
        setResume(null);
      }
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(save, saveDelay);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function onHide() {
      if (document.visibilityState === "hidden") save();
    }

    // After the first frame, ScrollRestoration has already put back any position
    // from a reload or back/forward, so a page still at the top is a fresh visit.
    const startFrame = requestAnimationFrame(() => {
      const position = measure(article);
      if (position.done) {
        // Short pages that fit on screen are read as soon as they open.
        latest = position;
        dirty = true;
        save();
      } else if (saved && !saved.done && saved.percent > minShownPercent && window.scrollY < 100) {
        offeredRef.current = saved;
        setResume(saved);
      }
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelAnimationFrame(startFrame);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onHide);
      // Leaving through a client-side link: keep the last measured spot.
      save();
    };
  }, [articleRef, work, volume, chapter, title, nextVolume, nextChapter, nextTitle]);

  function resumeReading() {
    const offered = offeredRef.current;
    offeredRef.current = null;
    setResume(null);
    if (offered) articleRef.current?.children[offered.block]?.scrollIntoView({ block: "start" });
  }

  function dismissResume() {
    offeredRef.current = null;
    setResume(null);
  }

  return { resume, resumeReading, dismissResume };
}
