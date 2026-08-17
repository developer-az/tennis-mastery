"use client";

import { useId, useMemo } from "react";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import { healthyBandsFor, type ScoreKey } from "@/lib/equipment/inBandImprove";

const AXES: { key: ScoreKey; label: string; color: string }[] = [
  { key: "power", label: "Power", color: "#f4a261" },
  { key: "spin", label: "Spin", color: "#7dd3fc" },
  { key: "control", label: "Control", color: "#c8f560" },
  { key: "comfort", label: "Comfort", color: "#e9c46a" },
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
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

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
  const cx = 120;
  const cy = 118;
  const maxR = 86;
  const n = AXES.length;

  const moldedR = AXES.map((a) => ((scores[a.key] ?? 0) / 100) * maxR);
  const lowR = AXES.map((a) => (bands[a.key].low / 100) * maxR);
  const highR = AXES.map((a) => (bands[a.key].high / 100) * maxR);

  const hasScores = AXES.some((a) => scores[a.key] != null);

  return (
    <div className="sf-panel p-5 md:p-6">
      <p className="sf-kicker">Molded setup</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight md:text-2xl">
        Your numbers
      </h2>
      <p className="mt-1 max-w-xl text-xs text-[var(--muted)]">
        Power, spin, control, comfort for this bag. Soft ticks = healthy band for {role || "this mold"}.
      </p>

      {!hasScores ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Save a racket to plot power, spin, control, and comfort.</p>
      ) : (
        <div className="mt-4 grid items-center gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <svg viewBox="0 0 240 250" className="h-auto w-full max-w-sm justify-self-center" role="img" aria-label="Setup radar">
              <defs>
                <radialGradient id={`radarFill-${uid}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c8f560" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#c8f560" stopOpacity="0.06" />
                </radialGradient>
              </defs>
              {[0.5, 1].map((t) => (
                <polygon
                  key={t}
                  points={poly(cx, cy, AXES.map(() => maxR * t), n)}
                  fill="none"
                  stroke="rgba(232,239,233,0.1)"
                  strokeWidth="1"
                />
              ))}
              {AXES.map((_, i) => {
                const p = polar(cx, cy, maxR, i, n);
                const lo = polar(cx, cy, lowR[i], i, n);
                const hi = polar(cx, cy, highR[i], i, n);
                return (
                  <g key={i}>
                    <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(232,239,233,0.12)" />
                    <line
                      x1={lo.x}
                      y1={lo.y}
                      x2={hi.x}
                      y2={hi.y}
                      stroke="#c8f560"
                      strokeWidth="6"
                      strokeLinecap="round"
                      opacity="0.28"
                    />
                  </g>
                );
              })}
              <polygon
                points={poly(cx, cy, moldedR, n)}
                fill={`url(#radarFill-${uid})`}
                stroke="#c8f560"
                strokeWidth="2.4"
              />
              {AXES.map((a, i) => {
                const p = polar(cx, cy, maxR + 16, i, n);
                const d = polar(cx, cy, moldedR[i], i, n);
                return (
                  <g key={a.key}>
                    <circle cx={d.x} cy={d.y} r="3.2" fill={a.color} />
                    <text
                      x={p.x}
                      y={p.y + 3}
                      textAnchor="middle"
                      fill={a.color}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {a.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.12em]">
              <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#c8f560]" />
                This bag
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                <span className="inline-block h-2 w-4 rounded-sm bg-[#c8f560] opacity-40" />
                Healthy band
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {AXES.map((a) => {
              const v = scores[a.key];
              const s = stock[a.key];
              const band = bands[a.key];
              const d = v != null && s != null ? v - s : null;
              return (
                <div key={a.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: a.color }}>
                      {a.label}
                    </p>
                    <p className="text-sm tabular-nums">
                      {v ?? "—"}
                      {d != null && Math.abs(d) >= 0.5 ? (
                        <span className="ml-1.5 text-[11px] text-[var(--muted)]">
                          stock {s} ({d > 0 ? "+" : ""}
                          {Math.round(d)})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="absolute inset-y-0 opacity-25"
                      style={{
                        left: `${band.low}%`,
                        width: `${Math.max(0, band.high - band.low)}%`,
                        background: a.color,
                      }}
                    />
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%`, background: a.color }}
                    />
                  </div>
                </div>
              );
            })}
            {flight ? (
              <div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3">
                {(
                  [
                    ["Plow", flight.plow, "#e9c46a"],
                    ["Topspin", flight.topspin, "#7dd3fc"],
                    ["Depth", flight.depth, "#f4a261"],
                    ["Fly risk", flight.flyRisk, "#e8efe9"],
                  ] as const
                ).map(([label, v, color]) => (
                  <div key={label}>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                    <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg tabular-nums" style={{ color }}>
                      {v}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
