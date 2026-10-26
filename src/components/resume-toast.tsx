import { Button } from "@/components/button";
import { ReadingProgressSkeleton } from "@/components/reading-progress-skeleton";

export function ResumeToastSkeleton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <ReadingProgressSkeleton shape="pill" />
    </div>
  );
}

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
        <Button
          size="sm"
          shape="pill"
          onClick={onResume}
        >
          Continuar donde lo dejaste ({percent} %)
        </Button>
        <Button
          variant="ghost"
          size="icon"
          shape="pill"
          onClick={onDismiss}
          aria-label="Empezar desde el principio"
          title="Empezar desde el principio"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
