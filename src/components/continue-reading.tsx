import { Button, ButtonLink } from "@/components/button";
import { ReadingProgressSkeleton } from "@/components/reading-progress-skeleton";
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

// The prerendered skeleton never depends on browser storage. A known empty
// snapshot removes it; a saved entry replaces it with the real action.

export function ContinueReading({ work }: { work: string }) {
  const progress = useReadingProgress();
  if (progress === null) return <ReadingProgressSkeleton />;
  const last = progress.last[work];
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
  if (progress === null) return <ReadingProgressSkeleton appearance="outline" shape="pill" />;
  const latest = latestRead(progress, works.map((work) => work.slug));
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
