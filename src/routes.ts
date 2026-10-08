import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("estilos", "routes/style-guide.tsx"),
  route("novela", "routes/novel-catalog.tsx"),
  route("manga", "routes/manga-catalog.tsx"),
  route("novela/:work", "routes/novel-work.tsx"),
  route("novela/:work/:volume", "routes/novel-volume.tsx"),
  route("novela/:work/:volume/:chapter", "routes/novel-chapter.tsx"),
] satisfies RouteConfig;
