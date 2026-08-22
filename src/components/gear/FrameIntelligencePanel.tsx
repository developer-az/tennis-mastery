"use client";

import { useMemo } from "react";
import type { RacketProfile } from "@/types/equipment";
import {
  analyzeFrame,
  type FrameIntelligence,
  type FrameQuirk,
} from "@/lib/equipment/strokeformIntel";
import { IntelSkillLadder } from "./IntelSkillLadder";
import { IntelTrustBlock } from "./IntelTrustBlock";

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

function QuirkCard({ quirk }: { quirk: FrameQuirk }) {
  const tone =
    quirk.polarity === "demand"
      ? "var(--danger)"
      : quirk.polarity === "tradeoff"
        ? "var(--amber)"
        : "var(--accent)";
  return (
    <article className="sf-intel-quirk" style={{ borderLeftColor: tone }}>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-semibold tracking-[0.16em] uppercase"
          style={{ color: tone }}
        >
          {quirk.polarity}
        </span>
        <h4 className="text-sm font-semibold text-[var(--foreground)]">{quirk.title}</h4>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{quirk.meaning}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/90">
        <span className="sf-label !normal-case !tracking-normal !text-[var(--accent)]">
          Coach ·{" "}
        </span>
        {quirk.coaching}
      </p>
    </article>
  );
}

export function FrameIntelligencePanel({
  racket,
  liveCatalog = false,
  compact = false,
}: {
  racket: RacketProfile;
  liveCatalog?: boolean;
  compact?: boolean;
}) {
  const intel = useMemo(
    () => analyzeFrame(racket, { liveCatalog }),
    [racket, liveCatalog],
  );

  return (
    <section
      className={`sf-intel-panel sf-rise${compact ? " !p-4 md:!p-5" : ""}`}
      aria-label="Strokeform frame intelligence"
    >
      <header className="border-b border-[var(--line)] pb-5">
        <div className="min-w-0">
          <p className="sf-kicker">Strokeform intelligence</p>
          <h3
            className={`mt-2 font-[family-name:var(--font-display)] font-semibold tracking-tight ${
              compact ? "text-lg md:text-xl" : "text-xl md:text-2xl"
            }`}
          >
            {intel.specialHeadline}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {intel.specialBody}
          </p>
        </div>
        <div className="mt-5">
          <IntelTrustBlock sources={intel.sources} compact={compact} />
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="sf-intel-chip sf-intel-chip-accent">{intel.primaryArchetype}</span>
        {intel.secondaryArchetype ? (
          <span className="sf-intel-chip">{intel.secondaryArchetype}</span>
        ) : null}
        <span className="sf-intel-chip">{intel.courtRole}</span>
        <span className="sf-intel-chip">{intel.skill.band}</span>
      </div>

      <div className={`mt-6 grid gap-6 ${compact ? "" : "lg:grid-cols-[1.1fr_0.9fr]"}`}>
        <IntelSkillLadder intel={intel} />
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <Meter label="Plow" value={intel.ratings.plow} color="var(--chart-power)" />
          <Meter label="Whip" value={intel.ratings.whip} color="var(--chart-spin)" />
          <Meter label="Forgiveness" value={intel.ratings.forgiveness} color="var(--chart-comfort)" />
          <Meter label="Spin ceiling" value={intel.ratings.spinCeiling} color="var(--chart-spin)" />
          <Meter
            label="Directional honesty"
            value={intel.ratings.directionalHonesty}
            color="var(--chart-control)"
          />
          <Meter label="Arm load" value={intel.ratings.armLoad} color="var(--danger)" />
        </div>
      </div>

      {!compact ? (
        <>
          <div className="mt-8">
            <p className="sf-label">What makes this frame special</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {intel.quirks.map((q) => (
                <QuirkCard key={q.id} quirk={q} />
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="sf-intel-callout">
              <p className="sf-label">String pairing</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/90">
                {intel.stringPairing}
              </p>
            </div>
            <div className="sf-intel-callout">
              <p className="sf-label">Skip this if</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--muted)]">
                {intel.skipIf.length ? (
                  intel.skipIf.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-[var(--danger)]" aria-hidden />
                      {s}
                    </li>
                  ))
                ) : (
                  <li>No hard anti-fits flagged — still verify with a session log.</li>
                )}
              </ul>
            </div>
          </div>

          {intel.tourSignal ? (
            <p className="mt-5 text-xs leading-relaxed text-[var(--muted)]">{intel.tourSignal}</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** Re-export for consumers that only need the analyzed object. */
export type { FrameIntelligence };
