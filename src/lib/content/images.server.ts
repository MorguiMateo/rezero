import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentImagesDirectory, contentImagesUrlPath } from "./image-paths";
import type { ContentImage } from "./types";

type ImageSize = { width: number; height: number };

const imageManifestFile = path.resolve("content", "images.json");

let imageManifestPromise: Promise<Record<string, ImageSize>> | undefined;

async function readImageManifest(): Promise<Record<string, ImageSize>> {
  let source: string;
  try {
    source = await readFile(imageManifestFile, "utf8");
  } catch (error) {
    // Content without images does not need a manifest; other I/O failures must fail the build.
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return {};
    throw new Error(`${imageManifestFile}: could not read image manifest.`, { cause: error });
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(source);
  } catch (error) {
    throw new Error(`${imageManifestFile}: invalid JSON in image manifest.`, { cause: error });
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${imageManifestFile}: expected an object mapping image paths to dimensions.`);
  }
  for (const [imagePath, size] of Object.entries(manifest)) {
    if (
      !size ||
      typeof size !== "object" ||
      Array.isArray(size) ||
      typeof size.width !== "number" ||
      !Number.isInteger(size.width) ||
      size.width <= 0 ||
      typeof size.height !== "number" ||
      !Number.isInteger(size.height) ||
      size.height <= 0
    ) {
      throw new Error(`${imageManifestFile}: image "${imagePath}" must have positive integer "width" and "height".`);
    }
  }
  return manifest as Record<string, ImageSize>;
}

function loadImageManifest() {
  imageManifestPromise ??= readImageManifest();
  return imageManifestPromise;
}

// Turns an image path from content/ (relative to content/images/) into its public
// URL and size, so pages can reserve the image's space and avoid layout shift.
export async function resolveContentImage(imagePath: string, sourceFile: string): Promise<ContentImage> {
  if (/^[a-z]+:\/\//i.test(imagePath)) {
    throw new Error(`${sourceFile}: external image "${imagePath}"; content images must live in content/images/.`);
  }

  const file = path.resolve(contentImagesDirectory, imagePath);
  if (!file.startsWith(contentImagesDirectory + path.sep) || !existsSync(file)) {
    throw new Error(`${sourceFile}: image "${imagePath}" does not exist in content/images/.`);
  }

  const manifest = await loadImageManifest();
  const size = Object.hasOwn(manifest, imagePath) ? manifest[imagePath] : undefined;
  if (!size) throw new Error(`${sourceFile}: image "${imagePath}" is missing from content/images.json.`);

  return { src: `${contentImagesUrlPath}/${imagePath}`, width: size.width, height: size.height };
}
