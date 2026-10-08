import { data, Link } from "react-router";
import literataFont from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?url";
import { fontPreload } from "@/lib/font-preload";
import { getChapter } from "@/lib/content/novels.server";
import type { ChapterLink } from "@/lib/content/types";
import { buildMeta } from "@/lib/seo";
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

function ChapterNavLink({ workSlug, link, label }: { workSlug: string; link: ChapterLink | null; label: string }) {
  if (!link) return <span />;
  return (
    <Link
      to={`/novela/${workSlug}/${link.volumeSlug}/${link.chapterSlug}`}
      prefetch="intent"
      className="font-ui text-sm text-primary hover:underline underline-offset-4"
    >
      {label}: {link.title}
    </Link>
  );
}

export default function NovelChapter({ loaderData: { chapter } }: Route.ComponentProps) {
  const { work, volume } = chapter;
  const navigation = (
    <nav aria-label="Navegación entre capítulos" className="flex justify-between gap-4">
      <ChapterNavLink workSlug={work.slug} link={chapter.previous} label="Anterior" />
      <ChapterNavLink workSlug={work.slug} link={chapter.next} label="Siguiente" />
    </nav>
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <nav aria-label="Ruta" className="font-ui text-sm text-muted">
        <Link to={`/novela/${work.slug}`} prefetch="intent" className="hover:text-primary">
          {work.title}
        </Link>
        {" / "}
        <Link to={`/novela/${work.slug}/${volume.slug}`} prefetch="intent" className="hover:text-primary">
          {volume.title}
        </Link>
      </nav>
      <h1 className="mt-6 font-display text-4xl font-medium text-foreground">{chapter.title}</h1>
      {/* HTML generated at build time from our own Markdown; raw HTML in the source is dropped. */}
      <article className="chapter-prose mt-8" dangerouslySetInnerHTML={{ __html: chapter.html }} />
      <div className="mt-12 border-t border-border pt-6">{navigation}</div>
    </div>
  );
}
