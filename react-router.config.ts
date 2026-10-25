import type { Config } from "@react-router/dev/config";
import { rename } from "node:fs/promises";
import { join } from "node:path";
import { getMangaPaths } from "./src/lib/content/manga.server";
import { contentSectionsEnabled } from "./src/lib/sections";
import { getNovelPaths } from "./src/lib/content/novels.server";

export default {
  appDirectory: "src",
  ssr: false,
  // Every content URL must be listed: unlisted paths are not generated and return 404.
  async prerender() {
    const paths = ["/", "/estilos", "/404"];
    return [
      ...paths,
      ...(contentSectionsEnabled ? ["/novela", "/manga"] : []),
      ...(await getNovelPaths()),
      ...(await getMangaPaths()),
    ];
  },
  async buildEnd({ reactRouterConfig }) {
    const clientDirectory = join(reactRouterConfig.buildDirectory, "client");
    // Cloudflare serves this prerendered document for missing assets with HTTP 404.
    await rename(join(clientDirectory, "404", "index.html"), join(clientDirectory, "404.html"));
  },
  routeDiscovery: { mode: "initial" },
} satisfies Config;
