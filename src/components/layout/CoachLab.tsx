"use client";

import dynamic from "next/dynamic";
import { PlayerStrokePicker, PlaybackControls, ViewToggles } from "@/components/ui/Controls";
import { MetricsPanel, SciencePanel } from "@/components/ui/MetricsPanel";
import { PlayerGripCue } from "@/components/lab/PlayerGripCue";

const FormCanvas = dynamic(
  () => import("@/components/scene/FormCanvas").then((m) => m.FormCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--accent-ink)] text-sm text-[var(--muted)]">
        Loading biomechanics viewport…
      </div>
    ),
  },
);

export function CoachLab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-b border-[var(--line)] bg-[var(--panel)] p-5 lg:w-[300px] lg:border-b-0 lg:border-r lg:p-6">
          <div>
            <p className="sf-kicker">Form lab</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Athlete · stroke · playback</p>
          </div>
          <PlayerStrokePicker />
          <PlaybackControls />
          <ViewToggles />
          <PlayerGripCue />
        </aside>

        <section className="relative min-h-[52vh] flex-1 lg:min-h-0">
          <FormCanvas />
          <div className="pointer-events-none absolute left-4 top-4 max-w-xs border border-[var(--line)] bg-[var(--background)]/80 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Interactive 3D
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Faces the net · drag to orbit · scrub any phase
            </p>
          </div>
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-8 overflow-y-auto border-t border-[var(--line)] bg-[var(--panel)] p-5 lg:w-[320px] lg:border-l lg:border-t-0 lg:p-6">
          <MetricsPanel />
          <SciencePanel />
        </aside>
      </div>
    </div>
  );
}
