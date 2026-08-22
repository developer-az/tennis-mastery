"use client";

import { useMemo } from "react";
import type { StringProfile } from "@/types/equipment";
import { analyzeString } from "@/lib/equipment/strokeformIntel";
import { IntelTrustBlock } from "./IntelTrustBlock";

export function StringIntelligencePanel({
  string,
  compact = false,
}: {
  string: StringProfile;
  compact?: boolean;
}) {
  const intel = useMemo(() => analyzeString(string), [string]);

  return (
    <section
      className={`sf-intel-panel${compact ? " !p-4 md:!p-5" : ""}`}
      aria-label="Strokeform string intelligence"
    >
      <header className="border-b border-[var(--line)] pb-4">
        <div>
          <p className="sf-kicker">Strokeform string lab</p>
          <h3
            className={`mt-2 font-[family-name:var(--font-display)] font-semibold tracking-tight ${
              compact ? "text-lg md:text-xl" : "text-lg md:text-xl"
            }`}
          >
            {intel.specialHeadline}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {intel.specialBody}
          </p>
        </div>
        <div className="mt-4">
          <IntelTrustBlock sources={intel.sources} compact={compact} />
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="sf-intel-chip sf-intel-chip-accent">{intel.familyRole}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        {(
          [
            ["Pocket", intel.ratings.pocket, "var(--chart-comfort)"],
            ["Bite", intel.ratings.bite, "var(--chart-spin)"],
            ["Board", intel.ratings.board, "var(--chart-control)"],
            ["Durability", intel.ratings.durability, "var(--chart-power)"],
            ["Tension hold", intel.ratings.tensionHold, "var(--sky)"],
          ] as const
        ).map(([label, value, color]) => (
          <div key={label}>
            <div className="flex justify-between text-[10px] font-semibold tracking-[0.12em] text-[var(--label)] uppercase">
              <span>{label}</span>
              <span className="tabular-nums text-[var(--muted)]">{value}</span>
            </div>
            <div className="mt-1 h-[3px] bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              <div className="h-full" style={{ width: `${value}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>

      {intel.quirks.length ? (
        <div className={`mt-5 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
          {intel.quirks.map((q) => (
            <article
              key={q.id}
              className="sf-intel-quirk"
              style={{ borderLeftColor: "var(--accent)" }}
            >
              <h4 className="text-sm font-semibold">{q.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{q.meaning}</p>
              {!compact ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]/90">
                  <span className="font-semibold text-[var(--accent)]">Coach · </span>
                  {q.coaching}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <div className={`mt-4 ${compact ? "space-y-3" : "grid gap-4 md:grid-cols-2"}`}>
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">Frame match · </span>
          {intel.bestFrameMatch}
        </p>
        {!compact && intel.skipIf.length ? (
          <div className="sf-intel-callout">
            <p className="sf-label">Skip this if</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--muted)]">
              {intel.skipIf.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-[var(--danger)]" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
