import type { ReactNode } from "react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import jetbrainsMonoFont from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url";
import literataFont from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?url";
import { BookCover, coverTones } from "@/components/book-cover";
import { LatestReading } from "@/components/continue-reading";
import { PleiadesMark } from "@/components/pleiades-mark";
import { fontPreload } from "@/lib/font-preload";
import { contentSectionsEnabled } from "@/lib/sections";
import { getMangaWorks } from "@/lib/content/manga.server";
import { getWorks } from "@/lib/content/novels.server";
import type { ContentImage } from "@/lib/content/types";
import type { Route } from "./+types/home";

export const meta: MetaFunction = () => [
  { title: "Biblioteca de Pléyades · Re:Zero en español" },
  { name: "description", content: "Lee la novela ligera y el manga de Re:Zero en español." },
];

// The intro paragraph (Literata) and the small labels (JetBrains Mono) are above
// the fold, so their fonts load with the page instead of swapping in later.
export const links: Route.LinksFunction = () => [fontPreload(literataFont), fontPreload(jetbrainsMonoFont)];

export async function loader() {
  if (!contentSectionsEnabled) return { works: [], mangaWorks: [] };
  return { works: await getWorks(), mangaWorks: await getMangaWorks() };
}

function OrnamentDivider() {
  return (
    <div aria-hidden="true" className="mx-auto flex w-full max-w-md items-center gap-4 text-primary">
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-primary/60" />
      <span className="size-1.5 rotate-45 bg-primary/70" />
      <PleiadesMark className="h-5 w-auto" />
      <span className="size-1.5 rotate-45 bg-primary/70" />
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-primary/60" />
    </div>
  );
}

function CornerStar({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={`absolute text-[0.7rem] text-primary ${className}`}>
      ✦
    </span>
  );
}

// Collection panel with a double frame and a star on each corner.
function FramedSection({
  eyebrow,
  title,
  href,
  children,
}: {
  eyebrow: string;
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section className="relative mx-auto w-full max-w-6xl border border-border bg-surface/75 p-1.5 backdrop-blur-sm sm:p-2">
      <div className="relative border border-border/70 pt-8 pb-4 sm:pt-10">
        <CornerStar className="-top-2 -left-1.5" />
        <CornerStar className="-top-2 -right-1.5" />
        <CornerStar className="-bottom-2 -left-1.5" />
        <CornerStar className="-right-1.5 -bottom-2" />
        <header className="relative mx-6 mb-8 border-b border-border pb-5 text-center sm:mx-10">
          <p className="font-mono text-[0.7rem] tracking-[0.35em] text-primary uppercase">{eyebrow}</p>
          <h2 className="mt-1 font-display text-5xl font-medium tracking-wide text-foreground sm:text-6xl">{title}</h2>
          <Link
            to={href}
            prefetch="intent"
            className="mt-3 inline-block font-ui text-xs tracking-[0.25em] text-secondary-foreground uppercase hover:text-primary sm:absolute sm:right-0 sm:bottom-6 sm:mt-0"
          >
            Ver todo →
          </Link>
        </header>
        {children}
      </div>
    </section>
  );
}

type ShelfBook = {
  slug: string;
  href: string;
  label: string | null;
  title: string;
  caption: string;
  image: ContentImage | null;
};

// A row of books. With few works they wrap onto another row instead of scrolling sideways.
function Shelf({ label, books }: { label: string; books: ShelfBook[] }) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 justify-items-center gap-x-6 gap-y-8 px-6 pt-2 pb-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-8"
    >
      {books.map((book, index) => (
        <li key={book.slug} className="w-full max-w-40 sm:w-44 sm:max-w-none">
          <p className="mb-3 h-4 text-center font-mono text-[0.65rem] tracking-[0.25em] text-muted uppercase">
            {book.label}
          </p>
          <Link
            to={book.href}
            prefetch="intent"
            className="block motion-safe:transition-transform motion-safe:duration-300 hover:scale-105 focus-visible:scale-105"
          >
            <BookCover
              title={book.title}
              caption={book.caption}
              tone={coverTones[index % coverTones.length]}
              image={book.image}
              appearance="outlined"
              eager
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home({ loaderData: { works, mangaWorks } }: Route.ComponentProps) {
  return (
    <div className="relative isolate flex flex-col gap-14 pb-20 sm:gap-20">
      {/* Night sky: two soft glows and a sparse field of stars. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,color-mix(in_oklab,var(--theme-primary-fill)_28%,transparent),transparent),radial-gradient(ellipse_40%_35%_at_85%_30%,color-mix(in_oklab,var(--theme-accent-fill)_16%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(var(--theme-foreground)_1px,transparent_1.5px)] bg-size-[46px_46px] opacity-15 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <section className="flex flex-col items-center gap-6 px-6 pt-16 text-center sm:pt-24">
        <p className="font-mono text-[0.7rem] tracking-[0.4em] text-muted uppercase">Re:Zero en español</p>
        <h1 className="font-display text-5xl leading-none font-medium tracking-[0.04em] uppercase title-gradient-text sm:text-7xl lg:text-8xl">
          Biblioteca de Pléyades
        </h1>
        <OrnamentDivider />
        <p className="max-w-xl font-reading text-base text-muted sm:text-lg">
          La novela ligera y el manga de Re:Zero, ordenados como en los estantes de una biblioteca.
        </p>
        {/* Height reserved so the link appearing after hydration does not push the shelves down. */}
        {contentSectionsEnabled && (
          <div className="flex min-h-10 w-full max-w-xl justify-center">
            <LatestReading works={works} />
          </div>
        )}
      </section>

      {contentSectionsEnabled && (
        <div className="flex flex-col gap-14 px-3 sm:gap-20 sm:px-6">
          <FramedSection eyebrow="Colección literaria" title="Novelas" href="/novela">
            <Shelf
              label="Novelas"
              books={works.map((work) => ({
                slug: work.slug,
                href: `/novela/${work.slug}`,
                label: work.label,
                title: work.title,
                caption: `${work.volumeCount} ${work.volumeCount === 1 ? "volumen" : "volúmenes"}`,
                image: work.cover,
              }))}
            />
          </FramedSection>

          <FramedSection eyebrow="Colección ilustrada" title="Mangas" href="/manga">
            <Shelf
              label="Mangas"
              books={mangaWorks.map((work) => ({
                slug: work.slug,
                href: `/manga/${work.slug}`,
                label: work.label,
                title: work.title,
                caption: `${work.volumeCount} ${work.volumeCount === 1 ? "serie" : "series"}`,
                image: work.cover,
              }))}
            />
          </FramedSection>
        </div>
      )}
    </div>
  );
}
