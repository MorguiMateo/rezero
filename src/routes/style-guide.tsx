import { useState } from "react";
import type { MetaFunction } from "react-router";
import { BookCover, type CoverAppearance } from "@/components/book-cover";
import { Button, ButtonLink } from "@/components/button";
import { CoverGrid } from "@/components/cover-grid";
import { SiteLogo } from "@/components/site-logo";
import { getWorks } from "@/lib/content/novels.server";
import type { WorkSummary } from "@/lib/content/types";
import { themeNames, themes, type Theme } from "@/lib/theme";
import type { Route } from "./+types/style-guide";

// Temporary page to review the design system; delete once it is approved.
export const meta: MetaFunction = () => [
  { title: "Guía de estilos · Biblioteca de Pléyades" },
  { name: "description", content: "Paletas, temas y tipografía de Biblioteca de Pléyades." },
  { name: "robots", content: "noindex, nofollow" },
];

export async function loader() {
  const work = (await getWorks()).find((work) => work.cover !== null);
  return {
    sampleWork: work ? { title: work.title, cover: work.cover, volumeCount: work.volumeCount } : null,
  };
}

const comparisonThemes = ["satella", "beatrice", "echidna", "shaula", "emilia", "subaru", "rem", "ram"] as const satisfies readonly Theme[];
const coverVariants = [
  { appearance: "outlined", label: "A · Borde y canto" },
  { appearance: "halo", label: "B · Halo suave" },
] as const satisfies readonly { appearance: CoverAppearance; label: string }[];

type SampleWork = Pick<WorkSummary, "title" | "cover" | "volumeCount">;

type Swatch = { token: string; hex: string; className: string; usage: string };

type CharacterPalette = {
  id: Theme;
  character: string;
  description: string;
  sample: string;
  swatches: Swatch[];
};

