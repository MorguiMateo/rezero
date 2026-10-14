import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ThemeButton } from "./theme-button";

// Scrolling less than this keeps the bar as it is, so small jitters do not toggle it.
const scrollThreshold = 8;

// Replaces the site header while reading: it slides away when scrolling down and
// comes back when scrolling up. The progress line stays pinned to the top.
export function ReaderBar({ backTo, backLabel, title }: { backTo: string; backLabel: string; title: string }) {
  const [hidden, setHidden] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    function update() {
      frame = 0;
      const y = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // Written straight to the DOM so scrolling never re-renders React.
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${scrollable > 0 ? Math.min(1, y / scrollable) : 1})`;
      }
      if (y < 64) setHidden(false);
      else if (y > lastY + scrollThreshold) setHidden(true);
      else if (y < lastY - scrollThreshold) setHidden(false);
      else return;
      lastY = y;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-30 h-0.5">
        <div ref={progressRef} className="h-full origin-left bg-primary-fill" style={{ transform: "scaleX(0)" }} />
      </div>
      <header
        className={`sticky top-0 z-20 bg-header text-header-foreground transition-transform duration-300 motion-reduce:transition-none ${
          hidden ? "-translate-y-full focus-within:translate-y-0" : ""
        }`}
      >
        <a
          href="#texto-del-capitulo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-30 focus:rounded-md focus:bg-button focus:px-4 focus:py-2 focus:text-button-foreground"
        >
          Saltar al texto
        </a>
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-4 px-4 sm:px-6">
          <Link
            to={backTo}
            prefetch="intent"
            className="shrink-0 font-ui text-sm opacity-75 transition-opacity hover:opacity-100"
          >
            ← <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Índice</span>
          </Link>
          <p className="min-w-0 flex-1 truncate text-center font-display text-lg">{title}</p>
          <ThemeButton />
        </div>
      </header>
    </>
  );
}
