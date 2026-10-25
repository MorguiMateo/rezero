import { Button, ButtonLink } from "@/components/button";
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
      <ButtonLink
        to={lastReadPath(work, last)}
        prefetch="intent"
      >
        Continuar: {last.title}
        {progressLabel(last)}
      </ButtonLink>
      <Button
        variant="text"
        size="label"
        onClick={() => clearWorkProgress(work)}
      >
        Olvidar progreso
      </Button>
    </div>
  );
}

export function LatestReading({ works }: { works: { slug: string; title: string }[] }) {
  const progress = useReadingProgress();
  const latest = progress && latestRead(progress, works.map((work) => work.slug));
  if (!latest) return null;
  const workTitle = works.find((work) => work.slug === latest.work)?.title;
  return (
    <ButtonLink
      to={lastReadPath(latest.work, latest.last)}
      prefetch="intent"
      variant="outline"
      size="sm"
      shape="pill"
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
    </ButtonLink>
  );
}
