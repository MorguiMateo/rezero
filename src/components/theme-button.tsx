import { themeNames, themes, type Theme } from "@/lib/theme";
import { cycleTheme } from "@/lib/theme-transition";

// The portrait is a CSS background (theme-portrait) inlined into the stylesheet,
// so it shows on first paint and changes instantly with data-theme. Each name is
// in the prerendered HTML; CSS keeps only the current one for screen readers.
const visibleIn: Record<Theme, string> = {
  satella:
    "theme-emilia:hidden theme-beatrice:hidden theme-subaru:hidden theme-echidna:hidden theme-rem:hidden theme-shaula:hidden theme-ram:hidden",
  emilia: "hidden theme-emilia:inline",
  shaula: "hidden theme-shaula:inline",
  beatrice: "hidden theme-beatrice:inline",
  echidna: "hidden theme-echidna:inline",
  rem: "hidden theme-rem:inline",
  ram: "hidden theme-ram:inline",
  subaru: "hidden theme-subaru:inline",
};

export function ThemeButton() {
  return (
    <button
      type="button"
      onClick={(event) => cycleTheme(event.currentTarget)}
      title="Cambiar personaje"
      className="block size-10 shrink-0 cursor-pointer touch-manipulation select-none overflow-hidden rounded-full bg-transparent ring-2 ring-header-accent transition hover:scale-105 focus-visible:outline-header-accent"
    >
      <span aria-hidden="true" className="block size-full theme-portrait" />
      <span className="sr-only">Cambiar personaje. Personaje actual: </span>
      {themes.map((theme) => (
        <span key={theme} className={`sr-only ${visibleIn[theme]}`}>
          {themeNames[theme]}
        </span>
      ))}
    </button>
  );
}
