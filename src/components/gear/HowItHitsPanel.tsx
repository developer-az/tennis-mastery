"use client";

import { useMemo } from "react";
import type { RacketProfile } from "@/types/equipment";
import {
  computeFrameSpecPhysics,
  parseExpertScores,
} from "@/lib/equipment/playability";

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--label)] uppercase">
          {label}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-[var(--muted)]">
          {value}
        </span>
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(4, Math.min(100, value))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

/**
 * How this hoop hits — mass, SW, RA, pattern, head. Model name is not an input.
 */
export function HowItHitsPanel({ racket }: { racket: RacketProfile }) {
  const physics = useMemo(
    () => computeFrameSpecPhysics(racket, parseExpertScores(racket.summary)),
    [racket],
  );

  return (
    <section className="sf-intel-panel" aria-label="How this frame hits">
      <header className="border-b border-[var(--line)] pb-4">
        <p className="sf-kicker">How it hits</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight md:text-2xl">
          {physics.hitKicker}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {physics.howItHits}
        </p>
        <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--foreground)]/80">
          {physics.specLine}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
          Calculated from weight, swingweight, RA, balance, head size, and pattern. The model
          name is not an input.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
        <Meter label="Plow" value={physics.plow} color="var(--chart-power)" />
        <Meter label="Whip" value={physics.whip} color="var(--chart-spin)" />
        <Meter label="Forgiveness" value={physics.forgiveness} color="var(--chart-comfort)" />
        <Meter label="Arm load" value={physics.armLoad} color="var(--danger)" />
      </div>
      <p className="mt-4 text-[11px] tabular-nums text-[var(--muted)]">
        Teaching window ~{physics.launchDeg.toFixed(1)}° leave / ~{physics.pathDeg.toFixed(0)}° path
      </p>
    </section>
  );
}
