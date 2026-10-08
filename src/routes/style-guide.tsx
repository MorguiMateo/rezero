import type { MetaFunction } from "react-router";
import { getThemePortrait, themeNames, themes } from "@/lib/theme";

// Temporary page to review the design system; delete once it is approved.
export const meta: MetaFunction = () => [
  { title: "Guía de estilos · Biblioteca de Pléyades" },
  { name: "description", content: "Paletas, temas y tipografía de Biblioteca de Pléyades." },
  { name: "robots", content: "noindex, nofollow" },
];

type Swatch = { token: string; hex: string; className: string; usage: string };

type CharacterPalette = {
  id: "emilia" | "rem" | "ram" | "subaru";
  character: string;
  description: string;
  sample: string;
  swatches: Swatch[];
};

// Class names are written out in full so Tailwind can detect them.
const characterPalettes: CharacterPalette[] = [
  {
    id: "emilia",
    character: "Emilia · por defecto (oscuro)",
    description: "Pelo plateado, ojos violeta, vestido blanco y lila, gema verde y la magia de hielo.",
    sample:
      "Emilia apoyó la mano sobre el cristal helado y, por un instante, la biblioteca entera brilló con un resplandor violeta.",
    swatches: [
      { token: "emilia-night", hex: "#120E1A", className: "bg-emilia-night", usage: "Fondo base" },
      { token: "emilia-night-2", hex: "#1B1526", className: "bg-emilia-night-2", usage: "Superficie / header" },
      { token: "emilia-mauve-900", hex: "#554164", className: "bg-emilia-mauve-900", usage: "Bordes" },
      { token: "emilia-violet-700", hex: "#8A5AAF", className: "bg-emilia-violet-700", usage: "Hover / activo" },
      { token: "emilia-violet-500", hex: "#A372C3", className: "bg-emilia-violet-500", usage: "Botón principal" },
      { token: "emilia-lilac-300", hex: "#C190DF", className: "bg-emilia-lilac-300", usage: "Acento / enlaces" },
      { token: "emilia-lavender", hex: "#B59EF0", className: "bg-emilia-lavender", usage: "Brillos / focus" },
      { token: "emilia-silver", hex: "#E2E2E2", className: "bg-emilia-silver", usage: "Texto secundario" },
      { token: "emilia-snow", hex: "#FAFAFA", className: "bg-emilia-snow", usage: "Texto principal" },
      { token: "emilia-ice", hex: "#90BFF9", className: "bg-emilia-ice", usage: "Segundo acento" },
      { token: "emilia-ice-700", hex: "#649CC1", className: "bg-emilia-ice-700", usage: "Escarcha" },
      { token: "emilia-gem", hex: "#77CD8E", className: "bg-emilia-gem", usage: "Nuevo capítulo" },
      { token: "emilia-pale-gold", hex: "#F0DEAD", className: "bg-emilia-pale-gold", usage: "Ornamentos" },
    ],
  },
  {
    id: "rem",
    character: "Rem · claro",
    description: "Pelo celeste claro, delantal blanco, vestido negro y cinta violeta.",
    sample:
      "Rem dejó la escoba junto a la puerta de la mansión Roswaal y se acomodó la cinta del pelo antes de ir a buscar a Subaru.",
    swatches: [
      { token: "rem-apron", hex: "#F6FAFE", className: "bg-rem-apron", usage: "Fondo · delantal" },
      { token: "rem-mist", hex: "#E9F3FE", className: "bg-rem-mist", usage: "Superficie" },
      { token: "rem-hair-light", hex: "#CFE4FD", className: "bg-rem-hair-light", usage: "Bordes / insignia" },
      { token: "rem-hair", hex: "#91BFFA", className: "bg-rem-hair", usage: "Pelo · botón" },
      { token: "rem-hair-shadow", hex: "#7FB0F4", className: "bg-rem-hair-shadow", usage: "Pelo · sombra" },
      { token: "rem-hair-glow", hex: "#B5D5FC", className: "bg-rem-hair-glow", usage: "Hover botón" },
      { token: "rem-blue", hex: "#2A6CB8", className: "bg-rem-blue", usage: "Texto / enlaces" },
      { token: "rem-ribbon", hex: "#9265AB", className: "bg-rem-ribbon", usage: "Cinta" },
      { token: "rem-ribbon-dark", hex: "#7A4F9C", className: "bg-rem-ribbon-dark", usage: "Cinta · texto" },
      { token: "rem-ribbon-light", hex: "#F1E9F7", className: "bg-rem-ribbon-light", usage: "Cinta · tinte" },
      { token: "rem-dress", hex: "#2B2D36", className: "bg-rem-dress", usage: "Vestido · texto" },
      { token: "rem-gray", hex: "#5A5F6E", className: "bg-rem-gray", usage: "Texto secundario" },
    ],
  },
  {
    id: "ram",
    character: "Ram · claro",
    description: "Pelo rosa magenta, delantal blanco, vestido negro y cinta violeta.",
    sample:
      "Ram suspiró, se apartó el flequillo rosado y decidió que el té de la tarde podía esperar a que Barusu terminara de limpiar.",
    swatches: [
      { token: "ram-apron", hex: "#FDF6FA", className: "bg-ram-apron", usage: "Fondo · delantal" },
      { token: "ram-blush", hex: "#FCE7F2", className: "bg-ram-blush", usage: "Superficie" },
      { token: "ram-petal", hex: "#F3D2E3", className: "bg-ram-petal", usage: "Bordes" },
      { token: "ram-hair", hex: "#F0A6CC", className: "bg-ram-hair", usage: "Pelo · insignia" },
      { token: "ram-hair-shadow", hex: "#E77FB8", className: "bg-ram-hair-shadow", usage: "Pelo · sombra" },
      { token: "ram-pink", hex: "#A8326F", className: "bg-ram-pink", usage: "Botón / texto" },
      { token: "ram-pink-dark", hex: "#7F2554", className: "bg-ram-pink-dark", usage: "Hover botón" },
      { token: "ram-ribbon", hex: "#9774CC", className: "bg-ram-ribbon", usage: "Cinta" },
      { token: "ram-ribbon-dark", hex: "#5E46A6", className: "bg-ram-ribbon-dark", usage: "Cinta · texto" },
      { token: "ram-ribbon-light", hex: "#EFE9FA", className: "bg-ram-ribbon-light", usage: "Cinta · tinte" },
      { token: "ram-dress", hex: "#2F2C33", className: "bg-ram-dress", usage: "Vestido · texto" },
      { token: "ram-gray", hex: "#625A63", className: "bg-ram-gray", usage: "Texto secundario" },
    ],
  },
  {
    id: "subaru",
    character: "Subaru · claro",
    description: "Chaqueta verde del arco 6, bufanda y franjas ámbar, chándal blanco y gris, capa negra.",
    sample:
      "Subaru se ajustó la capa y la bufanda antes de cruzar las arenas de Augria, con la Torre de Pléyades recortada contra el horizonte.",
    swatches: [
      { token: "subaru-tracksuit-white", hex: "#F7F7F5", className: "bg-subaru-tracksuit-white", usage: "Fondo · chándal" },
      { token: "subaru-tracksuit-gray", hex: "#3A393F", className: "bg-subaru-tracksuit-gray", usage: "Header · chándal" },
      { token: "subaru-stone", hex: "#D9DCD8", className: "bg-subaru-stone", usage: "Bordes" },
      { token: "subaru-jacket-mist", hex: "#E6F3EA", className: "bg-subaru-jacket-mist", usage: "Superficie" },
      { token: "subaru-jacket-light", hex: "#9FD0AC", className: "bg-subaru-jacket-light", usage: "Chaqueta clara" },
      { token: "subaru-jacket", hex: "#4A9E64", className: "bg-subaru-jacket", usage: "Chaqueta" },
      { token: "subaru-green", hex: "#2D7044", className: "bg-subaru-green", usage: "Botón / texto" },
      { token: "subaru-green-dark", hex: "#1F4A2E", className: "bg-subaru-green-dark", usage: "Hover botón" },
      { token: "subaru-amber-light", hex: "#FDEBCF", className: "bg-subaru-amber-light", usage: "Ámbar · tinte" },
      { token: "subaru-amber", hex: "#F5B25A", className: "bg-subaru-amber", usage: "Bufanda / franjas" },
      { token: "subaru-amber-dark", hex: "#8F5508", className: "bg-subaru-amber-dark", usage: "Ámbar · texto" },
      { token: "subaru-cloak", hex: "#2C2B30", className: "bg-subaru-cloak", usage: "Capa · texto" },
      { token: "subaru-gray", hex: "#5B5D63", className: "bg-subaru-gray", usage: "Texto secundario" },
    ],
  },
];

