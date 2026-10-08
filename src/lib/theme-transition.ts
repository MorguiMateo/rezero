import { getNextTheme, themeStorageKey, type Theme } from "./theme";

let activeTransition: ViewTransition | undefined;
let pendingTheme: Theme | undefined;
let requestId = 0;

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Storage can be blocked; the theme still applies to this page.
  }
}

export async function cycleTheme(button: HTMLButtonElement) {
  const root = document.documentElement;
  const next = getNextTheme(pendingTheme ?? root.dataset.theme);
  const currentRequestId = ++requestId;
  pendingTheme = next;

  const { left, top, width, height } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;

  // Finish the previous snapshot before starting another; every click still counts.
  if (activeTransition) {
    activeTransition.skipTransition();
    await activeTransition.finished.catch(() => {});
  }
  if (currentRequestId !== requestId) return;

  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyTheme(next);
    pendingTheme = undefined;
    return;
  }

  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  ) + 1;

  root.dataset.themeTransition = "";
  const transition = document.startViewTransition(() => applyTheme(next));
  activeTransition = transition;

  try {
    await transition.ready;
    root.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 750,
        easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  } catch {
    // A skipped/unsupported animation must never prevent the theme update.
    transition.skipTransition();
  }

  await transition.finished.catch(() => {});
  if (activeTransition === transition) {
    activeTransition = undefined;
    delete root.dataset.themeTransition;
  }
  if (currentRequestId === requestId) pendingTheme = undefined;
}
