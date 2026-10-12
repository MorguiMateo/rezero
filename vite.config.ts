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
  plugins: [tailwindcss(), reactRouter(), contentImages()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
