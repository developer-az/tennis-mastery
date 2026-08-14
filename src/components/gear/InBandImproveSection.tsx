"use client";

import type { InBandPlan, ScoreHeadroom, ScoreKey } from "@/lib/equipment/inBandImprove";
import { DEPTH_FLOOR, FLY_RISK_CAP } from "@/lib/equipment/inBandImprove";

const SCORE_COLOR: Record<ScoreKey, string> = {
  power: "#f4a261",
  spin: "#7dd3fc",
  control: "#c8f560",
  comfort: "#e9c46a",
};

function fmtDelta(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r) < 0.05) return "0";
  return `${r > 0 ? "+" : ""}${r}`;
}

function verdictCopy(s: ScoreHeadroom): string {
  if (s.verdict === "unknown") return "Not modeled yet";
  if (s.verdict === "low") return `Below band (${s.band.low}–${s.band.high})`;
  if (s.verdict === "high") return `Above band (${s.band.low}–${s.band.high})`;
  return `In band ${s.band.low}–${s.band.high} · ${s.headroomUp} pt headroom up`;
}

export function InBandImproveSection({
  plan,
  compact = false,
}: {
  plan: InBandPlan;
  compact?: boolean;
}) {
  const modeled = plan.scores.filter((s) => s.current != null);

  return (
    <div className="border border-[var(--line)] bg-[var(--panel)]/90 p-5 md:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        In-band improvement
      </p>
      <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-xl tracking-tight md:text-2xl">
        Raise a score without leaving the healthy window
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
        Same equations as the mold: catalog tension/gauge bed, frame/bed blend
        (power 0.45 · spin 0.50 · control 0.45 · comfort 0.55),{" "}
        <code className="text-[11px] text-[var(--foreground)]/80">scoreDeltasFromTape</code>{" "}
        (tip +1.45 P / +0.4 S / −0.35 C / −0.95 comfort per gram + SW from m·r²),
        then{" "}
        <code className="text-[11px] text-[var(--foreground)]/80">computeFlightMetrics</code>.
        A lever is legal only if every score that is currently in-band stays in-band,
        fly-risk stays ≤ {FLY_RISK_CAP} if it is already there, and depth stays ≥ {DEPTH_FLOOR}{" "}
        if it is already there. One lever at a time.
      </p>

      {modeled.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Save a racket (and ideally a string) so these scores exist, then this list fills in.
        </p>
      ) : (
        <div className={`mt-5 grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
          {plan.scores.map((s) => (
            <article
              key={s.key}
              className="rounded-md p-3.5"
              style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  className="font-[family-name:var(--font-display)] text-lg capitalize tracking-tight"
                  style={{ color: SCORE_COLOR[s.key] }}
                >
                  {s.key}
                  {s.current != null ? (
                    <span className="ml-2 text-sm tabular-nums text-[var(--foreground)]/85">
                      {s.current}
                    </span>
                  ) : (
                    <span className="ml-2 text-sm text-[var(--muted)]">—</span>
                  )}
                </h3>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {verdictCopy(s)}
                </span>
              </div>

              {s.current != null ? (
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute inset-y-0 opacity-25"
                    style={{
                      left: `${s.band.low}%`,
                      width: `${Math.max(0, s.band.high - s.band.low)}%`,
                      background: SCORE_COLOR[s.key],
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 rounded-full"
                    style={{
                      left: `${Math.max(0, Math.min(100, s.current))}%`,
                      background: SCORE_COLOR[s.key],
                    }}
                  />
                </div>
              ) : null}

              {s.holdNote ? (
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">{s.holdNote}</p>
              ) : null}

              {s.levers.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {s.levers.map((lev) => {
                    const next = lev.predicted[s.key];
                    const gain =
                      s.current != null && next != null ? next - s.current : null;
                    return (
                      <li key={lev.id} className="border-t border-[var(--line)] pt-2.5">
                        <p className="text-sm text-[var(--foreground)]">{lev.action}</p>
                        <p className="mt-1 text-[11px] tabular-nums text-[var(--muted)]">
                          Predicted{" "}
                          <span style={{ color: SCORE_COLOR.power }}>
                            P {lev.predicted.power ?? "—"}
                          </span>
                          {" · "}
                          <span style={{ color: SCORE_COLOR.spin }}>
                            S {lev.predicted.spin ?? "—"}
                          </span>
                          {" · "}
                          <span style={{ color: SCORE_COLOR.control }}>
                            C {lev.predicted.control ?? "—"}
                          </span>
                          {" · "}
                          <span style={{ color: SCORE_COLOR.comfort }}>
                            Cm {lev.predicted.comfort ?? "—"}
                          </span>
                          {gain != null ? (
                            <span className="text-[var(--accent)]">
                              {" "}
                              ({s.key} {fmtDelta(gain)}, {lev.headroomAfter} pt still to band high)
                            </span>
                          ) : null}
                          {lev.predictedFlyRisk != null ? (
                            <span>
                              {" "}
                              · fly {lev.predictedFlyRisk} · depth {lev.predictedDepth}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground)]/70">
                          <span className="text-sky-300/90">Science — </span>
                          {lev.science}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : s.current != null && !s.holdNote ? (
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
                  No single legal lever raises {s.key} without pushing another in-band score
                  (or fly-risk / depth) out of its guard. Hold this number, or fix a below-band
                  score first.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {!plan.anyLegal && modeled.length > 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
          Nothing here is a “more is better” nudge. If every healthy score is already near the
          top of its band, further raises would leave the window — that’s the stop condition,
          not a failure.
        </p>
      ) : null}
    </div>
  );
}
