import { createReadStream } from "node:fs";
import { cp, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { contentImagesDirectory, contentImagesUrlPath } from "./src/lib/content/image-paths.ts";

const imageContentTypes: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// React Router resolves prerender paths when the dev server starts. Content is
// read with fs, outside Vite's module graph, so imports must refresh that list.
function contentReload(): Plugin {
  return {
    name: "content-reload",
    configureServer(server) {
      const novelsDirectory = path.resolve("content", "novela");
      const mangaDirectory = path.resolve("content", "manga");
      const imageManifestFile = path.resolve("content", "images.json");
      let restartTimer: ReturnType<typeof setTimeout> | undefined;

      function onContentChange(event: string, file: string) {
        if (!["add", "change", "unlink"].includes(event)) return;
        const absoluteFile = path.resolve(file);
        const isNovelData =
          absoluteFile.startsWith(novelsDirectory + path.sep) && /\.(md|yaml)$/.test(absoluteFile);
        const isMangaData = absoluteFile.startsWith(mangaDirectory + path.sep) && absoluteFile.endsWith(".yaml");
        if (!isNovelData && !isMangaData && absoluteFile !== imageManifestFile) return;

        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          server.config.logger.info("Content changed; refreshing prerender routes.");
          void server.restart().catch((error: unknown) => {
            server.config.logger.error(`Content reload failed: ${String(error)}`);
          });
        }, 300);
      }

      server.watcher.add([novelsDirectory, mangaDirectory, imageManifestFile]);
      server.watcher.on("all", onContentChange);
      server.httpServer?.once("close", () => {
        clearTimeout(restartTimer);
        server.watcher.off("all", onContentChange);
      });
    },
  };
}

// Publishes content/images/ under /img: served from disk in dev, copied into
// build/client so it ships as static assets with the site.
function contentImages(): Plugin {
  return {
    name: "content-images",
    configureServer(server) {
      server.middlewares.use(contentImagesUrlPath, async (request, response, next) => {
        const relativePath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
        const file = path.join(contentImagesDirectory, relativePath);
        const isFile =
          file.startsWith(contentImagesDirectory + path.sep) && (await stat(file).catch(() => null))?.isFile();
        if (!isFile) return next();
        response.setHeader("Content-Type", imageContentTypes[path.extname(file)] ?? "application/octet-stream");
        createReadStream(file).pipe(response);
      });
    },
    async writeBundle() {
      if (this.environment.name !== "client") return;
      const outputDirectory = path.join(this.environment.config.build.outDir, contentImagesUrlPath);
      await cp(contentImagesDirectory, outputDirectory, { recursive: true }).catch((error: NodeJS.ErrnoException) => {
        // A content checkout without images is valid; anything else should fail the build.
        if (error.code !== "ENOENT") throw error;
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), contentImages(), contentReload()],
  build: {
    // Theme portraits (about 24 KB in total) go inside the stylesheet so the
    // theme button never shows an empty circle while its image loads.
    assetsInlineLimit: (file) => (file.includes("/src/assets/characters/") ? true : undefined),
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
