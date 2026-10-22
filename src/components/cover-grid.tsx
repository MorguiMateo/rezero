import { Link } from "react-router";
import type { ContentImage } from "@/lib/content/types";
import { BookCover, coverTones } from "./book-cover";

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
  return (
    <ol aria-label={label} className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item, index) => (
        <li key={item.key}>
          <Link to={item.to} prefetch="intent" className="group block focus-visible:outline-none">
            <div className="motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105 group-focus-visible:scale-105">
              <BookCover
                title={item.title}
                caption={item.caption}
                tone={coverTones[index % coverTones.length]}
                image={item.image}
                appearance="outlined"
                // The first row is visible on load; the rest load as the reader scrolls.
                eager={index < 5}
              />
            </div>
            <p className="mt-3 text-center font-ui text-sm text-balance text-foreground group-hover:text-primary">
              {item.title}
            </p>
          </Link>
        </li>
      ))}
    </ol>
  );
}
