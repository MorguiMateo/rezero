import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

// Build-only helpers shared by the novel and manga readers of the content submodule.

export const contentRoot = path.resolve("content");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type YamlRecord = Record<string, unknown>;

export function requireString(data: YamlRecord, key: string, file: string): string {
  const value = data[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${file}: "${key}" must be a non-empty string.`);
  }
  return value;
}

export function optionalString(data: YamlRecord, key: string, file: string): string | null {
  if (data[key] === undefined) return null;
  return requireString(data, key, file);
}

export function requireNumber(data: YamlRecord, key: string, file: string): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${file}: "${key}" must be a number.`);
  }
  return value;
}

export function assertSlug(slug: string, location: string) {
  if (!slugPattern.test(slug)) {
    throw new Error(`${location}: "${slug}" is not a valid slug (lowercase letters, digits and hyphens).`);
  }
}

// Sorts by number and rejects duplicates so URLs and reading order stay unambiguous.
export function sortByNumber<T extends { number: number; slug: string }>(items: T[], location: string): T[] {
  const sorted = [...items].sort((a, b) => a.number - b.number);
  sorted.forEach((item, index) => {
    if (index > 0 && sorted[index - 1].number === item.number) {
      throw new Error(`${location}: "${sorted[index - 1].slug}" and "${item.slug}" share number ${item.number}.`);
    }
  });
  return sorted;
}

export async function readYamlFile(file: string): Promise<YamlRecord> {
  const data: unknown = parseYaml(await readFile(file, "utf8"));
  if (!data || typeof data !== "object") throw new Error(`${file}: expected a YAML object.`);
  return data as YamlRecord;
}

export async function listDirectories(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}
