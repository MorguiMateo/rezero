import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { getWorks } from "@/lib/content/novels.server";
import type { Route } from "./+types/home";

export const meta: MetaFunction = () => [
  { title: "Biblioteca de Pléyades · Re:Zero en español" },
  { name: "description", content: "Lee la novela ligera y el manga de Re:Zero en español." },
];

export async function loader() {
  return { works: await getWorks() };
}

export default function Home({ loaderData: { works } }: Route.ComponentProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-5xl font-medium title-gradient-text sm:text-7xl">
        Biblioteca de Pléyades
      </h1>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-muted">En construcción</p>
      <ul className="flex flex-col gap-2">
        {works.map((work) => (
          <li key={work.slug}>
            <Link to={`/novela/${work.slug}`} prefetch="intent" className="font-display text-2xl text-foreground hover:text-primary">
              {work.title}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/estilos"
        prefetch="intent"
        className="font-ui text-sm uppercase tracking-[0.2em] text-primary underline-offset-4 hover:underline"
      >
        Ver guía de estilos
      </Link>
    </div>
  );
}
