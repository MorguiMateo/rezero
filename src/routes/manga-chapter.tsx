import { data, Link } from "react-router";
import { ReaderBar } from "@/components/reader-bar";
import { getMangaChapter } from "@/lib/content/manga.server";
import type { ChapterLink } from "@/lib/content/types";
import { buildMeta } from "@/lib/seo";
import { useReaderShortcuts } from "@/lib/use-reader-shortcuts";
import type { Route } from "./+types/manga-chapter";

export async function loader({ params }: Route.LoaderArgs) {
  const chapter = await getMangaChapter(params.work, params.volume, params.chapter);
  if (!chapter) throw data(null, { status: 404 });
  return { chapter };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { chapter } = loaderData;
  return buildMeta({
    title: `${chapter.title} · ${chapter.volume.title}`,
    description: `${chapter.work.title}, ${chapter.volume.title}: ${chapter.title}.`,
  });
}

// Chapters open in reading mode: the root layout drops the site header (see root.tsx).
export const handle = { readingMode: true };

// The first pages are above the fold; they load right away instead of lazily.
const priorityPages = 2;

function chapterPath(workSlug: string, link: ChapterLink) {
  return `/manga/${workSlug}/${link.volumeSlug}/${link.chapterSlug}`;
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

export default function MangaChapter({ loaderData: { chapter } }: Route.ComponentProps) {
  const { work, volume } = chapter;
  const volumePath = `/manga/${work.slug}/${volume.slug}`;
  useReaderShortcuts({
    previous: chapter.previous && chapterPath(work.slug, chapter.previous),
    next: chapter.next && chapterPath(work.slug, chapter.next),
    index: volumePath,
  });

  return (
    <div className="flex flex-1 flex-col">
      <ReaderBar backTo={volumePath} backLabel={volume.title} title={chapter.title} />
      <div id="texto-del-capitulo" className="mx-auto w-full max-w-3xl flex-1 pt-8 pb-16">
        <div className="px-6">
          <p className="font-ui text-xs tracking-[0.25em] text-muted uppercase">
            {work.title} · {volume.title}
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium text-foreground">{chapter.title}</h1>
        </div>
        <div className="mt-8 flex flex-col">
          {chapter.pages.map((page, index) => (
            <img
              key={page.src}
              src={page.src}
              width={page.width}
              height={page.height}
              alt={`Página ${index + 1}`}
              loading={index < priorityPages ? "eager" : "lazy"}
              fetchPriority={index < priorityPages ? "high" : "auto"}
              decoding="async"
              className="h-auto w-full bg-surface"
            />
          ))}
        </div>
        <nav aria-label="Navegación entre capítulos" className="mt-12 flex justify-between gap-4 border-t border-border px-6 pt-6">
          <ChapterNavLink workSlug={work.slug} link={chapter.previous} label="Anterior" />
          <ChapterNavLink workSlug={work.slug} link={chapter.next} label="Siguiente" />
        </nav>
      </div>
    </div>
  );
}
