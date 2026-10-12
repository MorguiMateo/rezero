import { getThemePortrait, themeNames, themes, type Theme } from "@/lib/theme";
import { cycleTheme } from "@/lib/theme-transition";

// Every portrait is in the prerendered HTML; CSS shows the one matching the
// data-theme set by the <head> script, so the button is right before hydration.
// Hidden images are lazy, so only the visible one is downloaded.
const visibleIn: Record<Theme, string> = {
  satella:
    "theme-emilia:hidden theme-beatrice:hidden theme-subaru:hidden theme-echidna:hidden theme-rem:hidden theme-shaula:hidden theme-ram:hidden",
  emilia: "hidden theme-emilia:block",
  shaula: "hidden theme-shaula:block",
  beatrice: "hidden theme-beatrice:block",
  echidna: "hidden theme-echidna:block",
  rem: "hidden theme-rem:block",
  ram: "hidden theme-ram:block",
  subaru: "hidden theme-subaru:block",
};

export function ThemeButton() {
  return (
    <button
      type="button"
      onClick={(event) => void cycleTheme(event.currentTarget)}
      aria-label="Cambiar personaje"
      title="Cambiar personaje"
      className="block size-10 shrink-0 cursor-pointer select-none overflow-hidden rounded-full bg-transparent ring-2 ring-header-accent transition hover:scale-105 focus-visible:outline-header-accent"
    >
      {themes.map((theme) => (
        <img
          key={theme}
          src={getThemePortrait(theme)}
          alt={`Personaje actual: ${themeNames[theme]}`}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`size-full object-cover ${visibleIn[theme]}`}
        />
      ))}
    </button>
  );
}
