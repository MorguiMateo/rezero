import { getNextTheme, themeStorageKey, type Theme } from "./theme";

const waveDuration = 750;
// Fast clicks queue up and leave at least this far apart, so each wave reads as
// its own ring; clicks beyond the queue limit are dropped.
const waveInterval = 150;
const maxQueuedWaves = 3;
const waveClassName =
  "pointer-events-none fixed left-0 top-0 z-50 overflow-hidden bg-background font-ui text-foreground";

// Each click adds a wave: an inert copy of the page in the new theme, revealed by
// a growing circle on top of the previous waves, so fast clicks stack instead of
// cancelling each other. Waves are kept oldest first.
const waves: HTMLElement[] = [];
const queuedThemes: Theme[] = [];
// Theme after every queued wave lands; <html> only switches when a wave fully covers it.
let latestTheme: Theme | undefined;
let themeButton: HTMLButtonElement | undefined;
let lastWaveStart = -Infinity;
let queueTimer: number | undefined;

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Storage can be blocked; the theme still applies to this page.
  }
}

// Components with color transitions would fade from the old theme after the wave
// already showed the new one; data-theme-landing turns them off for this switch.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.themeLanding = "";
  root.dataset.theme = theme;
  void document.body.offsetHeight;
  delete root.dataset.themeLanding;
}

function syncWaveScroll() {
  for (const wave of waves) wave.scrollTop = window.scrollY;
}

function createWave(theme: Theme) {
  const root = document.documentElement;
  const wave = document.createElement("div");
  wave.className = waveClassName;
  wave.dataset.theme = theme;
  wave.inert = true;
  wave.setAttribute("aria-hidden", "true");
  wave.style.width = `${root.clientWidth}px`;
  wave.style.height = `${root.clientHeight}px`;

  // The copy scrolls inside the wave like the page does, so the sticky header stays put.
  const page = document.createElement("div");
  page.className = document.body.className;
  for (const child of document.body.children) {
    if (child.tagName === "SCRIPT" || child.tagName === "LINK" || waves.includes(child as HTMLElement)) continue;
    page.append(child.cloneNode(true));
  }
  for (const element of page.querySelectorAll("[id]")) element.removeAttribute("id");
  // Images are already loaded; show them on the first frame instead of blinking in.
  for (const image of page.querySelectorAll("img")) {
    image.loading = "eager";
    image.decoding = "sync";
  }

  wave.append(page);
  document.body.append(wave);
  wave.scrollTop = window.scrollY;
  return wave;
}

function landWave(wave: HTMLElement, theme: Theme) {
  const index = waves.indexOf(wave);
  if (index === -1) return;
  applyTheme(theme);
  // Older waves are now hidden under the page, so they go with this one.
  for (const landed of waves.splice(0, index + 1)) landed.remove();
  if (waves.length === 0) window.removeEventListener("scroll", syncWaveScroll);
  if (waves.length === 0 && queuedThemes.length === 0) latestTheme = undefined;
}

function startWave(button: HTMLButtonElement, theme: Theme) {
  const { left, top, width, height } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  ) + 1;

  const wave = createWave(theme);
  // Keep the circle on the paint thread. Native clip-path animations can render
  // stacked waves at the wrong device scale in Chrome, then jump when they land.
  wave.style.clipPath = `circle(var(--theme-wave-radius) at ${x}px ${y}px)`;
  if (waves.length === 0) window.addEventListener("scroll", syncWaveScroll, { passive: true });
  waves.push(wave);

  const animation = wave.animate(
    {
      "--theme-wave-radius": ["0px", `${radius}px`],
    },
    {
      duration: waveDuration,
      easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      fill: "forwards",
    },
  );
  // A cancelled animation must still land, or the wave would cover the page forever.
  void animation.finished.catch(() => {}).then(() => landWave(wave, theme));
}

function launchQueuedWaves() {
  if (queueTimer !== undefined || queuedThemes.length === 0 || !themeButton) return;
  const wait = lastWaveStart + waveInterval - performance.now();
  if (wait > 0) {
    queueTimer = window.setTimeout(() => {
      queueTimer = undefined;
      launchQueuedWaves();
    }, wait);
    return;
  }
  lastWaveStart = performance.now();
  startWave(themeButton, queuedThemes.shift()!);
  launchQueuedWaves();
}

export function cycleTheme(button: HTMLButtonElement) {
  const root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const theme = getNextTheme(root.dataset.theme);
    saveTheme(theme);
    applyTheme(theme);
    return;
  }

  if (queuedThemes.length >= maxQueuedWaves) return;
  const theme = getNextTheme(latestTheme ?? root.dataset.theme);
  latestTheme = theme;
  saveTheme(theme);
  themeButton = button;
  queuedThemes.push(theme);
  launchQueuedWaves();
}
