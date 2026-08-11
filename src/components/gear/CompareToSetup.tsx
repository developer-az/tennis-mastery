"use client";

export type CompareDeltaRow = {
  key: string;
  label: string;
  /** Candidate value */
  value: number | string;
  /** Baseline (my setup) value */
  baseline: number | string | null;
  /** Numeric delta when both are numbers */
  delta: number | null;
  unit?: string;
  /** Higher is better for coloring (default true). Angles may set false or custom. */
  higherIsBetter?: boolean;
};

function formatDelta(delta: number, unit?: string): string {
  const sign = delta > 0 ? "+" : "";
  const u = unit ? ` ${unit}` : "";
  const abs = Math.abs(delta);
  const rounded = abs >= 10 ? Math.round(delta) : Math.round(delta * 10) / 10;
  return `${sign}${rounded}${u}`;
}

export function CompareToSetup({
  title = "Vs my setup",
  subtitle,
  rows,
  emptyHint = "Save an item to My setup to compare against what you have already tested.",
}: {
  title?: string;
  subtitle?: string;
  rows: CompareDeltaRow[];
  emptyHint?: string;
}) {
  const hasBaseline = rows.some((r) => r.baseline != null && r.baseline !== "");

  if (!hasBaseline) {
    return (
      <section className="border-t border-[var(--line)] pt-6">
        <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">{title}</h4>
        <p className="mt-2 text-sm text-[var(--muted)]">{emptyHint}</p>
      </section>
    );
  }

  return (
    <section className="border-t border-[var(--line)] pt-6">
      <h4 className="font-[family-name:var(--font-display)] text-lg tracking-tight">{title}</h4>
      {subtitle ? <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p> : null}
      <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {rows.map((row) => {
          const delta = row.delta;
          let deltaColor = "var(--muted)";
          if (delta != null && delta !== 0) {
            const better =
              row.higherIsBetter === false ? delta < 0 : delta > 0;
            deltaColor = better ? "var(--accent)" : "var(--amber)";
          }
          return (
            <li
              key={row.key}
              className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
            >
              <span className="text-[var(--muted)]">{row.label}</span>
              <span className="flex flex-wrap items-baseline gap-3 tabular-nums">
                <span className="text-[var(--foreground)]">
                  {typeof row.value === "number" && row.unit
                    ? `${row.value}${row.unit === "°" ? "°" : ` ${row.unit}`}`
                    : row.value}
                  {typeof row.value === "number" && row.unit === "°" ? "" : null}
                </span>
                {row.baseline != null && row.baseline !== "" ? (
                  <span className="text-xs text-[var(--muted)]">
                    was {row.baseline}
                    {row.unit === "°" ? "°" : row.unit ? ` ${row.unit}` : ""}
                  </span>
                ) : null}
                {delta != null && delta !== 0 ? (
                  <span className="text-xs font-medium" style={{ color: deltaColor }}>
                    {formatDelta(delta, row.unit === "°" ? "°" : row.unit)}
                  </span>
                ) : delta === 0 ? (
                  <span className="text-xs text-[var(--muted)]">same</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function numericDelta(
  value: number | null | undefined,
  baseline: number | null | undefined,
): number | null {
  if (value == null || baseline == null) return null;
  return Math.round((value - baseline) * 10) / 10;
}
