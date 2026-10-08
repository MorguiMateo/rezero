export const siteName = "Biblioteca de Pléyades";

// Shared title, description and Open Graph tags. Canonical URLs wait for the site domain.
export function buildMeta({ title, description }: { title: string; description: string }) {
  const fullTitle = `${title} · ${siteName}`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "es_ES" },
  ];
}
