"use client";

import type { RacketProfile } from "@/types/equipment";
import { derivePlayerFit, playerFitBadges } from "@/lib/equipment/playerFit";

export function PlayerFitBadges({ racket }: { racket: RacketProfile }) {
  const fit = derivePlayerFit(racket);
  const badges = playerFitBadges(racket);

  return (
    <section aria-label="Player fit">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Player fit
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={b.key}
            title={b.hint}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium tracking-tight"
            style={{
              color: b.color,
              background: `color-mix(in srgb, ${b.color} 14%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${b.color} 45%, transparent)`,
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: b.color }}
              aria-hidden
            />
            {b.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{fit.blurb}</p>

      {/* Visual feel strip — power / spin / control as color bars */}
      <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
        <FeelChip label="Power" value={racket.power} color="var(--chart-power)" />
        <FeelChip label="Spin" value={racket.spin} color="var(--chart-spin)" />
        <FeelChip label="Control" value={racket.control} color="var(--chart-control)" />
      </div>
    </section>
  );
}

function FeelChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-md px-2 py-2"
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        boxShadow: "inset 0 0 0 1px var(--line)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight">
        {value}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}
