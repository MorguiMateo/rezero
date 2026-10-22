import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  assertSlug,
  contentRoot,
  listDirectories,
  optionalString,
  readYamlFile,
  requireNumber,
  requireString,
  sortByNumber,
} from "./files.server";
import { resolveContentImage } from "./images.server";
import type {
  ChapterLink,
  MangaChapterDetail,
  MangaChapterSummary,
  MangaPage,
  MangaVolumeDetail,
  MangaVolumeSummary,
  MangaWorkDetail,
  MangaWorkSummary,
} from "./types";

// Build-only access to the manga in the content submodule. The repository only holds
// metadata and page sizes; the page images are served by the Worker named in "images".
//
//   content/manga/<work>/work.yaml              title, author, description, label?, cover?, images
//   content/manga/<work>/<volume>/volume.yaml   title, number, cover?
//   content/manga/<work>/<volume>/<chapter>.yaml  title, number, pages: [[width, height], ...]
//
// Page N of a chapter is <images>/<work>/<volume>/<chapter>/<NNN>.webp.

const mangaRoot = path.join(contentRoot, "manga");

type ChapterEntry = MangaChapterSummary & { pages: [number, number][] };
type VolumeEntry = Omit<MangaVolumeSummary, "chapterCount"> & { chapters: ChapterEntry[] };
type WorkEntry = Omit<MangaWorkSummary, "volumeCount"> & { images: string; volumes: VolumeEntry[] };

function requirePages(data: Record<string, unknown>, file: string): [number, number][] {
  const pages = data.pages;
  const valid =
    Array.isArray(pages) &&
    pages.length > 0 &&
    pages.every(
      (page) =>
        Array.isArray(page) &&
        page.length === 2 &&
        page.every((size) => typeof size === "number" && Number.isInteger(size) && size > 0),
    );
  if (!valid) throw new Error(`${file}: "pages" must be a non-empty list of [width, height] pairs.`);
  return pages as [number, number][];
}

async function readChapters(volumeDirectory: string): Promise<ChapterEntry[]> {
  const entries = await readdir(volumeDirectory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".yaml") && entry.name !== "volume.yaml");
  const chapters = await Promise.all(
    files.map(async (entry) => {
      const file = path.join(volumeDirectory, entry.name);
      const slug = entry.name.slice(0, -".yaml".length);
      assertSlug(slug, file);
      const data = await readYamlFile(file);
      const pages = requirePages(data, file);
      return {
        slug,
        title: requireString(data, "title", file),
        number: requireNumber(data, "number", file),
        pageCount: pages.length,
        pages,
      };
    }),
  );
  return sortByNumber(chapters, volumeDirectory);
}

async function readVolume(workDirectory: string, slug: string): Promise<VolumeEntry> {
  const directory = path.join(workDirectory, slug);
  assertSlug(slug, directory);
  const file = path.join(directory, "volume.yaml");
  const data = await readYamlFile(file);
  const coverPath = optionalString(data, "cover", file);
  return {
    slug,
    title: requireString(data, "title", file),
    number: requireNumber(data, "number", file),
    cover: coverPath ? await resolveContentImage(coverPath, file) : null,
    chapters: await readChapters(directory),
  };
}

async function readWork(slug: string): Promise<WorkEntry> {
  const directory = path.join(mangaRoot, slug);
  assertSlug(slug, directory);
  const file = path.join(directory, "work.yaml");
  const data = await readYamlFile(file);
  const images = requireString(data, "images", file);
  if (!/^https:\/\/[^/]+$/.test(images)) throw new Error(`${file}: "images" must be an https origin without a path.`);
  const volumes = await Promise.all(
    (await listDirectories(directory)).map((volumeSlug) => readVolume(directory, volumeSlug)),
  );
  const coverPath = optionalString(data, "cover", file);
  return {
    slug,
    title: requireString(data, "title", file),
    author: requireString(data, "author", file),
    description: requireString(data, "description", file),
    label: optionalString(data, "label", file),
    cover: coverPath ? await resolveContentImage(coverPath, file) : null,
    images,
    volumes: sortByNumber(volumes, directory),
  };
}

