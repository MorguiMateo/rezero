// Character themes, in the order the header button cycles through them: dark
// and light alternate, and each group goes from most to least protagonist.
export const themes = ["satella", "emilia", "beatrice", "subaru", "echidna", "rem", "shaula", "ram"] as const;

export type Theme = (typeof themes)[number];

export const defaultTheme: Theme = "satella";

// The theme is the only value this site stores in localStorage (see AGENTS.md).
export const themeStorageKey = "theme";

export const themeNames: Record<Theme, string> = {
  satella: "Satella",
  emilia: "Emilia",
  shaula: "Shaula",
  beatrice: "Beatrice",
  echidna: "Echidna",
  rem: "Rem",
  ram: "Ram",
  subaru: "Subaru",
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value);
}

export function getNextTheme(current: unknown): Theme {
  const index = isTheme(current) ? themes.indexOf(current) : 0;
  return themes[(index + 1) % themes.length];
}

// Runs in <head> before first paint so a saved theme never flashes Satella first.
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  themeStorageKey,
)});if(${JSON.stringify(themes)}.indexOf(t)>-1)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
