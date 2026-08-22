"use client";

import type { FrameIntelligence } from "@/lib/equipment/strokeformIntel";

export function IntelSkillLadder({ intel }: { intel: FrameIntelligence }) {
  const { floor, ceiling, demand } = intel.skill;
  return (
    <div className="sf-intel-ladder">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sf-label">Skill span</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {floor}
            <span className="mx-1 text-[var(--muted)]">→</span>
            {ceiling}
            <span className="ml-2 text-sm font-medium text-[var(--muted)]">/100</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{intel.skill.label}</p>
        </div>
        <div className="text-right">
          <p className="sf-label">Demand</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
            {demand}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">punishes late contact</p>
        </div>
      </div>
      <div className="relative mt-5 h-2 bg-[color-mix(in_srgb,var(--foreground)_08%,transparent)]">
        <div
          className="absolute inset-y-0 bg-[var(--accent)]/35"
          style={{ left: `${floor}%`, width: `${Math.max(2, ceiling - floor)}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[var(--accent)]"
          style={{ left: `${floor}%` }}
          title="Floor — entry level"
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[var(--foreground)]"
          style={{ left: `${ceiling}%` }}
          title="Ceiling — competitive limit"
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] tracking-[0.08em] text-[var(--muted)] uppercase">
        <span>Entry</span>
        <span>Competitive ceiling</span>
      </div>
    </div>
  );
}
