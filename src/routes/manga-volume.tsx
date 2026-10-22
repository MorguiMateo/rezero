import { data, Link } from "react-router";
import { getMangaVolume } from "@/lib/content/manga.server";
import { buildMeta } from "@/lib/seo";
import type { Route } from "./+types/manga-volume";

export async function loader({ params }: Route.LoaderArgs) {
  const volume = await getMangaVolume(params.work, params.volume);
  if (!volume) throw data(null, { status: 404 });
  return { volume };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { volume } = loaderData;
  return buildMeta({
    title: `${volume.title} · ${volume.work.title}`,
    description: `Capítulos del manga ${volume.work.title}, ${volume.title}.`,
  });
}

export default function MangaVolume({ loaderData: { volume } }: Route.ComponentProps) {
  const basePath = `/manga/${volume.work.slug}/${volume.slug}`;
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link to={`/manga/${volume.work.slug}`} prefetch="intent" className="font-ui text-sm text-muted hover:text-primary">
        ← {volume.work.title}
      </Link>
      <div className="mt-6 flex items-end gap-6">
        {volume.cover && (
          <img
            src={volume.cover.src}
            width={volume.cover.width}
            height={volume.cover.height}
            alt=""
            fetchPriority="high"
            className="w-24 shrink-0 rounded-sm shadow-lg shadow-black/40 sm:w-32"
          />
        )}
        <h1 className="font-display text-4xl font-medium text-foreground sm:text-5xl">{volume.title}</h1>
      </div>

      <h2 className="mt-12 font-display text-2xl text-primary">Capítulos</h2>
      <ol className="mt-4 divide-y divide-border border-y border-border">
        {volume.chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              to={`${basePath}/${chapter.slug}`}
              prefetch="intent"
              className="flex items-baseline justify-between gap-4 py-3 font-ui text-foreground hover:text-primary"
            >
              {chapter.title}
              <span className="shrink-0 text-sm text-muted">{chapter.pageCount} págs.</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
