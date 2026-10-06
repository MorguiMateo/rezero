import Link from "next/link";

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-5xl font-medium texto-plata sm:text-7xl">
        Biblioteca de Pléyades
      </h1>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-plata/70">
        En construcción
      </p>
      <Link
        href="/estilos"
        className="font-ui text-sm uppercase tracking-[0.2em] text-lila-300 underline-offset-4 hover:underline"
      >
        Ver guía de estilos
      </Link>
    </main>
  );
}
