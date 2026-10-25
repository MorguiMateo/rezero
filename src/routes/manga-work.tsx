import { data, Link } from "react-router";
import { CoverGrid } from "@/components/cover-grid";
import { getMangaWork } from "@/lib/content/manga.server";
import { buildMeta } from "@/lib/seo";
import { contentSectionsEnabled } from "@/lib/sections";
import type { Route } from "./+types/manga-work";

export async function loader({ params }: Route.LoaderArgs) {
  const work = await getMangaWork(params.work);
  if (!work) throw data(null, { status: 404 });
  return { work };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { work } = loaderData;
  return buildMeta({ title: work.title, description: work.description });
}

export default function MangaWork({ loaderData: { work } }: Route.ComponentProps) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="max-w-3xl">
        <Link to={contentSectionsEnabled ? "/manga" : "/"} prefetch="intent" className="font-ui text-sm text-muted hover:text-primary">
          ← {contentSectionsEnabled ? "Manga" : "Inicio"}
        </Link>
        <h1 className="mt-6 font-display text-4xl font-medium text-foreground sm:text-5xl">{work.title}</h1>
        <p className="mt-2 font-ui text-sm uppercase tracking-[0.2em] text-muted">{work.author}</p>
        <p className="mt-6 font-reading text-lg text-foreground">{work.description}</p>
      </div>

      <h2 className="mt-12 font-display text-2xl text-primary">Series</h2>
      <CoverGrid
        label="Series"
        items={work.volumes.map((volume) => ({
          key: volume.slug,
          to: `/manga/${work.slug}/${volume.slug}`,
          title: volume.title,
          caption: `${volume.chapterCount} ${volume.chapterCount === 1 ? "capítulo" : "capítulos"}`,
          image: volume.cover,
        }))}
      />
    </div>
  );
}
