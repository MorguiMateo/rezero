// Serializable shapes returned by the content layer to route loaders.

// A published content image, with its pixel size to reserve space while it loads.
export type ContentImage = {
  src: string;
  width: number;
  height: number;
};

export type WorkSummary = {
  slug: string;
  title: string;
  author: string;
  description: string;
  // Short tag shown above the book on the home page ("Principal", "Precuela"...).
  label: string | null;
  // Without a cover, the home page draws a generic one in the theme colors.
  cover: ContentImage | null;
  volumeCount: number;
};

export type VolumeSummary = {
  slug: string;
  title: string;
  number: number;
  // Small cover thumbnail for the volume cards; without one, a generic cover is drawn.
  cover: ContentImage | null;
};

export type ChapterSummary = {
  slug: string;
  title: string;
  number: number;
};

export type ChapterLink = {
  volumeSlug: string;
  chapterSlug: string;
  title: string;
};

export type WorkDetail = WorkSummary & { volumes: VolumeSummary[] };

export type VolumeDetail = VolumeSummary & {
  work: Pick<WorkSummary, "slug" | "title">;
  chapters: ChapterSummary[];
};

export type ChapterDetail = ChapterSummary & {
  work: Pick<WorkSummary, "slug" | "title">;
  volume: Pick<VolumeSummary, "slug" | "title">;
  html: string;
  previous: ChapterLink | null;
  next: ChapterLink | null;
};

// Manga: the pages live on a separate assets-only Worker (see AGENTS.md, section 3).

export type MangaPage = {
  src: string;
  width: number;
  height: number;
};

export type MangaWorkSummary = WorkSummary;

export type MangaVolumeSummary = VolumeSummary & { chapterCount: number };

export type MangaChapterSummary = ChapterSummary & { pageCount: number };

export type MangaWorkDetail = MangaWorkSummary & { volumes: MangaVolumeSummary[] };

export type MangaVolumeDetail = MangaVolumeSummary & {
  work: Pick<WorkSummary, "slug" | "title">;
  chapters: MangaChapterSummary[];
};

export type MangaChapterDetail = ChapterSummary & {
  work: Pick<WorkSummary, "slug" | "title">;
  volume: Pick<VolumeSummary, "slug" | "title">;
  // Origin of the Worker serving the pages, for the preconnect hint.
  imagesOrigin: string;
  pages: MangaPage[];
  previous: ChapterLink | null;
  next: ChapterLink | null;
  // First pages of the next chapter, preloaded near the end of this one.
  nextPages: string[];
};
