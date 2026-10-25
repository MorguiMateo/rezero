import type { Ref } from "react";
import { Link } from "react-router";

type ChapterDestination = {
  to: string;
  title: string;
};

type ChapterNavigationProps = {
  previous: ChapterDestination | null;
  next: ChapterDestination | null;
  className?: string;
  ref?: Ref<HTMLElement>;
};

function ChapterNavLink({ destination, label }: { destination: ChapterDestination | null; label: string }) {
  // Keep both positions so the next link stays on the right at chapter boundaries.
  if (!destination) return <span />;
  return (
    <Link
      to={destination.to}
      prefetch="intent"
      className="font-ui text-sm text-primary hover:underline underline-offset-4"
    >
      {label}: {destination.title}
    </Link>
  );
}

export function ChapterNavigation({ previous, next, className = "", ref }: ChapterNavigationProps) {
  return (
    <nav
      ref={ref}
      aria-label="Navegación entre capítulos"
      className={`mt-12 flex justify-between gap-4 border-t border-border pt-6 ${className}`.trim()}
    >
      <ChapterNavLink destination={previous} label="Anterior" />
      <ChapterNavLink destination={next} label="Siguiente" />
    </nav>
  );
}
