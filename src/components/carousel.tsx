import { useEffect, useRef, useState, type ReactNode } from "react";

function ArrowButton({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isNext ? "Siguiente" : "Anterior"}
      className={`absolute top-1/2 z-10 hidden h-40 w-10 -translate-y-1/2 flex-col items-center justify-between border border-border bg-surface/85 py-3 text-primary transition hover:border-primary hover:bg-surface sm:flex ${
        isNext ? "right-0" : "left-0"
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rotate-45 border border-current opacity-60" />
      <span aria-hidden="true" className="text-xl leading-none">
        {isNext ? "›" : "‹"}
      </span>
      <span aria-hidden="true" className="size-1.5 rotate-45 border border-current opacity-60" />
    </button>
  );
}

// Horizontal scroll-snap row. It scrolls by touch or trackpad without JavaScript;
// after hydration, arrows appear only when the items overflow.
export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // The observer also fires once right away, which sets the initial state.
    const observer = new ResizeObserver(() => setOverflows(track.scrollWidth > track.clientWidth + 1));
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {overflows && <ArrowButton direction="previous" onClick={() => scrollByPage(-1)} />}
      <ul
        ref={trackRef}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pt-2 pb-6 [scrollbar-width:none] sm:justify-center-safe sm:gap-8 sm:px-16"
      >
        {children}
      </ul>
      {overflows && <ArrowButton direction="next" onClick={() => scrollByPage(1)} />}
    </div>
  );
}
