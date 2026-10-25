import { ButtonLink } from "@/components/button";
import { PleiadesMark } from "@/components/pleiades-mark";
import { buildMeta } from "@/lib/seo";

export function meta() {
  return [
    ...buildMeta({
      title: "Página no encontrada",
      description: "Esta página no está en la Biblioteca de Pléyades. Vuelve al inicio para encontrar tu próxima lectura.",
    }),
    { name: "robots", content: "noindex" },
  ];
}

// This document is served at arbitrary URLs, whose client route matches may differ.
export const handle = { staticNotFound: true };

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <PleiadesMark className="h-12 w-auto text-primary" />
      <p className="font-mono text-sm tracking-[0.35em] text-muted">404</p>
      <h1 className="font-display text-5xl font-medium text-foreground sm:text-6xl">Página no encontrada</h1>
      <p className="max-w-md font-reading text-base text-muted sm:text-lg">
        Parece que este estante está vacío. La página que buscas no existe o ha cambiado de lugar.
      </p>
      <div className="mt-2">
        <ButtonLink to="/" prefetch="intent">Volver al inicio</ButtonLink>
      </div>
    </section>
  );
}
