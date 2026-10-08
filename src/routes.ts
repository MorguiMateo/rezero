import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("estilos", "routes/style-guide.tsx"),
] satisfies RouteConfig;
