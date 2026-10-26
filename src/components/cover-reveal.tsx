import { useEffect, useRef, useState, type ReactNode } from "react";

const maximumLoadingDuration = 8_000;

// Keep the prerendered placeholders until every cover can be painted in one frame.
export function CoverReveal({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const images = Array.from(containerRef.current!.querySelectorAll<HTMLImageElement>("[data-book-cover-image]"));
    const settled = new Set<HTMLImageElement>();
    let active = true;

    // A stalled request must not leave the whole library behind skeletons forever.
    const maximumTimer = window.setTimeout(() => {
      for (const image of images) {
        if (!settled.has(image)) image.dataset.coverUnavailable = "";
      }
      if (active) setReady(true);
    }, maximumLoadingDuration);

    void Promise.all(images.map(async (image) => {
      try {
        await image.decode();
      } catch {
        if (active) image.dataset.coverUnavailable = "";
      } finally {
        settled.add(image);
      }
    })).then(() => {
      if (!active) return;
      window.clearTimeout(maximumTimer);
      setReady(true);
    });

    return () => {
      active = false;
      window.clearTimeout(maximumTimer);
    };
  }, []);

  return (
    <div ref={containerRef} className={className} data-cover-reveal={ready ? "ready" : "pending"} aria-busy={!ready}>
      {children}
    </div>
  );
}
