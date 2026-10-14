// Offers to jump back to where the reader left a chapter. The page starts at the
// top, so nothing moves unless they ask.
export function ResumeToast({
  percent,
  onResume,
  onDismiss,
}: {
  percent: number;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface p-1 font-ui text-sm text-foreground shadow-lg"
      >
        <button
          type="button"
          onClick={onResume}
          className="cursor-pointer rounded-full bg-button px-4 py-2 text-button-foreground transition-colors hover:bg-button-hover"
        >
          Continuar donde lo dejaste ({percent} %)
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Empezar desde el principio"
          title="Empezar desde el principio"
          className="cursor-pointer rounded-full px-3 py-2 text-muted transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
