import type { Metadata } from "next";

// Página temporal para revisar el design system; se borra cuando esté aprobado.
export const metadata: Metadata = {
  title: "Guía de estilos",
  robots: { index: false, follow: false },
};

const colores = [
  { nombre: "noche", hex: "#120E1A", clase: "bg-noche", uso: "Fondo base" },
  { nombre: "noche-2", hex: "#1B1526", clase: "bg-noche-2", uso: "Bandas / header" },
  { nombre: "malva-900", hex: "#554164", clase: "bg-malva-900", uso: "Bordes profundos" },
  { nombre: "violeta-700", hex: "#7B4B9F", clase: "bg-violeta-700", uso: "Hover / activo" },
  { nombre: "violeta-500", hex: "#A372C3", clase: "bg-violeta-500", uso: "Acento principal" },
  { nombre: "lila-300", hex: "#C190DF", clase: "bg-lila-300", uso: "Acento claro" },
  { nombre: "lavanda", hex: "#B59EF0", clase: "bg-lavanda", uso: "Brillos / focus" },
  { nombre: "plata", hex: "#E2E2E2", clase: "bg-plata", uso: "Texto secundario" },
  { nombre: "nieve", hex: "#FAFAFA", clase: "bg-nieve", uso: "Texto principal" },
  { nombre: "hielo", hex: "#90BFF9", clase: "bg-hielo", uso: "Acento secundario" },
  { nombre: "hielo-700", hex: "#649CC1", clase: "bg-hielo-700", uso: "Enlaces / escarcha" },
  { nombre: "gema", hex: "#77CD8E", clase: "bg-gema", uso: "Nuevo capítulo" },
  { nombre: "oro-palido", hex: "#F0DEAD", clase: "bg-oro-palido", uso: "Ornamentos" },
  { nombre: "peligro", hex: "#BD463E", clase: "bg-peligro", uso: "Errores" },
];

const tipografias = [
  {
    rol: "Display · títulos",
    fuente: "Cormorant",
    clase: "font-display text-5xl font-medium",
    muestra: "Re:Zero — Empezar de cero",
  },
  {
    rol: "Navegación · etiquetas",
    fuente: "Jost",
    clase: "font-ui text-sm uppercase tracking-[0.25em]",
    muestra: "Inicio · Novela · Manga · Spin-off · Extras",
  },
  {
    rol: "Lectura · cuerpo",
    fuente: "Literata",
    clase: "font-lectura text-lg leading-relaxed",
    muestra:
      "Natsuki Subaru acababa de salir de una tienda de conveniencia cuando, sin previo aviso, el mundo a su alrededor se transformó en una ciudad de fantasía.",
  },
  {
    rol: "Metadatos",
    fuente: "JetBrains Mono",
    clase: "font-mono text-xs uppercase tracking-widest text-plata/70",
    muestra: "Arco 6 · 38 volúmenes · 12 min",
  },
];

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 border-b border-malva-900 pb-3 font-display text-3xl text-lila-300">
      {children}
    </h2>
  );
}

export default function Estilos() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-plata/60">
          Sección 0 · Design system
        </p>
        <h1 className="font-display text-6xl font-medium texto-plata">
          Biblioteca de Pléyades
        </h1>
      </header>

      <section>
        <Titulo>Paleta · Emilia</Titulo>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {colores.map((c) => (
            <li key={c.nombre} className="overflow-hidden rounded-lg border border-malva-900/60">
              <div className={`h-20 ${c.clase}`} />
              <div className="space-y-0.5 bg-noche-2 p-2.5">
                <p className="font-ui text-sm">{c.nombre}</p>
                <p className="font-mono text-[11px] text-plata/60">{c.hex}</p>
                <p className="font-ui text-[11px] text-plata/50">{c.uso}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 h-12 rounded-lg bg-linear-175 from-nieve via-lila-300 to-violeta-500" />
        <p className="mt-2 font-mono text-[11px] text-plata/60">Degradado plata → violeta</p>
      </section>

      <section>
        <Titulo>Tipografía</Titulo>
        <div className="space-y-8">
          {tipografias.map((t) => (
            <div key={t.rol} className="grid gap-2 sm:grid-cols-[200px_1fr] sm:gap-8">
              <div>
                <p className="font-ui text-sm text-lila-300">{t.rol}</p>
                <p className="font-mono text-[11px] text-plata/60">{t.fuente}</p>
              </div>
              <p className={t.clase}>{t.muestra}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Titulo>Componentes base</Titulo>
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-md bg-violeta-500 px-5 py-2.5 font-ui text-sm uppercase tracking-[0.2em] text-noche transition-colors hover:bg-lila-300">
            Comenzar lectura
          </button>
          <button className="rounded-md border border-lila-300/50 px-5 py-2.5 font-ui text-sm uppercase tracking-[0.2em] text-lila-300 transition-colors hover:border-lila-300 hover:bg-lila-300/10">
            Entrar
          </button>
          <span className="rounded-full bg-gema/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-gema ring-1 ring-gema/40">
            Nuevo · Cap. 42
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-plata/60">
            Principal
          </span>
          <a href="#" className="font-ui text-sm text-hielo underline-offset-4 hover:underline">
            Enlace de ejemplo
          </a>
        </div>
      </section>
    </main>
  );
}
