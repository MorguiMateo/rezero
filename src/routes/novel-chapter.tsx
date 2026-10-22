import { useRef } from "react";
import { data, Link } from "react-router";
import literataFont from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?url";
import { ReaderBar } from "@/components/reader-bar";
import { ResumeToast } from "@/components/resume-toast";
import { fontPreload } from "@/lib/font-preload";
import { getChapter } from "@/lib/content/novels.server";
import type { ChapterDetail, ChapterLink } from "@/lib/content/types";
import { buildMeta } from "@/lib/seo";
import { useChapterTracking } from "@/lib/use-chapter-tracking";
import { useReaderShortcuts } from "@/lib/use-reader-shortcuts";
import type { Route } from "./+types/novel-chapter";

export async function loader({ params }: Route.LoaderArgs) {
  const chapter = await getChapter(params.work, params.volume, params.chapter);
  if (!chapter) throw data(null, { status: 404 });
  return { chapter };
}

// The chapter body is set in Literata, so it loads with the page instead of swapping in later.
export const links: Route.LinksFunction = () => [fontPreload(literataFont)];

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { chapter } = loaderData;
  return buildMeta({
    title: `${chapter.title} · ${chapter.work.title}`,
    description: `${chapter.work.title}, ${chapter.volume.title}: ${chapter.title}.`,
  });
}

// Chapters open in reading mode: the root layout drops the site header (see root.tsx).
export const handle = { readingMode: true };

function chapterPath(workSlug: string, link: ChapterLink) {
  return `/novela/${workSlug}/${link.volumeSlug}/${link.chapterSlug}`;
}

function ChapterNavLink({ workSlug, link, label }: { workSlug: string; link: ChapterLink | null; label: string }) {
  if (!link) return <span />;
  return (
    <Link
      to={chapterPath(workSlug, link)}
      prefetch="intent"
      className="font-ui text-sm text-primary hover:underline underline-offset-4"
    >
      {label}: {link.title}
    </Link>
  );
}

function ChapterReader({ chapter }: { chapter: ChapterDetail }) {
  const { work, volume } = chapter;
  const volumePath = `/novela/${work.slug}/${volume.slug}`;
  const articleRef = useRef<HTMLElement>(null);
  const { resume, resumeReading, dismissResume } = useChapterTracking(
    articleRef,
    { work: work.slug, volume: volume.slug, chapter: chapter.slug, title: chapter.title },
    chapter.next && { volume: chapter.next.volumeSlug, chapter: chapter.next.chapterSlug, title: chapter.next.title },
  );
  useReaderShortcuts({
    previous: chapter.previous && chapterPath(work.slug, chapter.previous),
    next: chapter.next && chapterPath(work.slug, chapter.next),
    index: volumePath,
  });

  return (
    <div className="flex flex-1 flex-col">
      <ReaderBar backTo={volumePath} backLabel={volume.title} title={chapter.title} />
      <div id="texto-del-capitulo" className="mx-auto w-full max-w-2xl flex-1 px-6 pt-10 pb-16 sm:pt-14">
        <p className="font-ui text-xs tracking-[0.25em] text-muted uppercase">
          {work.title} · {volume.title}
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium text-foreground">{chapter.title}</h1>
        {/* HTML generated at build time from our own Markdown; raw HTML in the source is dropped. */}
        <article ref={articleRef} className="chapter-prose mt-8" dangerouslySetInnerHTML={{ __html: chapter.html }} />
        <nav
          aria-label="Navegación entre capítulos"
          className="mt-12 flex justify-between gap-4 border-t border-border pt-6"
        >
          <ChapterNavLink workSlug={work.slug} link={chapter.previous} label="Anterior" />
          <ChapterNavLink workSlug={work.slug} link={chapter.next} label="Siguiente" />
        </nav>
      </div>
      {resume && <ResumeToast percent={resume.percent} onResume={resumeReading} onDismiss={dismissResume} />}
    </div>
  );
}

// Keyed by chapter, so moving to another chapter starts its tracking and resume offer fresh.
export default function NovelChapter({ loaderData: { chapter } }: Route.ComponentProps) {
  return <ChapterReader key={`${chapter.volume.slug}/${chapter.slug}`} chapter={chapter} />;
}
