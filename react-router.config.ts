import type { Config } from "@react-router/dev/config";
import { getNovelPaths } from "./src/lib/content/novels.server";

export default {
  appDirectory: "src",
  ssr: false,
  // Every content URL must be listed: unlisted paths are not generated and return 404.
  async prerender() {
    return ["/", "/estilos", "/novela", "/manga", ...(await getNovelPaths())];
  },
  routeDiscovery: { mode: "initial" },
} satisfies Config;
