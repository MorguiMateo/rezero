import { NavLink } from "react-router";
import { SiteLogo } from "./site-logo";
import { ThemeButton } from "./theme-button";

const navigation = [
  { to: "/", label: "Inicio", end: true },
  { to: "/novela", label: "Novela", end: false },
  { to: "/manga", label: "Manga", end: false },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-header text-header-foreground">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-30 focus:rounded-md focus:bg-button focus:px-4 focus:py-2 focus:text-button-foreground"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-6">
        <SiteLogo />
        <nav aria-label="Principal">
          <ul className="flex gap-3 font-ui text-xs uppercase tracking-[0.15em] sm:gap-8 sm:tracking-[0.25em]">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  prefetch="intent"
                  className={({ isActive }) =>
                    `group relative block border-b-2 pb-1 transition ${
                      isActive
                        ? "border-header-accent text-header-foreground"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`
                  }
                >
                  {/* The active link carries a small star above it, as in the reference site. */}
                  <span
                    aria-hidden="true"
                    className="absolute -top-3.5 left-1/2 hidden -translate-x-1/2 text-[0.6rem] text-header-accent group-aria-[current=page]:block"
                  >
                    ✦
                  </span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex justify-end">
          <ThemeButton />
        </div>
      </div>
      <div className="h-1 bg-primary-fill" aria-hidden="true" />
    </header>
  );
}
