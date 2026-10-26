export function ReadingProgressSkeleton({
  appearance = "primary",
  shape = "rounded",
}: {
  appearance?: "primary" | "outline";
  shape?: "rounded" | "pill";
}) {
  return (
    <div
      role="status"
      aria-label="Cargando progreso de lectura"
      aria-busy="true"
      data-reading-progress-skeleton=""
      className={`flex h-10 w-full max-w-md items-center gap-3 px-5 motion-safe:animate-pulse ${
        appearance === "outline" ? "border border-border bg-surface/80 text-foreground" : "bg-button text-button-foreground"
      } ${shape === "pill" ? "rounded-full" : "rounded-md"}`}
    >
      <span aria-hidden="true" className="h-3 w-2/3 rounded bg-current opacity-20" />
      <span aria-hidden="true" className="h-3 w-1/6 rounded bg-current opacity-20" />
    </div>
  );
}
