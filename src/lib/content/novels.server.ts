import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  assertSlug,
  contentRoot,
  listDirectories,
  optionalString,
  readYamlFile,
  requireNumber,
  requireString,
  sortByNumber,
  type YamlRecord,
} from "./files.server";
import { resolveContentImage } from "./images.server";
import { renderMarkdown } from "./markdown.server";
import type {
  ChapterDetail,
  ChapterLink,
  ChapterSummary,
  VolumeDetail,
  VolumeSummary,
  WorkDetail,
  WorkSummary,
} from "./types";

// Build-only access to the novels in the content submodule (see AGENTS.md, section 4).

const novelsRoot = path.join(contentRoot, "novela");
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

type ChapterEntry = ChapterSummary & { file: string };
type VolumeEntry = VolumeSummary & { chapters: ChapterEntry[] };
type WorkEntry = Omit<WorkSummary, "volumeCount"> & { volumes: VolumeEntry[] };

function splitFrontmatter(source: string, file: string): { data: YamlRecord; body: string } {
  const match = frontmatterPattern.exec(source);
  if (!match) throw new Error(`${file}: missing YAML frontmatter.`);
  const data: unknown = parseYaml(match[1]);
  if (!data || typeof data !== "object") throw new Error(`${file}: frontmatter must be a YAML object.`);
  return { data: data as YamlRecord, body: source.slice(match[0].length) };
}

async function readChapters(volumeDirectory: string): Promise<ChapterEntry[]> {
  const entries = await readdir(volumeDirectory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

  const chapters = await Promise.all(
    files.map(async (entry) => {
      const file = path.join(volumeDirectory, entry.name);
      const slug = entry.name.slice(0, -".md".length);
      assertSlug(slug, file);
      const { data } = splitFrontmatter(await readFile(file, "utf8"), file);
      return { slug, file, title: requireString(data, "title", file), number: requireNumber(data, "number", file) };
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
  const directory = path.join(novelsRoot, slug);
  assertSlug(slug, directory);
  const file = path.join(directory, "work.yaml");
  const data = await readYamlFile(file);
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
    volumes: sortByNumber(volumes, directory),
  };
}

async function readCatalog(): Promise<WorkEntry[]> {
  // An empty checkout would silently build (and deploy) a site without novels.
  if (!existsSync(path.join(contentRoot, ".git"))) {
    throw new Error("content/ is not initialized. Run: git submodule update --init");
  }
  if (!existsSync(novelsRoot)) return [];

  const works = await Promise.all((await listDirectories(novelsRoot)).map(readWork));
  return works.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

let catalogPromise: Promise<WorkEntry[]> | undefined;

// Cached for production builds; re-read in dev so content edits show up without a restart.
function loadCatalog(): Promise<WorkEntry[]> {
  if (process.env.NODE_ENV !== "production") return readCatalog();
  catalogPromise ??= readCatalog();
  return catalogPromise;
}

function toWorkSummary({ volumes, ...work }: WorkEntry): WorkSummary {
  return { ...work, volumeCount: volumes.length };
}

function toVolumeSummary({ slug, title, number, cover }: VolumeEntry): VolumeSummary {
  return { slug, title, number, cover };
}

function toChapterSummary({ slug, title, number }: ChapterEntry): ChapterSummary {
  return { slug, title, number };
}

export async function getWorks(): Promise<WorkSummary[]> {
  return (await loadCatalog()).map(toWorkSummary);
}

export async function getWork(workSlug: string): Promise<WorkDetail | undefined> {
  const work = (await loadCatalog()).find((entry) => entry.slug === workSlug);
  if (!work) return undefined;
  return { ...toWorkSummary(work), volumes: work.volumes.map(toVolumeSummary) };
}

export async function getVolume(workSlug: string, volumeSlug: string): Promise<VolumeDetail | undefined> {
  const work = (await loadCatalog()).find((entry) => entry.slug === workSlug);
  const volume = work?.volumes.find((entry) => entry.slug === volumeSlug);
  if (!work || !volume) return undefined;
  return {
    ...toVolumeSummary(volume),
    work: { slug: work.slug, title: work.title },
    chapters: volume.chapters.map(toChapterSummary),
  };
}

export async function getChapter(
  workSlug: string,
  volumeSlug: string,
  chapterSlug: string,
): Promise<ChapterDetail | undefined> {
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
    if (!entry) return null;
    return { volumeSlug: entry.volume.slug, chapterSlug: entry.chapter.slug, title: entry.chapter.title };
  };

  const { body } = splitFrontmatter(await readFile(chapter.file, "utf8"), chapter.file);
  return {
    ...toChapterSummary(chapter),
    work: { slug: work.slug, title: work.title },
    volume: { slug: volume.slug, title: volume.title },
    html: await renderMarkdown(body, chapter.file),
    previous: toLink(index - 1),
    next: toLink(index + 1),
  };
}

// Every novel URL, for the prerender list in react-router.config.ts.
export async function getNovelPaths(): Promise<string[]> {
  return (await loadCatalog()).flatMap((work) => [
    `/novela/${work.slug}`,
    ...work.volumes.flatMap((volume) => [
      `/novela/${work.slug}/${volume.slug}`,
      ...volume.chapters.map((chapter) => `/novela/${work.slug}/${volume.slug}/${chapter.slug}`),
    ]),
  ]);
}
