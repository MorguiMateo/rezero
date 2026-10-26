import { Link } from "react-router";
import type { ContentImage } from "@/lib/content/types";
import { BookCover, coverTones } from "./book-cover";
import { CoverReveal } from "./cover-reveal";

export type CoverGridItem = {
  key: string;
  to: string;
  title: string;
  // Short label printed on the cover ("Volumen 3", "11 capítulos").
  caption: string;
  image: ContentImage | null;
};

// Book-shaped cards with the title underneath, for volume and series listings.
export function CoverGrid({ items, label }: { items: CoverGridItem[]; label: string }) {
  // Reset the reveal when client navigation reuses this grid for a different work.
  const revealKey = items.map((item) => `${item.key}:${item.image?.src ?? ""}`).join("|");

  return (
    <CoverReveal key={revealKey}>
      <ol aria-label={label} className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <li key={item.key}>
            <Link to={item.to} prefetch="intent" className="group block">
              <div className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105">
                <BookCover
                  title={item.title}
                  caption={item.caption}
                  tone={coverTones[index % coverTones.length]}
                  image={item.image}
                  appearance="outlined"
                  // A synchronized grid must load offscreen covers without waiting for scrolling.
                  eager
                />
              </div>
              <p className="mt-3 text-center font-ui text-sm text-balance text-foreground group-hover:text-primary">
                {item.title}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </CoverReveal>
  );
}
