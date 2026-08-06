"use client";

export function ScoreMeter({
  label,
  value,
  accent = "var(--accent)",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-mono tabular-nums text-[var(--foreground)]">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: accent }}
        />
      </div>
    </div>
  );
}

export function ScoreGrid({
  scores,
}: {
  scores: { label: string; value: number; accent?: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scores.map((s) => (
        <ScoreMeter key={s.label} {...s} />
      ))}
    </div>
  );
}
