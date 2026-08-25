"use client";

import dynamic from "next/dynamic";
import {
  PlayerStrokePicker,
  PlaybackControls,
  PlaybackDock,
  ViewToggles,
} from "@/components/ui/Controls";
import { MetricsPanel, SciencePanel } from "@/components/ui/MetricsPanel";
import { PlayerGripCue } from "@/components/lab/PlayerGripCue";
import { LabPhaseOverlay } from "@/components/lab/LabPhaseOverlay";
import { CourtLoading } from "@/components/ui/CourtState";

const FormCanvas = dynamic(
  () => import("@/components/scene/FormCanvas").then((m) => m.FormCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] items-center justify-center bg-[var(--bg-scene)] lg:min-h-[420px]">
        <CourtLoading
          label="Loading biomechanics viewport…"
          detail="Keyframed joint rails and court scale — orbit when ready."
        />
      </div>
    ),
  },
);

export function CoachLab() {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <aside className="order-2 flex w-full shrink-0 flex-col gap-5 border-b border-[var(--line)] bg-[var(--panel)] p-4 lg:order-1 lg:w-[300px] lg:gap-6 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-6">
          <div className="hidden lg:block">
            <p className="sf-kicker">Form lab</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Pick an athlete and stroke. Scrub phases — coaching cues update live.
            </p>
          </div>
          <PlayerStrokePicker />
          <div className="hidden lg:block">
            <PlaybackControls />
          </div>
          <ViewToggles />
          <PlayerGripCue />
        </aside>

        <section className="relative order-1 z-10 h-[calc(100svh-var(--header-h)-12rem)] min-h-[280px] w-full shrink-0 overflow-hidden bg-[var(--bg-scene)] max-lg:sticky max-lg:top-0 lg:order-2 lg:z-auto lg:h-auto lg:min-h-0 lg:flex-1">
          <FormCanvas />
          <LabPhaseOverlay />
          <div className="absolute inset-x-0 bottom-0 z-20 lg:hidden">
            <p className="pointer-events-none px-3 pb-1 text-center text-[11px] text-[var(--muted)]">
              Drag to orbit · pinch to zoom · swipe athletes below
            </p>
            <PlaybackDock />
          </div>
        </section>

        <aside className="order-3 flex w-full shrink-0 flex-col gap-8 border-t border-[var(--line)] bg-[var(--panel)] p-4 lg:w-[320px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-6">
          <MetricsPanel />
          <SciencePanel />
        </aside>
      </div>
    </div>
  );
}
