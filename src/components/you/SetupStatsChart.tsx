"use client";

import { useId, useMemo } from "react";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import { healthyBandsFor, type ScoreKey } from "@/lib/equipment/inBandImprove";

const AXES: { key: ScoreKey; label: string; colorVar: string }[] = [
  { key: "power", label: "Power", colorVar: "var(--chart-power)" },
  { key: "spin", label: "Spin", colorVar: "var(--chart-spin)" },
  { key: "control", label: "Control", colorVar: "var(--chart-control)" },
  { key: "comfort", label: "Comfort", colorVar: "var(--chart-comfort)" },
];

type ScoreBag = Record<ScoreKey, number | null>;

function polar(cx: number, cy: number, r: number, i: number, n: number) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

function poly(cx: number, cy: number, rs: number[], n: number) {
  return rs
    .map((r, i) => {
      const p = polar(cx, cy, r, i, n);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

/** Layered current-vs-stock radar beside healthy-band / molded / stock bars. */
export function SetupStatsChart({
  scores,
  stock,
  role,
  flight,
}: {
  scores: ScoreBag;
  stock: ScoreBag;
  role: string;
  flight: FlightMetrics | null;
}) {
  const uid = useId().replace(/:/g, "");
  const bands = useMemo(() => healthyBandsFor(role), [role]);
  const hasScores = AXES.some((a) => scores[a.key] != null);
  const cx = 120;
  const cy = 118;
  const maxR = 78;
  const n = AXES.length;

  const moldedR = AXES.map((a) => ((scores[a.key] ?? 0) / 100) * maxR);
  const stockR = AXES.map((a) => ((stock[a.key] ?? 0) / 100) * maxR);

  return (
    <div className="sf-panel p-5 md:p-6">
      <p className="sf-kicker">Molded setup</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight md:text-2xl">
        Your numbers
      </h2>
      <p className="mt-1 max-w-xl text-xs text-[var(--muted)]">
        Radar is this bag vs stock. Bars: track = healthy band for {role || "this mold"}; needle =
        molded; ghost tick = stock.
      </p>

      {!hasScores ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Save a racket to plot power, spin, control, and comfort.</p>
      ) : (
        <div className="mt-5 grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <svg viewBox="0 0 240 248" className="mx-auto h-auto w-full max-w-[280px]" role="img" aria-label="Setup radar">
              <defs>
                <linearGradient id={`radarFill-${uid}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              {[0.33, 0.66, 1].map((t) => (
                <polygon
                  key={t}
                  points={poly(
                    cx,
                    cy,
                    AXES.map(() => maxR * t),
                    n,
                  )}
                  fill="none"
                  stroke="color-mix(in srgb, var(--foreground) 12%, transparent)"
                  strokeWidth="1"
                />
              ))}
              {AXES.map((_, i) => {
                const p = polar(cx, cy, maxR, i, n);
                const band = bands[AXES[i].key];
                const lo = polar(cx, cy, (band.low / 100) * maxR, i, n);
                const hi = polar(cx, cy, (band.high / 100) * maxR, i, n);
                return (
                  <g key={i}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={p.x}
                      y2={p.y}
                      stroke="color-mix(in srgb, var(--foreground) 10%, transparent)"
                    />
                    <line
                      x1={lo.x}
                      y1={lo.y}
                      x2={hi.x}
                      y2={hi.y}
                      stroke="var(--accent)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      opacity="0.22"
                    />
                  </g>
                );
              })}
              <polygon
                points={poly(cx, cy, stockR, n)}
                fill="color-mix(in srgb, var(--foreground) 8%, transparent)"
                stroke="color-mix(in srgb, var(--foreground) 35%, transparent)"
                strokeWidth="1.4"
              />
              <polygon
                points={poly(cx, cy, moldedR, n)}
                fill={`url(#radarFill-${uid})`}
                stroke="var(--accent)"
                strokeWidth="2"
              />
              {AXES.map((a, i) => {
                const p = polar(cx, cy, maxR + 18, i, n);
                return (
                  <text
                    key={a.key}
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {a.label}
                  </text>
                );
              })}
            </svg>
            <div className="mt-3 flex justify-center gap-5 text-[11px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                This bag
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--foreground)]/30" />
                Stock
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {AXES.map((a) => {
              const v = scores[a.key];
              const s = stock[a.key];
              const band = bands[a.key];
              const d = v != null && s != null ? v - s : null;
              const inBand = v != null && v >= band.low && v <= band.high;
              return (
                <div key={a.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: a.colorVar }}
                    >
                      {a.label}
                      {inBand ? (
                        <span className="ml-2 text-[10px] font-normal tracking-normal text-[var(--muted)]">
                          in band
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm tabular-nums">
                      <span className="font-[family-name:var(--font-display)] text-lg">{v ?? "—"}</span>
                      {d != null && Math.abs(d) >= 0.5 ? (
                        <span className="ml-1.5 text-[11px] text-[var(--muted)]">
                          stock {s} ({d > 0 ? "+" : ""}
                          {Math.round(d)})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="relative h-3 rounded-sm bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
                    <div
                      className="absolute inset-y-0 rounded-sm opacity-35"
                      style={{
                        left: `${band.low}%`,
                        width: `${Math.max(0, band.high - band.low)}%`,
                        background: a.colorVar,
                      }}
                    />
                    {s != null ? (
                      <div
                        className="absolute top-0 z-[1] h-full w-0.5 bg-[var(--muted)] opacity-70"
                        style={{ left: `calc(${Math.max(0, Math.min(100, s))}% - 1px)` }}
                        title={`Stock ${s}`}
                      />
                    ) : null}
                    {v != null ? (
                      <div
                        className="absolute top-1/2 z-[2] h-5 w-1.5 -translate-y-1/2 rounded-sm shadow-sm"
                        style={{
                          left: `calc(${Math.max(0, Math.min(100, v))}% - 3px)`,
                          background: a.colorVar,
                        }}
                        title={`Molded ${v}`}
                      />
                    ) : null}
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] tabular-nums text-[var(--muted)]">
                    <span>{band.low}</span>
                    <span>{band.high}</span>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-6 rounded-sm bg-[var(--chart-control)] opacity-40" />
                Healthy band
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-1.5 rounded-sm bg-[var(--chart-control)]" />
                Molded
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-0.5 bg-[var(--muted)]" />
                Stock
              </span>
            </div>
          </div>
        </div>
      )}

      {hasScores && flight ? (
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4 sm:grid-cols-4">
          {(
            [
              ["Plow", flight.plow, "var(--chart-comfort)"],
              ["Topspin", flight.topspin, "var(--chart-spin)"],
              ["Depth", flight.depth, "var(--chart-power)"],
              ["Fly risk", flight.flyRisk, "var(--foreground)"],
            ] as const
          ).map(([label, v, color]) => (
            <div key={label}>
              <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
              <p
                className="mt-0.5 font-[family-name:var(--font-display)] text-lg tabular-nums"
                style={{ color }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
