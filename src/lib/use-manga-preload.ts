import { type RefObject, useEffect } from "react";

// The first pages are above the fold: they render eager and with high priority.
export const mangaPriorityPages = 2;
// Pages downloaded at the same time by the background preload.
const concurrentPages = 3;
// Start fetching the next chapter's first pages when the chapter end is this close.
const nextChapterMargin = "0px 0px 200% 0px";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

// Respect the browser's data saver and very slow connections: keep plain lazy loading there.
function shouldSaveData() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
}

// Resolves once the image has loaded or failed, including before hydration.
function settled(image: HTMLImageElement) {
  if (image.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

// Pages are prerendered with loading="lazy", so the browser only fetches them right before
// they scroll into view. After hydration this downloads them in reading order, a few at a
// time, so the whole chapter is ready while the reader is still on the first pages.
// chapterKey changes on client navigation, when the same route renders another chapter.
export function useMangaPagePreload({
  chapterKey,
  pagesRef,
  endRef,
  nextChapterPages,
}: {
  chapterKey: string;
  pagesRef: RefObject<HTMLElement | null>;
  endRef: RefObject<HTMLElement | null>;
  nextChapterPages: string[];
}) {
  useEffect(() => {
    const container = pagesRef.current;
    if (!container || shouldSaveData()) return;
    const images = Array.from(container.querySelectorAll("img"));
    let cancelled = false;
    let nextIndex = mangaPriorityPages;

    async function loadInOrder() {
      while (!cancelled && nextIndex < images.length) {
        const image = images[nextIndex++];
        // Switching a lazy image to eager starts its download right away.
        image.loading = "eager";
        await settled(image);
      }
    }

    // Wait for the priority pages so the preload never competes with them.
    Promise.all(images.slice(0, mangaPriorityPages).map(settled)).then(() => {
      for (let slot = 0; slot < concurrentPages; slot++) void loadInOrder();
    });
    return () => {
      cancelled = true;
    };
  }, [chapterKey, pagesRef]);

  // Warm the cache with the next chapter's first pages so "Siguiente" opens instantly.
  const nextKey = nextChapterPages.join("\n");
  useEffect(() => {
    const end = endRef.current;
    if (!end || !nextKey || shouldSaveData()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        for (const src of nextKey.split("\n")) new Image().src = src;
      },
      { rootMargin: nextChapterMargin },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [endRef, nextKey]);
}
