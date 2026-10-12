import type { ContentImage } from "@/lib/content/types";
import { PleiadesMark } from "./pleiades-mark";

export const coverTones = ["primary", "accent", "soft", "ornament", "badge"] as const;

export type CoverTone = (typeof coverTones)[number];

// Class names are written out in full so Tailwind can detect them.
const toneTint: Record<CoverTone, string> = {
  primary: "from-primary-fill/60",
  accent: "from-accent-fill/55",
  soft: "from-primary-soft/45",
  ornament: "from-header-accent/45",
  badge: "from-badge-foreground/45",
};

function Diamond({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-1.5 rotate-45 bg-header-accent/70 ${className}`} />;
}

// Generic cover drawn with semantic tokens, so every theme recolors it.
function GenericCover({ title, tone }: { title: string; tone: CoverTone }) {
  return (
    <>
      <div aria-hidden="true" className={`absolute inset-0 bg-linear-to-br ${toneTint[tone]} via-transparent to-black/35`} />
      <div aria-hidden="true" className="absolute inset-2.5 left-5 rounded-sm border border-header-accent/50">
        <Diamond className="-top-[3.5px] -left-[3.5px]" />
        <Diamond className="-top-[3.5px] -right-[3.5px]" />
        <Diamond className="-bottom-[3.5px] -left-[3.5px]" />
        <Diamond className="-right-[3.5px] -bottom-[3.5px]" />
      </div>
      <div aria-hidden="true" className="absolute inset-4 left-6.5 border border-header-accent/20" />
      <div className="relative flex h-full flex-col items-center px-7 pt-8 pb-14 pl-8 text-center">
        <PleiadesMark className="h-8 w-auto text-header-accent drop-shadow" />
        <p className="mt-auto font-display text-lg leading-tight font-semibold text-balance sm:text-xl">{title}</p>
        <span aria-hidden="true" className="mt-2 h-px w-10 bg-header-accent/60" />
      </div>
    </>
  );
}

// A hardcover book: the work's cover (or a generic one), spine shadow and page edges.
export function BookCover({
  title,
  caption,
  tone,
  image,
}: {
  title: string;
  caption: string;
  tone: CoverTone;
  image: ContentImage | null;
}) {
  return (
    <div className="relative aspect-[2/3] w-full">
      <div
        aria-hidden="true"
        className="absolute top-2 right-0 bottom-0 left-3 rounded-r-sm border border-border bg-surface bg-[repeating-linear-gradient(to_right,transparent_0_2px,var(--color-border)_2px_3px)]"
      />
      <div className="absolute inset-0 right-1.5 bottom-1.5 overflow-hidden rounded-l-sm rounded-r-md bg-header text-header-foreground shadow-xl shadow-black/40">
        {image ? (
          <img
            src={image.src}
            width={image.width}
            height={image.height}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <GenericCover title={title} tone={tone} />
        )}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-3 bg-linear-to-r from-black/50 to-transparent" />
        <div aria-hidden="true" className="absolute inset-y-0 left-3 w-px bg-white/15" />
        <p
          className={`absolute inset-x-0 bottom-0 pt-8 pb-4 pl-3 text-center font-mono text-[0.6rem] tracking-[0.2em] uppercase ${
            image ? "bg-linear-to-t from-black/85 to-transparent text-white/90" : "text-header-foreground/75"
          }`}
        >
          {caption}
        </p>
      </div>
    </div>
  );
}
