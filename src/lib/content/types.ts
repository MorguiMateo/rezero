// Serializable shapes returned by the content layer to route loaders.

export type WorkSummary = {
  slug: string;
  title: string;
  author: string;
  description: string;
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
