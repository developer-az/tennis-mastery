"use client";

import Link from "next/link";
import type {
  InBandLever,
  InBandPlan,
  LeverFamily,
  ScoreHeadroom,
  ScoreKey,
} from "@/lib/equipment/inBandImprove";
import { DEPTH_FLOOR, FLY_RISK_CAP } from "@/lib/equipment/inBandImprove";

const SCORE_COLOR: Record<ScoreKey, string> = {
  power: "#f4a261",
  spin: "#7dd3fc",
  control: "var(--chart-control)",
  comfort: "#e9c46a",
};

const SCORE_LABEL: Record<ScoreKey, string> = {
  power: "Power",
  spin: "Spin",
  control: "Control",
  comfort: "Comfort",
};

const FAMILY_LABEL: Record<LeverFamily, string> = {
  tension: "Bed · tension",
  gauge: "Bed · gauge",
  "tape-12": "Tape · 12 / tip",
  "tape-39": "Tape · 3 & 9",
  "tape-handle": "Tape · handle",
  "tape-throat": "Tape · neck",
};

function fmtDelta(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r) < 0.05) return "0";
  return `${r > 0 ? "+" : ""}${r}`;
}

function fmtSignedDeg(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r) < 0.05) return "0°";
  return `${r > 0 ? "+" : ""}${r}°`;
}

function verdictCopy(s: ScoreHeadroom): string {
  if (s.verdict === "unknown") return "Not modeled yet";
  if (s.verdict === "low") return `Below band (${s.band.low}–${s.band.high})`;
  if (s.verdict === "high") return `Above band (${s.band.low}–${s.band.high})`;
  return `In band ${s.band.low}–${s.band.high} · ${s.headroomUp} pt headroom up`;
}

function leverHref(family: LeverFamily): string {
  if (family === "tension" || family === "gauge") return "/gear?tab=strings";
  return "/gear?tab=lead-tape";
}

function ScoreShiftGrid({
  target,
  lever,
}: {
  target: ScoreKey;
  lever: InBandLever;
}) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {(["power", "spin", "control", "comfort"] as const).map((k) => {
        const d = lever.deltas[k];
        const next = lever.predicted[k];
        const isTarget = k === target;
        const lost = d < -0.15;
        return (
          <div
            key={k}
            className="rounded-md px-2 py-1.5"
            style={{
              boxShadow: isTarget
                ? `inset 0 0 0 1px ${SCORE_COLOR[k]}`
                : "inset 0 0 0 1px var(--line)",
              background: isTarget ? `${SCORE_COLOR[k]}14` : undefined,
            }}
          >
            <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {SCORE_LABEL[k]}
              {isTarget ? " · aim" : ""}
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5 tabular-nums">
              <span className="text-sm text-[var(--foreground)]">{next ?? "—"}</span>
              <span
                className="text-[11px] font-medium"
                style={{
                  color: lost ? "#f4a261" : Math.abs(d) < 0.15 ? "var(--muted)" : SCORE_COLOR[k],
                }}
              >
                {fmtDelta(d)}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
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
        One lever, full scoreboard
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
        High-level customizing is choosing a <em>channel</em> — stringbed COR, swingweight
        (12 / tip), twistweight (paired 3 & 9), recoil / head-light (handle), or neck mass —
        not stacking bumper lead. Each move is modeled with the same mold equations (Cross
        &amp; Lindsey / TWU bed response; Brody polar moment; SW ≈ m·r²). A lever is legal
        only if every score already in-band stays in-band, fly-risk stays ≤ {FLY_RISK_CAP} if
        it is already there, and depth stays ≥ {DEPTH_FLOOR} if it is already there.
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
                <ul className="mt-3 space-y-4">
                  {s.levers.map((lev) => {
                    const fly0 = plan.currentFlyRisk;
                    const dep0 = plan.currentDepth;
                    return (
                      <li key={lev.id} className="border-t border-[var(--line)] pt-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm text-[var(--foreground)]">{lev.action}</p>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {FAMILY_LABEL[lev.family]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--foreground)]/80">
                          {lev.why}
                        </p>
                        <ScoreShiftGrid target={s.key} lever={lev} />
                        <p className="mt-2 text-[11px] tabular-nums leading-relaxed text-[var(--muted)]">
                          {plan.currentLaunch != null ? (
                            <>
                              Leave {plan.currentLaunch.toFixed(1)}°{" "}
                              <span className="text-[var(--foreground)]/75">
                                {fmtSignedDeg(lev.dLaunch)}
                              </span>
                              {" · "}
                            </>
                          ) : null}
                          {plan.currentPath != null ? (
                            <>
                              path {plan.currentPath.toFixed(0)}°{" "}
                              <span className="text-[var(--foreground)]/75">
                                {fmtSignedDeg(lev.dPath)}
                              </span>
                              {" · "}
                            </>
                          ) : null}
                          SW{" "}
                          <span className="text-[var(--foreground)]/75">{fmtDelta(lev.dSw)}</span>
                          {fly0 != null && lev.predictedFlyRisk != null ? (
                            <>
                              {" · "}fly {fly0}→{lev.predictedFlyRisk} (
                              {fmtDelta(lev.predictedFlyRisk - fly0)})
                            </>
                          ) : null}
                          {dep0 != null && lev.predictedDepth != null ? (
                            <>
                              {" · "}depth {dep0}→{lev.predictedDepth} (
                              {fmtDelta(lev.predictedDepth - dep0)})
                            </>
                          ) : null}
                          {lev.headroomAfter >= 0 ? (
                            <>
                              {" · "}
                              {lev.headroomAfter} pt still to {s.key} band high
                            </>
                          ) : null}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--foreground)]/70">
                          <span className="text-sky-300/90">Science — </span>
                          {lev.science}
                        </p>
                        <Link
                          href={leverHref(lev.family)}
                          className="mt-1.5 inline-block text-[11px] font-medium text-sky-300"
                        >
                          {lev.family.startsWith("tape") ? "Place it in tape lab →" : "Set it on the bed →"}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : s.current != null && !s.holdNote ? (
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
                  No single legal channel raises {s.key} without pushing another in-band score
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
          If every healthy score is already near the top of its band, further raises would
          leave the window — that’s the stop condition, not a failure.
        </p>
      ) : null}
    </div>
  );
}
