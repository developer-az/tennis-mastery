"use client";

import { useMemo } from "react";
import type { StringProfile } from "@/types/equipment";
import { analyzeString } from "@/lib/equipment/strokeformIntel";

export function StringIntelligencePanel({ string }: { string: StringProfile }) {
  const intel = useMemo(() => analyzeString(string), [string]);

  return (
    <section className="sf-intel-panel" aria-label="Strokeform string intelligence">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <p className="sf-kicker">Strokeform string lab</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight md:text-xl">
            {intel.specialHeadline}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">{intel.specialBody}</p>
        </div>
        <div className="text-right">
          <p className="sf-label">Trust</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-[var(--accent)]">
            {intel.trustScore}
          </p>
        </div>
      </header>

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
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {intel.quirks.map((q) => (
            <article key={q.id} className="sf-intel-quirk" style={{ borderLeftColor: "var(--accent)" }}>
              <h4 className="text-sm font-semibold">{q.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{q.meaning}</p>
            </article>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--foreground)]">Frame match · </span>
        {intel.bestFrameMatch}
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {intel.sources.map((s) => (
          <li key={s.id} className="sf-source-chip" title={s.role}>
            {s.label} · {s.confidence}%
          </li>
        ))}
      </ul>
    </section>
  );
}
