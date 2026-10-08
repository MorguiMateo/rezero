import { ComingSoon } from "@/components/coming-soon";
import { buildMeta } from "@/lib/seo";

export function meta() {
  return buildMeta({ title: "Novela", description: "Catálogo de novelas ligeras de Re:Zero en español." });
}

export default function NovelCatalog() {
  return <ComingSoon title="Novela" description="Colección literaria" />;
}
