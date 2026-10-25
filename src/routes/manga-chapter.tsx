import { useRef } from "react";
import { preconnect } from "react-dom";
import { data } from "react-router";
import { ChapterNavigation } from "@/components/chapter-navigation";
import { ReaderBar } from "@/components/reader-bar";
import { getMangaChapter } from "@/lib/content/manga.server";
import type { ChapterLink } from "@/lib/content/types";
import { buildMeta } from "@/lib/seo";
import { mangaPriorityPages, useMangaPagePreload } from "@/lib/use-manga-preload";
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

function chapterPath(workSlug: string, link: ChapterLink) {
  return `/manga/${workSlug}/${link.volumeSlug}/${link.chapterSlug}`;
}

export default function MangaChapter({ loaderData: { chapter } }: Route.ComponentProps) {
  const { work, volume } = chapter;
  const volumePath = `/manga/${work.slug}/${volume.slug}`;
  const pagesRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLElement>(null);
  // Rendered into <head> during the build: the connection opens before the first <img> is parsed.
  preconnect(chapter.imagesOrigin);
  useMangaPagePreload({
    chapterKey: `${volume.slug}/${chapter.slug}`,
    pagesRef,
    endRef,
    nextChapterPages: chapter.nextPages,
  });
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
        <div ref={pagesRef} className="mt-8 flex flex-col">
          {chapter.pages.map((page, index) => (
            <img
              key={page.src}
              src={page.src}
              width={page.width}
              height={page.height}
              alt={`Página ${index + 1}`}
              loading={index < mangaPriorityPages ? "eager" : "lazy"}
              fetchPriority={index < mangaPriorityPages ? "high" : "auto"}
              decoding="async"
              className="h-auto w-full bg-surface"
            />
          ))}
        </div>
        <ChapterNavigation
          ref={endRef}
          className="px-6"
          previous={chapter.previous && { to: chapterPath(work.slug, chapter.previous), title: chapter.previous.title }}
          next={chapter.next && { to: chapterPath(work.slug, chapter.next), title: chapter.next.title }}
        />
      </div>
    </div>
  );
}
