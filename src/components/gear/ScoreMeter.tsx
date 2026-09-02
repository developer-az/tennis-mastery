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
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-[var(--label)]">{label}</span>
        <span className="font-[family-name:var(--font-display)] text-sm tabular-nums tracking-tight text-[var(--foreground)]">
          {value}
        </span>
      </div>
      <div className="sf-meter-track">
        <div
          className="sf-meter-fill transition-[width] duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            background: accent,
            color: accent,
          }}
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
