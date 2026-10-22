import { CoverGrid } from "@/components/cover-grid";
import { getMangaWorks } from "@/lib/content/manga.server";
import { buildMeta } from "@/lib/seo";
import type { Route } from "./+types/manga-catalog";

export async function loader() {
  return { works: await getMangaWorks() };
}

export function meta() {
  return buildMeta({ title: "Manga", description: "Catálogo de manga de Re:Zero en español." });
}

export default function MangaCatalog({ loaderData: { works } }: Route.ComponentProps) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <p className="font-mono text-[0.7rem] tracking-[0.3em] text-muted uppercase">Colección ilustrada</p>
      <h1 className="mt-3 font-display text-4xl font-medium text-foreground sm:text-5xl">Manga</h1>
      <CoverGrid
        label="Series de manga"
        items={works.map((work) => ({
          key: work.slug,
          to: `/manga/${work.slug}`,
          title: work.title,
          caption: `${work.volumeCount} ${work.volumeCount === 1 ? "serie" : "series"}`,
          image: work.cover,
        }))}
      />
    </div>
  );
}
