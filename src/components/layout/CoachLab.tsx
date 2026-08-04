"use client";

import dynamic from "next/dynamic";
import { PlayerStrokePicker, PlaybackControls, ViewToggles } from "@/components/ui/Controls";
import { MetricsPanel, SciencePanel } from "@/components/ui/MetricsPanel";

const FormCanvas = dynamic(
  () => import("@/components/scene/FormCanvas").then((m) => m.FormCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[#0b1a14] text-sm text-[var(--muted)]">
        Loading biomechanics viewport…
      </div>
    ),
  },
);

export function CoachLab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Left rail */}
      <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-b border-[var(--line)] bg-[var(--panel)] p-5 lg:w-[300px] lg:border-b-0 lg:border-r">
        <PlayerStrokePicker />
        <PlaybackControls />
        <ViewToggles />
      </aside>

      {/* 3D stage */}
      <section className="relative min-h-[52vh] flex-1 lg:min-h-0">
        <FormCanvas />
        <div className="pointer-events-none absolute left-4 top-4 max-w-xs">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Interactive 3D form
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Drag to orbit · scroll to zoom · scrub the timeline to freeze any phase
          </p>
        </div>
      </section>

      {/* Right rail */}
      <aside className="flex w-full shrink-0 flex-col gap-8 overflow-y-auto border-t border-[var(--line)] bg-[var(--panel)] p-5 lg:w-[320px] lg:border-l lg:border-t-0">
        <MetricsPanel />
        <SciencePanel />
      </aside>
    </div>
  );
}
