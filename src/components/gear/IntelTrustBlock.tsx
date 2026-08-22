"use client";

import type { DataSourceCredit } from "@/lib/equipment/strokeformIntel";
import { describeTrust, isVerifiedSource } from "@/lib/equipment/strokeformIntel";

const TIER_COLOR: Record<string, string> = {
  high: "var(--accent)",
  solid: "var(--sky)",
  moderate: "var(--amber)",
  early: "var(--muted)",
};

export function IntelTrustBlock({
  sources,
  compact = false,
}: {
  sources: DataSourceCredit[];
  compact?: boolean;
}) {
  const trust = describeTrust(sources);
  const tierColor = TIER_COLOR[trust.tier] ?? "var(--muted)";

  return (
    <aside
      className={`sf-trust-block${compact ? " sf-trust-block-compact" : ""}`}
      aria-label="Data confidence"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="sf-label">How we know this</p>
          <p
            className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: tierColor }}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: tierColor }}
              aria-hidden
            />
            {trust.label}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{trust.headline}</p>
          {!compact ? (
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{trust.detail}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {trust.score}
            <span className="ml-0.5 text-sm font-medium text-[var(--muted)]">/100</span>
          </p>
          <p className="mt-0.5 text-[10px] tracking-[0.08em] text-[var(--muted)] uppercase">
            {trust.verifiedCount} verified · {trust.modeledCount} modeled
          </p>
        </div>
      </div>

      <ul className={`mt-4 space-y-2.5${compact ? " max-h-36 overflow-y-auto pr-1" : ""}`}>
        {sources.map((s) => {
          const verified = isVerifiedSource(s.id);
          return (
            <li key={s.id} className="sf-trust-source-row">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[var(--foreground)]">{s.label}</span>
                  <span
                    className={`ml-2 text-[9px] font-semibold tracking-[0.12em] uppercase ${
                      verified ? "text-[var(--accent)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {verified ? "Verified" : "Modeled"}
                  </span>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-[var(--muted)]">
                  {s.confidence}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">{s.role}</p>
              <div className="mt-1.5 h-[3px] overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{
                    width: `${s.confidence}%`,
                    background: verified ? "var(--accent)" : "var(--foreground)",
                    opacity: verified ? 1 : 0.35,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
