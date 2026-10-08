import { data, Link } from "react-router";
import { getVolume } from "@/lib/content/novels.server";
import { buildMeta } from "@/lib/seo";
import type { Route } from "./+types/novel-volume";

export async function loader({ params }: Route.LoaderArgs) {
  const volume = await getVolume(params.work, params.volume);
  if (!volume) throw data(null, { status: 404 });
  return { volume };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { volume } = loaderData;
  return buildMeta({
    title: `${volume.title} · ${volume.work.title}`,
    description: `Índice de capítulos de ${volume.work.title}, ${volume.title}.`,
  });
}

export default function NovelVolume({ loaderData: { volume } }: Route.ComponentProps) {
  const basePath = `/novela/${volume.work.slug}/${volume.slug}`;
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link to={`/novela/${volume.work.slug}`} prefetch="intent" className="font-ui text-sm text-muted hover:text-primary">
        ← {volume.work.title}
      </Link>
      <h1 className="mt-6 font-display text-4xl font-medium text-foreground sm:text-5xl">{volume.title}</h1>

      <h2 className="mt-12 font-display text-2xl text-primary">Capítulos</h2>
      <ol className="mt-4 divide-y divide-border border-y border-border">
        {volume.chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              to={`${basePath}/${chapter.slug}`}
              prefetch="intent"
              className="block py-3 font-ui text-foreground hover:text-primary"
            >
              {chapter.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
