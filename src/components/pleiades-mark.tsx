// The seven stars of the Pleiades, roughly as they sit in the sky; brighter
// stars are drawn larger. Uses currentColor so the header can tint it.
const pleiadesStars = [
  { x: 16, y: 16, r: 5 }, // Alcyone
  { x: 26, y: 16.5, r: 3.6 }, // Atlas
  { x: 26.5, y: 10.5, r: 2.4 }, // Pleione
  { x: 11.5, y: 21.5, r: 3.4 }, // Merope
  { x: 5.5, y: 14.5, r: 3.6 }, // Electra
  { x: 10.5, y: 8.5, r: 3.2 }, // Maia
  { x: 15, y: 3.5, r: 2.4 }, // Taygeta
];

// Four-pointed sparkle centered on (x, y).
function starPath({ x, y, r }: { x: number; y: number; r: number }) {
  return `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
}

export function PleiadesMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 26" aria-hidden="true" className={className} fill="currentColor">
      {pleiadesStars.map((star) => (
        <path key={`${star.x}-${star.y}`} d={starPath(star)} />
      ))}
    </svg>
  );
}
