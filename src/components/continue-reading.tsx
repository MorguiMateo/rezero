import { Link } from "react-router";
import { type LastRead, type ReadingProgress, clearWorkProgress, minShownPercent, useReadingProgress } from "@/lib/reading-progress";

function lastReadPath(work: string, last: LastRead) {
  return `/novela/${work}/${last.volume}/${last.chapter}`;
}

function progressLabel(last: LastRead) {
  if (last.percent >= 100) return " · leído";
  return last.percent > minShownPercent ? ` · ${last.percent} %` : "";
}

// The most recently read work among the given slugs.
function latestRead(progress: ReadingProgress, works: string[]) {
  return works
    .flatMap((work) => (progress.last[work] ? [{ work, last: progress.last[work] }] : []))
    .sort((a, b) => b.last.at - a.last.at)[0];
}

// Both render nothing in the prerendered HTML: progress only exists in the browser.
// Callers reserve their height so the page does not shift when they appear.

export function ContinueReading({ work }: { work: string }) {
  const last = useReadingProgress()?.last[work];
  if (!last) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Link
        to={lastReadPath(work, last)}
        prefetch="intent"
        className="rounded-md bg-button px-5 py-2.5 font-ui text-sm text-button-foreground transition-colors hover:bg-button-hover"
      >
        Continuar: {last.title}
        {progressLabel(last)}
      </Link>
      <button
        type="button"
        onClick={() => clearWorkProgress(work)}
        className="cursor-pointer font-ui text-xs text-muted underline-offset-4 hover:text-primary hover:underline"
      >
        Olvidar progreso
      </button>
    </div>
  );
}

export function LatestReading({ works }: { works: { slug: string; title: string }[] }) {
  const progress = useReadingProgress();
  const latest = progress && latestRead(progress, works.map((work) => work.slug));
  if (!latest) return null;
  const workTitle = works.find((work) => work.slug === latest.work)?.title;
  return (
    <Link
      to={lastReadPath(latest.work, latest.last)}
      prefetch="intent"
      className="group flex max-w-full items-center gap-3 rounded-full border border-border bg-surface/80 py-2 pr-5 pl-4 font-ui text-sm text-foreground backdrop-blur-sm transition-colors hover:border-primary"
    >
      <span aria-hidden="true" className="text-primary">
        ✦
      </span>
      <span className="min-w-0 truncate">
        <span className="text-muted">Seguir leyendo · </span>
        {latest.last.title}
        <span className="text-muted">
          {workTitle && ` — ${workTitle}`}
          {progressLabel(latest.last)}
        </span>
      </span>
    </Link>
  );
}
