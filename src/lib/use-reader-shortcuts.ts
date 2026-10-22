import { useEffect } from "react";
import { useNavigate } from "react-router";

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

// ← and → change chapter, Esc goes back to the volume index.
export function useReaderShortcuts(paths: { previous: string | null; next: string | null; index: string }) {
  const navigate = useNavigate();
  const { previous, next, index } = paths;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditable(event.target)) return;
      const target = { ArrowLeft: previous, ArrowRight: next, Escape: index }[event.key];
      if (!target) return;
      event.preventDefault();
      navigate(target);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, previous, next, index]);
}
