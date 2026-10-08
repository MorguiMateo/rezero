import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./styles/globals.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#120e1a" />
        <meta name="color-scheme" content="dark" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
