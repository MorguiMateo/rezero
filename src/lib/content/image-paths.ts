import path from "node:path";

// Novel images (covers and illustrations) live in the content submodule and are
// published with the site under /img. Shared by images.server.ts and vite.config.ts,
// so this module must not import other project files.
export const contentImagesDirectory = path.resolve("content", "images");
export const contentImagesUrlPath = "/img";