async function readCatalog(): Promise<WorkEntry[]> {
  if (!existsSync(mangaRoot)) return [];
  const works = await Promise.all((await listDirectories(mangaRoot)).map(readWork));
  return works.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

let catalogPromise: Promise<WorkEntry[]> | undefined;

// Cached for production builds; re-read in dev so content edits show up without a restart.
function loadCatalog(): Promise<WorkEntry[]> {
  if (process.env.NODE_ENV !== "production") return readCatalog();
  catalogPromise ??= readCatalog();
  return catalogPromise;
}

function toWorkSummary({ slug, title, author, description, label, cover, volumes }: WorkEntry): MangaWorkSummary {
  return { slug, title, author, description, label, cover, volumeCount: volumes.length };
}

function toVolumeSummary({ slug, title, number, cover, chapters }: VolumeEntry): MangaVolumeSummary {
  return { slug, title, number, cover, chapterCount: chapters.length };
}

function toChapterSummary({ slug, title, number, pageCount }: ChapterEntry): MangaChapterSummary {
  return { slug, title, number, pageCount };
}

export async function getMangaWorks(): Promise<MangaWorkSummary[]> {
  return (await loadCatalog()).map(toWorkSummary);
}

export async function getMangaWork(workSlug: string): Promise<MangaWorkDetail | undefined> {
  const work = (await loadCatalog()).find((entry) => entry.slug === workSlug);
  if (!work) return undefined;
  return { ...toWorkSummary(work), volumes: work.volumes.map(toVolumeSummary) };
}

export async function getMangaVolume(workSlug: string, volumeSlug: string): Promise<MangaVolumeDetail | undefined> {
  const work = (await loadCatalog()).find((entry) => entry.slug === workSlug);
  const volume = work?.volumes.find((entry) => entry.slug === volumeSlug);
  if (!work || !volume) return undefined;
  return {
    ...toVolumeSummary(volume),
    work: { slug: work.slug, title: work.title },
    chapters: volume.chapters.map(toChapterSummary),
  };
}

export async function getMangaChapter(
  workSlug: string,
  volumeSlug: string,
  chapterSlug: string,
): Promise<MangaChapterDetail | undefined> {
  const work = (await loadCatalog()).find((entry) => entry.slug === workSlug);
  if (!work) return undefined;
  // Reading order runs across volumes, so previous/next can cross a volume boundary.
  const readingOrder = work.volumes.flatMap((volume) => volume.chapters.map((chapter) => ({ volume, chapter })));
  const index = readingOrder.findIndex(
    ({ volume, chapter }) => volume.slug === volumeSlug && chapter.slug === chapterSlug,
  );
  if (index === -1) return undefined;
  const { volume, chapter } = readingOrder[index];
  const toLink = (position: number): ChapterLink | null => {
    const entry = readingOrder[position];
    return entry ? { volumeSlug: entry.volume.slug, chapterSlug: entry.chapter.slug, title: entry.chapter.title } : null;
  };
  const folder = `${work.images}/${work.slug}/${volume.slug}/${chapter.slug}`;
  const pages: MangaPage[] = chapter.pages.map(([width, height], page) => ({
    src: `${folder}/${String(page + 1).padStart(3, "0")}.webp`,
    width,
    height,
  }));
  return {
    slug: chapter.slug,
    title: chapter.title,
    number: chapter.number,
    work: { slug: work.slug, title: work.title },
    volume: { slug: volume.slug, title: volume.title },
    pages,
    previous: toLink(index - 1),
    next: toLink(index + 1),
  };
}

// Every manga URL, for the prerender list in react-router.config.ts.
export async function getMangaPaths(): Promise<string[]> {
  const works = await loadCatalog();
  return works.flatMap((work) => [
    `/manga/${work.slug}`,
    ...work.volumes.flatMap((volume) => [
      `/manga/${work.slug}/${volume.slug}`,
      ...volume.chapters.map((chapter) => `/manga/${work.slug}/${volume.slug}/${chapter.slug}`),
    ]),
  ]);
}
