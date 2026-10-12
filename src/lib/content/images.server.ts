import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentImagesDirectory, contentImagesUrlPath } from "./image-paths";
import type { ContentImage } from "./types";

type ImageSize = { width: number; height: number };

const imageManifestFile = path.resolve("content", "images.json");

let imageManifestPromise: Promise<Record<string, ImageSize>> | undefined;

// The manifest is written by the image conversion script: image path -> pixel size.
function loadImageManifest() {
  imageManifestPromise ??= readFile(imageManifestFile, "utf8").then(
    (source) => JSON.parse(source) as Record<string, ImageSize>,
    () => ({}),
  );
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

  const size = (await loadImageManifest())[imagePath];
  if (!size) throw new Error(`${sourceFile}: image "${imagePath}" is missing from content/images.json.`);

  return { src: `${contentImagesUrlPath}/${imagePath}`, width: size.width, height: size.height };
}
