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
