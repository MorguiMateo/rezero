export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">{description}</p>
      <h1 className="font-display text-5xl font-medium text-foreground sm:text-6xl">{title}</h1>
      <p className="font-ui text-sm uppercase tracking-[0.3em] text-primary">Próximamente</p>
    </div>
  );
}
