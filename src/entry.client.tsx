import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { cycleTheme } from "@/lib/theme-transition";

if (document.body.hasAttribute("data-static-not-found")) {
  // A generic 404 has no data for a parameterized route that might match this URL.
  // Keep its native navigation and enhance only the existing theme control.
  const themeButton = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  themeButton?.addEventListener("click", () => cycleTheme(themeButton));
} else {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
}
