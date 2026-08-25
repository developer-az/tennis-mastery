"use client";

import type { GripProfile } from "@/types/equipment";
import { ScoreMeter } from "./ScoreMeter";

function isTourna(grip: GripProfile) {
  return /tourna/i.test(grip.brand) || /tourna|mega\s*tac/i.test(grip.name);
}

/** Brand-aware handle cross-section — Tourna dry blue wrap vs generic layers. */
export function GripFeelVisual({ grip }: { grip: GripProfile }) {
  const layers = Math.max(1, Math.round(grip.thicknessMm * 4));
  const tourna = isTourna(grip);
  const wrap = tourna ? "#2f6fed" : grip.kind === "overgrip" ? "var(--chart-control)" : "var(--chart-power)";
  const core = tourna ? "#1a2744" : "#1b4332";

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {tourna ? "Tourna dry wrap" : "Handle cross-section"}
      </p>
      <div className="flex items-end gap-6">
        <svg viewBox="0 0 120 140" className="h-36 w-28" aria-hidden>
          <polygon
            points="40,20 80,20 95,50 95,110 60,130 25,110 25,50"
            fill={core}
            stroke="rgba(232,239,233,0.25)"
          />
          {Array.from({ length: layers }).map((_, i) => {
            const inset = 4 + i * 3;
            return (
              <polygon
                key={i}
                points={`${40 - inset * 0.15},${20 - i} ${80 + inset * 0.15},${20 - i} ${95 + inset * 0.2},${50 - i * 0.3} ${95 + inset * 0.2},${110 + i * 0.2} 60,${130 + i * 0.4} ${25 - inset * 0.2},${110 + i * 0.2} ${25 - inset * 0.2},${50 - i * 0.3}`}
                fill="none"
                stroke={wrap}
                strokeOpacity={0.4 + i * 0.14}
                strokeWidth={tourna ? 2.4 : 2}
                strokeDasharray={tourna && i === layers - 1 ? "3 2" : undefined}
              />
            );
          })}
          {tourna ? (
            <>
              {/* Perforation / dry-feel texture dots */}
              {[0, 1, 2, 3, 4].map((row) =>
                [0, 1, 2].map((col) => (
                  <circle
                    key={`${row}-${col}`}
                    cx={48 + col * 12}
                    cy={48 + row * 12}
                    r="1.4"
                    fill="#9ec0ff"
                    opacity="0.55"
                  />
                )),
              )}
              <text x="60" y="118" textAnchor="middle" fill="#9ec0ff" fontSize="7" fontWeight="600">
                DRY
              </text>
            </>
          ) : null}
          <text x="60" y="78" textAnchor="middle" fill="var(--foreground)" fontSize="11">
            {grip.thicknessMm.toFixed(2)} mm
          </text>
        </svg>
        <div className="flex-1 space-y-3">
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
