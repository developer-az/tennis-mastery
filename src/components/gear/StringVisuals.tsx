"use client";

import { useMemo } from "react";
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
  const outcome = useMemo(
    () => tensionOutcome(string, tension, gaugeMm),
    [string, tension, gaugeMm],
  );
  const [lo, hi] = string.tensionRangeLbs;

  // sparkline across tension range
  const points = useMemo(() => {
    const steps = 12;
    const ctrl: string[] = [];
    const pwr: string[] = [];
    const spn: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = lo + ((hi - lo) * i) / steps;
      const o = tensionOutcome(string, t, gaugeMm);
      const x = (i / steps) * 200;
      ctrl.push(`${x},${100 - o.control}`);
      pwr.push(`${x},${100 - o.power}`);
      spn.push(`${x},${100 - o.spin}`);
    }
    return { ctrl: ctrl.join(" "), pwr: pwr.join(" "), spn: spn.join(" ") };
  }, [string, lo, hi, gaugeMm]);

  const markerX = ((tension - lo) / Math.max(1, hi - lo)) * 200;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Tension response
      </p>
      <svg viewBox="0 0 200 110" className="mb-4 h-auto w-full" aria-hidden>
        <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(232,239,233,0.15)" />
        <polyline points={points.pwr} fill="none" stroke="#f4a261" strokeWidth="1.5" />
        <polyline points={points.ctrl} fill="none" stroke="var(--chart-control)" strokeWidth="1.5" />
        <polyline points={points.spn} fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
        <line
          x1={markerX}
          y1="0"
          x2={markerX}
          y2="100"
          stroke="rgba(232,239,233,0.45)"
          strokeDasharray="3 3"
          style={{ transition: "all 0.25s ease" }}
        />
        <text x="4" y="12" fill="#f4a261" fontSize="8">
          power
        </text>
        <text x="48" y="12" fill="var(--chart-control)" fontSize="8">
          control
        </text>
        <text x="96" y="12" fill="#7dd3fc" fontSize="8">
          spin
        </text>
      </svg>

      <div className="grid gap-3">
        <ScoreMeter label="Power @ tension/gauge" value={outcome.power} accent="#f4a261" />
        <ScoreMeter label="Control @ tension/gauge" value={outcome.control} />
        <ScoreMeter label="Spin potential @ tension/gauge" value={outcome.spin} accent="#7dd3fc" />
        <ScoreMeter label="Comfort @ tension/gauge" value={outcome.comfort} accent="#e9c46a" />
        <ScoreMeter label="Stiffness feel" value={outcome.stiffness} accent="#e8efe9" />
        <ScoreMeter label="Durability @ gauge" value={outcome.durability} accent="#f4a261" />
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
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden>
        <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(232,239,233,0.1)" strokeWidth="8" />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text
          x="54"
          y="58"
          textAnchor="middle"
          fill="#e8efe9"
          fontSize="22"
          fontFamily="var(--font-display)"
        >
          {value}
        </text>
      </svg>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
          Spin potential
        </p>
        <p className="mt-1 max-w-[14rem] text-xs leading-relaxed text-[var(--muted)]">
          Combines string shape, snap-back, and friction. Shaped/textured polys score highest;
          gut and multi need the player&apos;s path to create RPM.
        </p>
      </div>
    </div>
  );
}
