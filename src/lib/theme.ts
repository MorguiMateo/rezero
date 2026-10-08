// Character themes, in the order the header button cycles through them.
export const themes = ["emilia", "rem", "ram", "subaru"] as const;

export type Theme = (typeof themes)[number];

export const defaultTheme: Theme = "emilia";

// The theme is the only value this site stores in localStorage (see AGENTS.md).
export const themeStorageKey = "theme";

export const themeNames: Record<Theme, string> = {
  emilia: "Emilia",
  rem: "Rem",
  ram: "Ram",
  subaru: "Subaru",
};

// Character icons for the theme button: 96×96 WebP in public/characters/.
export function getThemePortrait(theme: Theme) {
  return `/characters/${theme}.webp`;
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value);
}

export function getNextTheme(current: unknown): Theme {
  const index = isTheme(current) ? themes.indexOf(current) : 0;
  return themes[(index + 1) % themes.length];
}

// Runs in <head> before first paint so a saved theme never flashes Emilia first.
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  themeStorageKey,
)});if(${JSON.stringify(themes)}.indexOf(t)>-1)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
