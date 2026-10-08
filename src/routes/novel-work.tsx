import { data, Link } from "react-router";
import { getWork } from "@/lib/content/novels.server";
import { buildMeta } from "@/lib/seo";
import type { Route } from "./+types/novel-work";

export async function loader({ params }: Route.LoaderArgs) {
  const work = await getWork(params.work);
  if (!work) throw data(null, { status: 404 });
  return { work };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { work } = loaderData;
  return buildMeta({ title: work.title, description: work.description });
}

export default function NovelWork({ loaderData: { work } }: Route.ComponentProps) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link to="/" prefetch="intent" className="font-ui text-sm text-muted hover:text-primary">
        ← Inicio
      </Link>
      <h1 className="mt-6 font-display text-4xl font-medium text-foreground sm:text-5xl">{work.title}</h1>
      <p className="mt-2 font-ui text-sm uppercase tracking-[0.2em] text-muted">{work.author}</p>
      <p className="mt-6 font-reading text-lg text-foreground">{work.description}</p>

      <h2 className="mt-12 font-display text-2xl text-primary">Volúmenes</h2>
      <ol className="mt-4 divide-y divide-border border-y border-border">
        {work.volumes.map((volume) => (
          <li key={volume.slug}>
            <Link
              to={`/novela/${work.slug}/${volume.slug}`}
              prefetch="intent"
              className="block py-3 font-ui text-foreground hover:text-primary"
            >
              {volume.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
