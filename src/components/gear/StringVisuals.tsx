"use client";

import { useId, useMemo } from "react";
import type { StringProfile } from "@/types/equipment";
import { tensionOutcome } from "@/lib/equipment/strings";
import { ScoreMeter } from "./ScoreMeter";

export function TensionCurve({
  string,
  tension,
  gaugeMm,
}: {
  string: StringProfile;
  tension: number;
  gaugeMm?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const outcome = useMemo(
    () => tensionOutcome(string, tension, gaugeMm),
    [string, tension, gaugeMm],
  );
  const [lo, hi] = string.tensionRangeLbs;

  const series = useMemo(() => {
    const steps = 16;
    const ctrl: { x: number; y: number }[] = [];
    const pwr: { x: number; y: number }[] = [];
    const spn: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = lo + ((hi - lo) * i) / steps;
      const o = tensionOutcome(string, t, gaugeMm);
      const x = (i / steps) * 200;
      ctrl.push({ x, y: 100 - o.control });
      pwr.push({ x, y: 100 - o.power });
      spn.push({ x, y: 100 - o.spin });
    }
    const toPts = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");
    const toArea = (pts: { x: number; y: number }[]) =>
      `M 0,100 L ${toPts(pts)} L 200,100 Z`;
    return {
      ctrl: toPts(ctrl),
      pwr: toPts(pwr),
      spn: toPts(spn),
      pwrArea: toArea(pwr),
    };
  }, [string, lo, hi, gaugeMm]);

  const markerX = ((tension - lo) / Math.max(1, hi - lo)) * 200;

  return (
    <div>
      <p className="sf-kicker mb-2">Tension response</p>
      <div className="sf-viz-stage">
        <svg viewBox="0 0 200 118" className="h-auto w-full" aria-hidden>
          <defs>
            <linearGradient id={`pwrFill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-power)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--chart-power)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="200"
              y2={y}
              stroke="color-mix(in srgb, var(--foreground) 8%, transparent)"
              strokeWidth="1"
            />
          ))}
          <line
            x1="0"
            y1="100"
            x2="200"
            y2="100"
            stroke="color-mix(in srgb, var(--foreground) 18%, transparent)"
            strokeWidth="1.25"
          />
          <path d={series.pwrArea} fill={`url(#pwrFill-${uid})`} />
          <polyline
            points={series.pwr}
            fill="none"
            stroke="var(--chart-power)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={series.ctrl}
            fill="none"
            stroke="var(--chart-control)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={series.spn}
            fill="none"
            stroke="var(--chart-spin)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line
            x1={markerX}
            y1="8"
            x2={markerX}
            y2="100"
            stroke="var(--foreground)"
            strokeOpacity="0.45"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />
          <circle cx={markerX} cy="100" r="3.2" fill="var(--accent)" />
          <g fontSize="8.5" fontWeight="600" fontFamily="var(--font-sans)">
            <text x="4" y="14" fill="var(--chart-power)">
              Power
            </text>
            <text x="52" y="14" fill="var(--chart-control)">
              Control
            </text>
            <text x="108" y="14" fill="var(--chart-spin)">
              Spin
            </text>
          </g>
          <text
            x="196"
            y="114"
            textAnchor="end"
            fill="var(--muted)"
            fontSize="8"
          >
            {lo}–{hi} lbs
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3">
        <ScoreMeter label="Power @ tension/gauge" value={outcome.power} accent="var(--chart-power)" />
        <ScoreMeter label="Control @ tension/gauge" value={outcome.control} />
        <ScoreMeter label="Spin potential @ tension/gauge" value={outcome.spin} accent="var(--chart-spin)" />
        <ScoreMeter label="Comfort @ tension/gauge" value={outcome.comfort} accent="var(--chart-comfort)" />
        <ScoreMeter label="Stiffness feel" value={outcome.stiffness} accent="var(--muted)" />
        <ScoreMeter label="Durability @ gauge" value={outcome.durability} accent="var(--chart-power)" />
      </div>

      <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
        <p className="text-[var(--foreground)]/90">{outcome.dwellHint}</p>
        <p className="text-[var(--muted)]">{outcome.launchHint}</p>
        <p className="text-[var(--muted)]">{outcome.gaugeHint}</p>
      </div>
    </div>
  );
}

export function SpinPotentialRing({ value }: { value: number }) {
  const uid = useId().replace(/:/g, "");
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="flex items-center gap-5">
      <div className="sf-viz-stage !p-3">
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
          <defs>
            <linearGradient id={`spinArc-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--chart-spin)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
            <filter id={`spinGlow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="color-mix(in srgb, var(--foreground) 10%, transparent)"
            strokeWidth="9"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={`url(#spinArc-${uid})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            filter={`url(#spinGlow-${uid})`}
            style={{ transition: "stroke-dashoffset 0.55s ease" }}
          />
          <text
            x="60"
            y="56"
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize="26"
            fontFamily="var(--font-display)"
            fontWeight="600"
          >
            {value}
          </text>
          <text x="60" y="74" textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="600">
            / 100
          </text>
        </svg>
      </div>
      <div>
        <p className="sf-kicker sf-kicker-sky">Spin potential</p>
        <p className="mt-1.5 max-w-[14rem] text-sm leading-relaxed text-[var(--muted)]">
          Combines string shape, snap-back, and friction. Shaped/textured polys score highest;
          gut and multi need the player&apos;s path to create RPM.
        </p>
      </div>
    </div>
  );
}
