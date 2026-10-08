// <link rel="preload"> for a self-hosted font file; the URL must match the one in fonts.css.
export function fontPreload(href: string) {
  return { rel: "preload", href, as: "font", type: "font/woff2", crossOrigin: "anonymous" } as const;
}