const typefaces = [
  {
    role: "Display · títulos",
    family: "Cormorant · font-display",
    className: "font-display text-5xl font-medium",
    sample: "Re:Zero — Empezar de cero",
  },
  {
    role: "Navegación · etiquetas",
    family: "Jost · font-ui",
    className: "font-ui text-sm uppercase tracking-[0.25em]",
    sample: "Inicio · Novela · Manga · Spin-off · Extras",
  },
  {
    role: "Lectura · cuerpo",
    family: "Literata · font-reading",
    className: "font-reading text-lg leading-relaxed",
    sample:
      "Natsuki Subaru acababa de salir de una tienda de conveniencia cuando, sin previo aviso, el mundo a su alrededor se transformó en una ciudad de fantasía.",
  },
  {
    role: "Metadatos",
    family: "JetBrains Mono · font-mono",
    className: "font-mono text-xs uppercase tracking-widest text-muted",
    sample: "Arco 6 · 38 volúmenes · 12 min",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 border-b border-border pb-3 font-display text-3xl text-primary">
      {children}
    </h2>
  );
}

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {swatches.map((swatch) => (
        <li key={swatch.token} className="overflow-hidden rounded-lg border border-border">
          <div className={`h-14 ${swatch.className}`} />
          <div className="space-y-0.5 bg-surface p-2">
            <p className="font-mono text-[11px] leading-tight">{swatch.token}</p>
            <p className="font-mono text-[10px] text-muted">{swatch.hex}</p>
            <p className="font-ui text-[11px] text-muted">{swatch.usage}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Renders the same mock page inside a data-theme wrapper to compare themes.
function ThemePreview({ palette }: { palette: CharacterPalette }) {
  return (
    <div
      data-theme={palette.id}
      className="overflow-hidden rounded-xl border border-border bg-background text-foreground"
    >
      <div className="flex items-center justify-between bg-header px-8 py-4 text-header-foreground">
        <span className="font-display text-2xl">
          Re<span className="text-header-accent">:</span>Zero
        </span>
        <nav className="flex gap-6 font-ui text-xs uppercase tracking-[0.25em]">
          <span className="border-b-2 border-header-accent pb-1 text-primary-soft">Inicio</span>
          <span className="opacity-70">Novela</span>
          <span className="opacity-70">Manga</span>
        </nav>
        <span className="rounded-md border border-primary-soft/60 px-4 py-1.5 font-ui text-xs uppercase tracking-[0.2em] text-primary-soft">
          Entrar
        </span>
      </div>
      <div className="h-1.5 bg-primary-fill" />

      <div className="p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
          Vista previa · tema {palette.id}
        </p>
        <h4 className="mt-2 font-display text-4xl font-medium">Biblioteca de Pléyades</h4>
        <p className="mt-4 max-w-2xl font-reading text-lg leading-relaxed">{palette.sample}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border-t-4 border-primary-fill bg-surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
              Novela · Principal
            </p>
            <p className="mt-1 font-display text-2xl">Re:Zero</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">38 volúmenes</p>
          </div>
          <div className="rounded-lg border-t-4 border-accent-fill bg-accent-soft p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
              Manga · Arco 4
            </p>
            <p className="mt-1 font-display text-2xl">El Santuario</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">12 tomos</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="rounded-md bg-button px-5 py-2.5 font-ui text-sm uppercase tracking-[0.2em] text-button-foreground transition-colors hover:bg-button-hover">
            Comenzar lectura
          </button>
          <button className="rounded-md border border-secondary-border bg-secondary px-5 py-2.5 font-ui text-sm uppercase tracking-[0.2em] text-secondary-foreground transition-opacity hover:opacity-80">
            Ver índice
          </button>
          <span className="rounded-full bg-badge px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-badge-foreground ring-1 ring-badge-border">
            Nuevo · Cap. 42
          </span>
          <a href="#" className="font-ui text-sm text-primary underline underline-offset-4 hover:text-accent">
            Enlace de ejemplo
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StyleGuide() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-16 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          Sección 0 · Design system
        </p>
        <h1 className="font-display text-6xl font-medium title-gradient-text">
          Biblioteca de Pléyades
        </h1>
      </header>

      <section>
        <SectionTitle>Paletas por personaje</SectionTitle>
        <div className="space-y-10">
          {characterPalettes.map((palette) => (
            <div key={palette.id} className="space-y-3">
              <div>
                <h3 className="font-display text-2xl">{palette.character}</h3>
                <p className="font-ui text-sm text-muted">{palette.description}</p>
              </div>
              <SwatchGrid swatches={palette.swatches} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Temas</SectionTitle>
        <p className="mb-6 font-ui text-sm text-muted">
          Cada vista previa usa los mismos componentes; solo cambia el atributo data-theme.
        </p>
        <div className="space-y-10">
          {characterPalettes.map((palette) => (
            <ThemePreview key={palette.id} palette={palette} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Retratos del botón de tema</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-4">
          {themes.map((theme) => (
            <div key={theme} data-theme={theme} className="flex items-end gap-4 rounded-xl bg-header p-4">
              <img
                src={getThemePortrait(theme)}
                alt={themeNames[theme]}
                width={96}
                height={96}
                loading="lazy"
                className="size-24 rounded-full ring-2 ring-header-accent"
              />
              <img
                src={getThemePortrait(theme)}
                alt=""
                width={96}
                height={96}
                loading="lazy"
                className="size-10 rounded-full ring-2 ring-header-accent"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Tipografía</SectionTitle>
        <div className="space-y-8">
          {typefaces.map((typeface) => (
            <div key={typeface.role} className="grid gap-2 sm:grid-cols-[200px_1fr] sm:gap-8">
              <div>
                <p className="font-ui text-sm text-primary">{typeface.role}</p>
                <p className="font-mono text-[11px] text-muted">{typeface.family}</p>
              </div>
              <p className={typeface.className}>{typeface.sample}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
