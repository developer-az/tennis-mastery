"use client";

import type { GripProfile } from "@/types/equipment";
import { ScoreMeter } from "./ScoreMeter";

export function GripFeelVisual({ grip }: { grip: GripProfile }) {
  const layers = Math.max(1, Math.round(grip.thicknessMm * 4));
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Handle cross-section
      </p>
      <div className="flex items-end gap-6">
        <svg viewBox="0 0 120 140" className="h-36 w-28" aria-hidden>
          {/* bevelled handle core */}
          <polygon
            points="40,20 80,20 95,50 95,110 60,130 25,110 25,50"
            fill="#1b4332"
            stroke="rgba(232,239,233,0.25)"
          />
          {/* grip layers */}
          {Array.from({ length: layers }).map((_, i) => {
            const inset = 4 + i * 3;
            return (
              <polygon
                key={i}
                points={`${40 - inset * 0.15},${20 - i} ${80 + inset * 0.15},${20 - i} ${95 + inset * 0.2},${50 - i * 0.3} ${95 + inset * 0.2},${110 + i * 0.2} 60,${130 + i * 0.4} ${25 - inset * 0.2},${110 + i * 0.2} ${25 - inset * 0.2},${50 - i * 0.3}`}
                fill="none"
                stroke={grip.kind === "overgrip" ? "#c8f560" : "#f4a261"}
                strokeOpacity={0.35 + i * 0.12}
                strokeWidth="2"
              />
            );
          })}
          <text x="60" y="78" textAnchor="middle" fill="#e8efe9" fontSize="11">
            {grip.thicknessMm.toFixed(2)} mm
          </text>
        </svg>
        <div className="flex-1 space-y-3">
          <ScoreMeter label="Tackiness" value={grip.tackiness} />
          <ScoreMeter label="Cushion" value={grip.cushion} accent="#f4a261" />
          <ScoreMeter label="Absorbency" value={grip.absorbency} accent="#7dd3fc" />
          <ScoreMeter label="Durability" value={grip.durability} accent="#e9c46a" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]/90">{grip.feel}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        <span className="text-[var(--accent)]">What makes it unique: </span>
        {grip.uniqueTrait}
      </p>
    </div>
  );
}
