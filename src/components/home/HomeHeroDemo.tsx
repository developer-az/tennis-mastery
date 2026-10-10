"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { PLAYERS } from "@/data/players";
import { PHASE_LABELS } from "@/lib/kinematics";
import { sampleMotion } from "@/lib/motion/sample";
import { getMotionClip } from "@/data/motion";
import { useCoachStore } from "@/store/coachStore";
import { HomeHeroCtas } from "@/components/home/HomeHeroCtas";

const FormCanvas = dynamic(
  () => import("@/components/scene/FormCanvas").then((m) => m.FormCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="sf-hero-canvas-skeleton absolute inset-0" aria-hidden>
        <div className="sf-hero-canvas-skeleton-pulse" />
      </div>
    ),
  },
);

function HeroDemoChrome() {
  const t = useCoachStore((s) => s.t);
  const playing = useCoachStore((s) => s.playing);
  const setT = useCoachStore((s) => s.setT);
  const togglePlaying = useCoachStore((s) => s.togglePlaying);
  const setPlaying = useCoachStore((s) => s.setPlaying);
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);

  const player = PLAYERS.find((p) => p.id === playerId) ?? PLAYERS[0];
  const stroke = player.strokes[strokeType];
  const clip = getMotionClip(stroke.clipId ?? `${player.id}/${strokeType}`);
  const pose = clip ? sampleMotion(clip, stroke, player.anthropometrics, t) : null;
  const phase = pose?.phase ?? stroke.keyframes[0]?.phase ?? "ready";
  const cue = pose?.coachingCue ?? "";
  const elbow = pose?.angles.elbowFlexion ?? 0;
  const knee = pose?.angles.leadKneeFlexion ?? 0;
  const trunk = pose ? Math.abs(pose.angles.spineTwist) : 0;

  return (
    <div className="sf-hero-demo-chrome pointer-events-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight md:text-base">
            {player.shortName} · {PHASE_LABELS[phase]}
          </p>
          <p className="mt-0.5 max-w-md truncate text-xs text-[var(--muted)] md:text-[13px]">
            {cue}
          </p>
        </div>
        <div className="flex gap-4 tabular-nums">
          <JointReadout label="Elbow" value={Math.round(elbow)} />
          <JointReadout label="Knee" value={Math.round(knee)} />
          <JointReadout label="Trunk" value={Math.round(trunk)} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlaying}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-fg)] transition hover:brightness-110 active:scale-[0.97]"
          aria-label={playing ? "Pause stroke" : "Play stroke"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
              <rect x="2" y="2" width="3.5" height="10" rx="0.5" />
              <rect x="8.5" y="2" width="3.5" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
              <path d="M3 2.5v9l9-4.5-9-4.5z" />
            </svg>
          )}
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Scrub stroke phase</span>
          <div className="relative">
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              className="sf-hero-scrub w-full"
              aria-valuetext={PHASE_LABELS[phase]}
            />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0 -translate-y-1/2" aria-hidden>
              {stroke.keyframes.map((kf) => (
                <span
                  key={`${kf.phase}-${kf.t}`}
                  className="absolute h-2 w-px -translate-x-1/2 bg-[var(--line-strong)]"
                  style={{ left: `${kf.t * 100}%` }}
                />
              ))}
            </div>
          </div>
        </label>
        <Link
          href="/lab"
          className="hidden shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--accent)] uppercase transition hover:text-[var(--foreground)] sm:inline"
        >
          Full lab →
        </Link>
      </div>
    </div>
  );
}

function JointReadout({
  label,
  value,
  unit = "°",
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-none tracking-tight md:text-xl">
        {value}
        <span className="ml-0.5 text-xs font-sans font-medium text-[var(--muted)]">{unit}</span>
      </p>
    </div>
  );
}

/** Full-bleed Form Lab demo — prowess first, personalization later. */
export function HomeHeroDemo() {
  useEffect(() => {
    const store = useCoachStore.getState();
    store.setPlaying(true);
    store.setShowAngles(true);
    store.setShowRacketPath(true);
    store.setCameraMode("orbit");
    if (store.speed < 0.25) store.setSpeed(0.35);
  }, []);

  return (
    <section className="sf-hero-stage relative isolate min-h-[calc(100dvh-var(--header-h))] overflow-hidden">
      <div className="absolute inset-0 bg-[var(--bg-scene)]">
        <div className="sf-hero-demo-canvas absolute inset-0">
          <FormCanvas variant="hero" />
        </div>
      </div>

      <div className="sf-hero-stage-wash pointer-events-none absolute inset-0" aria-hidden />
      <div className="sf-hero-stage-grain pointer-events-none absolute inset-0" aria-hidden />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100dvh-var(--header-h))] w-full max-w-[var(--page-max-wide)] flex-col justify-between px-6 pb-[7.5rem] pt-10 md:px-10 md:pb-36 md:pt-14 lg:px-14">
        <div className="pointer-events-auto max-w-xl sf-rise">
          <p className="font-[family-name:var(--font-display)] text-[clamp(3.25rem,12vw,7.5rem)] font-bold leading-[0.88] tracking-[-0.04em] text-[var(--foreground)]">
            RACKET
            <br />
            FORM
          </p>
          <h1 className="mt-5 max-w-md text-lg font-medium leading-snug text-[var(--foreground)] md:text-xl md:leading-snug">
            Stroke clips. Planted feet. Measured path.
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">
            Same clip sampler as the lab. Scrub the rail. Orbit on desktop — the viewport will not
            steal the page.
          </p>
          <HomeHeroCtas />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 md:px-10 md:pb-6 lg:px-14">
        <div className="mx-auto max-w-[var(--page-max-wide)]">
          <HeroDemoChrome />
        </div>
      </div>
    </section>
  );
}
