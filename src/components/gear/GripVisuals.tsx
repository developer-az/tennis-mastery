"use client";

import { useId } from "react";
import type { GripProfile } from "@/types/equipment";
import { ScoreMeter } from "./ScoreMeter";

function isTourna(grip: GripProfile) {
  return /tourna/i.test(grip.brand) || /tourna|mega\s*tac/i.test(grip.name);
}

/** Brand-aware handle cross-section — Tourna dry wrap vs leather / overgrip stack. */
export function GripFeelVisual({ grip }: { grip: GripProfile }) {
  const uid = useId().replace(/:/g, "");
  const layers = Math.max(1, Math.min(5, Math.round(grip.thicknessMm * 4)));
  const tourna = isTourna(grip);
  const wrap = tourna ? "#2f6fed" : grip.kind === "overgrip" ? "var(--chart-control)" : "#6b4a32";
  const wrapHi = tourna ? "#7aa6ff" : grip.kind === "overgrip" ? "var(--accent)" : "#c4a07a";

  return (
    <div>
      <p className="sf-kicker mb-3">{tourna ? "Tourna dry wrap" : "Handle cross-section"}</p>
      <div className="flex flex-wrap items-end gap-6">
        <div className="sf-viz-stage w-[9.5rem] shrink-0">
          <svg viewBox="0 0 120 148" className="h-40 w-full" aria-hidden>
            <defs>
              <linearGradient id={`core-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3d2a1c" />
                <stop offset="50%" stopColor="#1c120c" />
                <stop offset="100%" stopColor="#2a1a12" />
              </linearGradient>
              <linearGradient id={`wrap-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={wrap} stopOpacity="0.35" />
                <stop offset="40%" stopColor={wrapHi} stopOpacity="0.95" />
                <stop offset="100%" stopColor={wrap} stopOpacity="0.55" />
              </linearGradient>
              <radialGradient id={`spec-${uid}`} cx="35%" cy="30%" r="55%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            {Array.from({ length: layers }).map((_, i) => {
              const inset = 2 + i * 2.6;
              return (
                <ellipse
                  key={i}
                  cx="60"
                  cy="72"
                  rx={36 + inset}
                  ry={52 + inset * 0.55}
                  fill="none"
                  stroke={`url(#wrap-${uid})`}
                  strokeWidth={tourna ? 3.2 : 2.6}
                  opacity={0.45 + i * 0.12}
                />
              );
            })}
            <ellipse cx="60" cy="72" rx="34" ry="50" fill={`url(#core-${uid})`} />
            <ellipse cx="60" cy="72" rx="34" ry="50" fill={`url(#spec-${uid})`} />
            {tourna
              ? [0, 1, 2, 3, 4].flatMap((row) =>
                  [0, 1, 2].map((col) => (
                    <circle
                      key={`${row}-${col}`}
                      cx={48 + col * 12}
                      cy={48 + row * 13}
                      r="1.6"
                      fill="#c5dcff"
                      opacity="0.7"
                    />
                  )),
                )
              : null}
            <text
              x="60"
              y="78"
              textAnchor="middle"
              fill="#f4eee6"
              fontSize="12"
              fontFamily="var(--font-display)"
              fontWeight="600"
            >
              {grip.thicknessMm.toFixed(2)}
            </text>
            <text x="60" y="92" textAnchor="middle" fill="#c8b8a4" fontSize="8.5" fontWeight="600">
              mm
            </text>
          </svg>
        </div>
        <div className="min-w-[12rem] flex-1 space-y-3">
          <ScoreMeter label="Tackiness" value={grip.tackiness} />
          <ScoreMeter label="Cushion" value={grip.cushion} accent="var(--chart-power)" />
          <ScoreMeter label="Absorbency" value={grip.absorbency} accent="var(--chart-spin)" />
          <ScoreMeter label="Durability" value={grip.durability} accent="var(--chart-comfort)" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]/90">{grip.feel}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        <span className="text-[var(--accent)]">Unique: </span>
        {grip.uniqueTrait}
      </p>
    </div>
  );
}