// Class names are written out in full so Tailwind can detect them.
const characterPalettes: CharacterPalette[] = [
  {
    id: "satella",
    character: "Satella · por defecto (oscuro)",
    description: "La Bruja de la Envidia: pelo plateado y ojos violeta como Emilia, envuelta en sombra con un brillo violeta.",
    sample:
      "La sombra se extendió sobre el bosque y, entre la niebla violeta, una voz repitió una y otra vez: te amo.",
    swatches: [
      { token: "satella-night", hex: "#120E1A", className: "bg-satella-night", usage: "Fondo base" },
      { token: "satella-night-2", hex: "#1B1526", className: "bg-satella-night-2", usage: "Superficie / header" },
      { token: "satella-mauve-900", hex: "#554164", className: "bg-satella-mauve-900", usage: "Bordes" },
      { token: "satella-violet-700", hex: "#8A5AAF", className: "bg-satella-violet-700", usage: "Hover / activo" },
      { token: "satella-violet-500", hex: "#A372C3", className: "bg-satella-violet-500", usage: "Botón principal" },
      { token: "satella-lilac-300", hex: "#C190DF", className: "bg-satella-lilac-300", usage: "Acento / enlaces" },
      { token: "satella-lavender", hex: "#B59EF0", className: "bg-satella-lavender", usage: "Brillos / focus" },
      { token: "satella-silver", hex: "#E2E2E2", className: "bg-satella-silver", usage: "Texto secundario" },
      { token: "satella-snow", hex: "#FAFAFA", className: "bg-satella-snow", usage: "Texto principal" },
      { token: "satella-ice", hex: "#90BFF9", className: "bg-satella-ice", usage: "Segundo acento" },
      { token: "satella-ice-700", hex: "#649CC1", className: "bg-satella-ice-700", usage: "Escarcha" },
      { token: "satella-gem", hex: "#77CD8E", className: "bg-satella-gem", usage: "Nuevo capítulo" },
      { token: "satella-pale-gold", hex: "#F0DEAD", className: "bg-satella-pale-gold", usage: "Ornamentos" },
    ],
  },
  {
    id: "emilia",
    character: "Emilia · claro",
    description: "Capucha blanca con orejas lila, pelo plateado, ojos y ribetes violeta, gema verde y la magia de hielo.",
    sample:
      "Emilia apoyó la mano sobre el cristal helado y, por un instante, la biblioteca entera brilló con un resplandor violeta.",
    swatches: [
      { token: "emilia-snow", hex: "#F5F0FB", className: "bg-emilia-snow", usage: "Fondo · capucha" },
      { token: "emilia-frost", hex: "#EBE2F6", className: "bg-emilia-frost", usage: "Superficie" },
      { token: "emilia-lilac-200", hex: "#D6C6EC", className: "bg-emilia-lilac-200", usage: "Bordes" },
      { token: "emilia-lavender", hex: "#DDCBF3", className: "bg-emilia-lavender", usage: "Header" },
      { token: "emilia-silver", hex: "#D2C5D2", className: "bg-emilia-silver", usage: "Pelo" },
      { token: "emilia-lilac", hex: "#A27FE0", className: "bg-emilia-lilac", usage: "Orejas · relleno" },
      { token: "emilia-violet", hex: "#6D48A3", className: "bg-emilia-violet", usage: "Botón / texto" },
      { token: "emilia-violet-dark", hex: "#4F3279", className: "bg-emilia-violet-dark", usage: "Hover botón" },
      { token: "emilia-violet-deep", hex: "#5F3A99", className: "bg-emilia-violet-deep", usage: "Acento header" },
      { token: "emilia-ink", hex: "#2A2335", className: "bg-emilia-ink", usage: "Texto principal" },
      { token: "emilia-gray", hex: "#625A6E", className: "bg-emilia-gray", usage: "Texto secundario" },
      { token: "emilia-ice-light", hex: "#E6F1FE", className: "bg-emilia-ice-light", usage: "Hielo · tinte" },
      { token: "emilia-ice", hex: "#90BFF9", className: "bg-emilia-ice", usage: "Hielo" },
      { token: "emilia-ice-dark", hex: "#2D6A9F", className: "bg-emilia-ice-dark", usage: "Hielo · texto" },
      { token: "emilia-gem-light", hex: "#E1F5E7", className: "bg-emilia-gem-light", usage: "Insignia" },
      { token: "emilia-gem", hex: "#77CD8E", className: "bg-emilia-gem", usage: "Gema" },
      { token: "emilia-gem-dark", hex: "#24673A", className: "bg-emilia-gem-dark", usage: "Gema · texto" },
    ],
  },
  {
    id: "beatrice",
    character: "Beatrice · oscuro",
    description: "La Biblioteca Prohibida de noche: tirabuzones rubios, lazos rosas, vestido carmesí, ojos azules de mariposa y corona dorada.",
    sample:
      "Beatrice cerró el libro de golpe, alzó la barbilla y declaró que la biblioteca no estaba abierta para visitas, de hecho.",
    swatches: [
      { token: "beatrice-library", hex: "#160F12", className: "bg-beatrice-library", usage: "Fondo base" },
      { token: "beatrice-library-2", hex: "#21161A", className: "bg-beatrice-library-2", usage: "Superficie / header" },
      { token: "beatrice-shelf", hex: "#4D3038", className: "bg-beatrice-shelf", usage: "Bordes" },
      { token: "beatrice-dress-dark", hex: "#A42A58", className: "bg-beatrice-dress-dark", usage: "Vestido · sombra" },
      { token: "beatrice-dress", hex: "#D03A71", className: "bg-beatrice-dress", usage: "Vestido" },
      { token: "beatrice-ribbon", hex: "#F09BBA", className: "bg-beatrice-ribbon", usage: "Botón / enlaces" },
      { token: "beatrice-ribbon-light", hex: "#F8CDE0", className: "bg-beatrice-ribbon-light", usage: "Hover botón" },
      { token: "beatrice-hair", hex: "#F3D98A", className: "bg-beatrice-hair", usage: "Pelo · segundo acento" },
      { token: "beatrice-fur", hex: "#FBF4EC", className: "bg-beatrice-fur", usage: "Texto principal" },
      { token: "beatrice-eye-dark", hex: "#4A7FB5", className: "bg-beatrice-eye-dark", usage: "Ojos · sombra" },
      { token: "beatrice-eye", hex: "#8CBDE9", className: "bg-beatrice-eye", usage: "Nuevo capítulo" },
      { token: "beatrice-crown", hex: "#DDB46E", className: "bg-beatrice-crown", usage: "Corona · relleno" },
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
  {
    id: "echidna",
    character: "Echidna · oscuro",
    description: "La Bruja de la Codicia: vestido negro, pelo blanco y la mariposa de jade en el pelo; casi monocromo.",
    sample:
      "Echidna sirvió el té en el castillo de sus sueños y, sonriendo, preguntó qué conocimiento venía a buscar su invitado.",
    swatches: [
      { token: "echidna-black", hex: "#0F0F10", className: "bg-echidna-black", usage: "Fondo base" },
      { token: "echidna-dress", hex: "#19191B", className: "bg-echidna-dress", usage: "Superficie / header" },
      { token: "echidna-charcoal", hex: "#3A3739", className: "bg-echidna-charcoal", usage: "Bordes" },
      { token: "echidna-ash", hex: "#6D6870", className: "bg-echidna-ash", usage: "Segundo acento · relleno" },
      { token: "echidna-silver", hex: "#C1BCC4", className: "bg-echidna-silver", usage: "Pelo · sombra" },
      { token: "echidna-hair", hex: "#F4F4F6", className: "bg-echidna-hair", usage: "Texto / botón" },
      { token: "echidna-jade-dark", hex: "#1F8A68", className: "bg-echidna-jade-dark", usage: "Jade · relleno" },
      { token: "echidna-jade", hex: "#3AD8A8", className: "bg-echidna-jade", usage: "Mariposa · enlaces" },
      { token: "echidna-jade-light", hex: "#8DE8C9", className: "bg-echidna-jade-light", usage: "Jade · brillo" },
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
    id: "shaula",
    character: "Shaula · oscuro",
    description: "Traje negro con ribetes naranja, pelo granate rosado, ojos verdes y las dunas de Augria de noche.",
    sample:
      "Shaula saltó desde lo alto de la Torre de Pléyades, saludó con la mano y gritó el nombre de su maestro hacia las dunas.",
    swatches: [
      { token: "shaula-night", hex: "#140F10", className: "bg-shaula-night", usage: "Fondo base" },
      { token: "shaula-night-2", hex: "#1E1618", className: "bg-shaula-night-2", usage: "Superficie / header" },
      { token: "shaula-hair-dark", hex: "#4A2E35", className: "bg-shaula-hair-dark", usage: "Bordes" },
      { token: "shaula-hair", hex: "#81525D", className: "bg-shaula-hair", usage: "Pelo" },
      { token: "shaula-hair-light", hex: "#C58E9B", className: "bg-shaula-hair-light", usage: "Segundo acento" },
      { token: "shaula-orange-dark", hex: "#B86A08", className: "bg-shaula-orange-dark", usage: "Naranja · sombra" },
      { token: "shaula-orange", hex: "#EA8C10", className: "bg-shaula-orange", usage: "Botón / ribetes" },
      { token: "shaula-orange-light", hex: "#F5AC4A", className: "bg-shaula-orange-light", usage: "Acento / enlaces" },
      { token: "shaula-dune", hex: "#C9B08C", className: "bg-shaula-dune", usage: "Texto secundario" },
      { token: "shaula-sand", hex: "#F6E8D2", className: "bg-shaula-sand", usage: "Texto principal" },
      { token: "shaula-eye", hex: "#8CC152", className: "bg-shaula-eye", usage: "Nuevo capítulo" },
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

// Production components share the theme wrapper; demo actions never touch saved progress.
function ThemePreview({ palette, sampleWork }: { palette: CharacterPalette; sampleWork: SampleWork | null }) {
  const [notice, setNotice] = useState("");
  const title = sampleWork?.title ?? "Biblioteca de Pléyades";

  return (
    <div
      data-theme={palette.id}
      className="overflow-hidden rounded-xl border border-border bg-background text-foreground"
    >
      <div className="bg-header px-6 py-4 text-header-foreground sm:px-8">
        <SiteLogo />
      </div>
      <div className="h-1.5 bg-primary-fill" />

      <div className="p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
          Vista previa · tema {palette.id}
        </p>
        <h4 className="mt-2 font-display text-4xl font-medium">Biblioteca de Pléyades</h4>
        <p className="mt-4 max-w-2xl font-reading text-lg leading-relaxed">{palette.sample}</p>

        <CoverGrid
          label={`Portadas de ejemplo · ${palette.character}`}
          items={[
            {
              key: "sample",
              to: "#comparativa-portadas",
              title,
              caption: sampleWork ? `${sampleWork.volumeCount} volúmenes` : "Novela ligera",
              image: sampleWork?.cover ?? null,
            },
            {
              key: "generic",
              to: "#comparativa-portadas",
              title: "Portada genérica",
              caption: "Sin ilustración",
              image: null,
            },
          ]}
        />
        <p className="mt-8 font-ui text-sm text-muted">
          Acciones compartidas del lector. Los botones son ejemplos y no modifican tu progreso;
          los enlaces llevan a secciones de esta guía.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <ButtonLink to="#comparativa-portadas">Ver portadas</ButtonLink>
          <ButtonLink to="#tipografia" variant="outline" size="sm" shape="pill">
            <span aria-hidden="true" className="text-primary">✦</span>
            Ver tipografía
          </ButtonLink>
          <Button size="sm" shape="pill" onClick={() => setNotice("Ejemplo: volverías a tu posición de lectura.")}>
            Continuar donde lo dejaste (42 %)
          </Button>
          <Button variant="text" size="label" onClick={() => setNotice("Ejemplo: se olvidaría el progreso de esta obra.")}>
            Olvidar progreso
          </Button>
          <Button variant="ghost" size="icon" shape="pill" aria-label="Cerrar ejemplo" onClick={() => setNotice("")}>
            <span aria-hidden="true">✕</span>
          </Button>
          <Button disabled>Sin progreso guardado</Button>
        </div>
        <p role="status" className="mt-3 min-h-10 font-ui text-sm text-muted">{notice}</p>
      </div>
    </div>
  );
}

function CoverComparison({ sampleWork }: { sampleWork: SampleWork | null }) {
  const title = sampleWork?.title ?? "Biblioteca de Pléyades";
  const caption = sampleWork
    ? `${sampleWork.volumeCount} ${sampleWork.volumeCount === 1 ? "volumen" : "volúmenes"}`
    : "Novela ligera";

  return (
    <section id="comparativa-portadas" className="scroll-mt-24">
      <SectionTitle>Comparativa de portadas</SectionTitle>
      <p className="mb-6 font-ui text-muted">
        Compara el contorno y las páginas más claras con un halo suave. El inicio utiliza la versión A.
      </p>
      <nav aria-label="Temas de la comparativa" className="mb-8 flex flex-wrap gap-x-6 gap-y-3">
        {comparisonThemes.map((theme) => (
          <a key={theme} href={`#portadas-${theme}`} className="text-primary underline underline-offset-4">
            {themeNames[theme]}
          </a>
        ))}
      </nav>
      <div className="space-y-10">
        {comparisonThemes.map((theme, index) => (
          <section
            key={theme}
            id={`portadas-${theme}`}
            data-theme={theme}
            aria-labelledby={`portadas-${theme}-titulo`}
            className="scroll-mt-24 rounded-xl border border-border bg-background p-4 text-foreground sm:p-6"
          >
            <h3 id={`portadas-${theme}-titulo`} className="mb-6 font-display text-3xl text-primary">
              {themeNames[theme]} · {index < 4 ? "Oscuro" : "Claro"}
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {coverVariants.map((variant) => (
                <article key={variant.appearance} className="bg-surface/75 p-6 sm:p-8">
                  <h4 className="text-center font-ui text-lg">{variant.label}</h4>
                  <div className="mt-6 flex flex-wrap justify-center gap-8">
                    {sampleWork?.cover && (
                      <figure className="w-40 shrink-0 sm:w-44">
                        <figcaption className="mb-4 text-center text-sm text-muted">Portada real</figcaption>
                        <BookCover
                          title={title}
                          caption={caption}
                          tone="primary"
                          image={sampleWork.cover}
                          appearance={variant.appearance}
                          eager={index === 0}
                        />
                      </figure>
                    )}
                    <figure className="w-40 shrink-0 sm:w-44">
                      <figcaption className="mb-4 text-center text-sm text-muted">Portada genérica</figcaption>
                      <BookCover
                        title={title}
                        caption={caption}
                        tone="primary"
                        image={null}
                        appearance={variant.appearance}
                      />
                    </figure>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default function StyleGuide({ loaderData: { sampleWork } }: Route.ComponentProps) {
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

      <CoverComparison sampleWork={sampleWork} />

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
          Cada vista previa reutiliza el logo, la cuadrícula de portadas y las acciones del sitio;
          solo cambia el atributo data-theme. No representa una pantalla nueva ni añade funciones.
        </p>
        <div className="space-y-10">
          {characterPalettes.map((palette) => (
            <ThemePreview key={palette.id} palette={palette} sampleWork={sampleWork} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Retratos del botón de tema</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-4">
          {themes.map((theme) => (
            <div key={theme} data-theme={theme} className="flex items-end gap-4 rounded-xl bg-header p-4">
              <span
                role="img"
                aria-label={themeNames[theme]}
                className="block size-24 rounded-full ring-2 ring-header-accent theme-portrait"
              />
              <span aria-hidden="true" className="block size-10 rounded-full ring-2 ring-header-accent theme-portrait" />
            </div>
          ))}
        </div>
      </section>

      <section id="tipografia" className="scroll-mt-24">
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
