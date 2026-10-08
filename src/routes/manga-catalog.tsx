import { ComingSoon } from "@/components/coming-soon";
import { buildMeta } from "@/lib/seo";

export function meta() {
  return buildMeta({ title: "Manga", description: "Catálogo de manga de Re:Zero en español." });
}

export default function MangaCatalog() {
  return <ComingSoon title="Manga" description="Colección ilustrada" />;
}
