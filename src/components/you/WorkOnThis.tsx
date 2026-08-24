"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CombinedSetupInsight } from "@/lib/equipment/setupSynthesis";
import { assignDrills } from "@/lib/player/assignDrills";
import { drillById } from "@/data/player/drills";
import { usePlayerStore } from "@/store/playerStore";

export function WorkOnThis({ insight }: { insight: CombinedSetupInsight }) {
  const profile = usePlayerStore((s) => s.profile);
  const toggleDrillComplete = usePlayerStore((s) => s.toggleDrillComplete);

  const plan = useMemo(() => assignDrills({ profile, insight }), [profile, insight]);

  if (plan.drills.length === 0) {
    return (
      <section className="sf-panel p-4">
        <p className="sf-label">Work on this</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight">
          Nothing marked yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Play, then tap Play to recap what struggled — or browse rackets like a store aisle.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/gear?tab=rackets" className="sf-text-link">
            Browse rackets
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="sf-label">Work on this</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight">
          Marked from your last hit
        </h2>
      </div>
      {plan.drills.map((assigned) => {
        const drill = drillById(assigned.drillId);
        if (!drill) return null;
        return (
          <article key={assigned.drillId} className="sf-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                  {drill.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{drill.why}</p>
              </div>
              <button
                type="button"
                className="sf-chip shrink-0"
                data-active={assigned.completed ? "true" : "false"}
                onClick={() => toggleDrillComplete(assigned.drillId)}
              >
                {assigned.completed ? "Done" : "Mark done"}
              </button>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--foreground)]">
              {drill.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap gap-3">
              {drill.labHref ? (
                <Link href={drill.labHref} className="sf-text-link">
                  Rehearse in Lab
                </Link>
              ) : null}
              {drill.gearHref ? (
                <Link href={drill.gearHref} className="sf-text-link">
                  See gear
                </Link>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{assigned.reason}</p>
          </article>
        );
      })}
      {plan.gearNudge ? (
        <p className="text-sm text-[var(--muted)]">
          {plan.gearNudge.why}{" "}
          <Link href={plan.gearNudge.href} className="sf-text-link">
            {plan.gearNudge.label}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
