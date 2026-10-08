import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import cormorantFont from "@fontsource-variable/cormorant/files/cormorant-latin-wght-normal.woff2?url";
import jostFont from "@fontsource-variable/jost/files/jost-latin-wght-normal.woff2?url";
import { SiteHeader } from "@/components/site-header";
import { fontPreload } from "@/lib/font-preload";
import { defaultTheme, themeInitScript } from "@/lib/theme";
import type { Route } from "./+types/root";
import fontsStylesheet from "./styles/fonts.css?url";
import "./styles/globals.css";

// The header and titles use these fonts on every page; preloading them avoids a visible swap.
// fonts.css is its own <link> so the dev server never swaps out the @font-face rules on hydration.
export const links: Route.LinksFunction = () => [
  fontPreload(cormorantFont),
  fontPreload(jostFont),
  { rel: "stylesheet", href: fontsStylesheet },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The <head> script may change data-theme before hydration; that is expected.
    <html lang="es" data-theme={defaultTheme} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#120e1a" />
        <meta name="color-scheme" content="dark" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main id="contenido-principal" className="flex flex-1 flex-col">
          {children}
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
