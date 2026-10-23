import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { contentSectionsEnabled } from "./lib/sections";

// With ssr:false, routes that have a loader must be prerendered, so hidden sections drop their routes entirely.
const contentRoutes: RouteConfig = contentSectionsEnabled
  ? [
      route("novela", "routes/novel-catalog.tsx"),
      route("manga", "routes/manga-catalog.tsx"),
      route("novela/:work", "routes/novel-work.tsx"),
      route("novela/:work/:volume", "routes/novel-volume.tsx"),
      route("novela/:work/:volume/:chapter", "routes/novel-chapter.tsx"),
      route("manga/:work", "routes/manga-work.tsx"),
      route("manga/:work/:volume", "routes/manga-volume.tsx"),
      route("manga/:work/:volume/:chapter", "routes/manga-chapter.tsx"),
    ]
  : [];

export default [
  index("routes/home.tsx"),
  route("estilos", "routes/style-guide.tsx"),
  ...contentRoutes,
] satisfies RouteConfig;
