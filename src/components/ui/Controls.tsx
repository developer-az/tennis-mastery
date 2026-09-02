"use client";

import { PLAYERS, STROKE_LABELS } from "@/data/players";
import { HScroll } from "@/components/gear/CatalogShop";
import { useCoachStore } from "@/store/coachStore";
import type { StrokeType } from "@/types/biomechanics";
import { PHASE_LABELS, sampleStroke } from "@/lib/kinematics";

const STROKES = Object.keys(STROKE_LABELS) as StrokeType[];

const CAMERA_LABELS: Record<
  "orbit" | "side" | "behind" | "front" | "firstPerson",
  string
> = {
  orbit: "Orbit",
  side: "Side",
  behind: "Behind",
  front: "Front (net)",
  firstPerson: "First-person",
};

export function PlayerStrokePicker() {
  const playerId = useCoachStore((s) => s.playerId);
  const stroke = useCoachStore((s) => s.stroke);
  const setPlayer = useCoachStore((s) => s.setPlayer);
  const setStroke = useCoachStore((s) => s.setStroke);
  const player = PLAYERS.find((p) => p.id === playerId) ?? PLAYERS[0];

  return (
    <div className="space-y-5">
      <div>
        <p className="sf-label mb-2">Athlete</p>
        <HScroll className="sf-chip-row lg:flex-wrap lg:overflow-visible">
          {PLAYERS.map((p) => {
            const active = p.id === playerId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlayer(p.id)}
                aria-pressed={active}
                className="sf-chip cursor-pointer text-left"
                style={{
                  background: active ? p.color : "var(--overlay-hover)",
                  color: active ? "#f8f6f0" : "var(--foreground)",
                  outline: active ? `2px solid ${p.accent}` : "1px solid var(--line)",
                  outlineOffset: 0,
                }}
              >
                <span className="block font-medium leading-tight">{p.shortName}</span>
                <span className="block text-[10px] opacity-70">{p.nationality}</span>
              </button>
            );
          })}
        </HScroll>
      </div>

      <div>
        <p className="sf-label mb-2">Stroke</p>
        <HScroll className="sf-chip-row lg:flex-wrap lg:overflow-visible">
          {STROKES.map((s) => {
            const active = s === stroke;
            const label = player.strokes[s]?.label ?? STROKE_LABELS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStroke(s)}
                aria-pressed={active}
                title={label}
                className="sf-chip"
                data-active={active ? "true" : "false"}
              >
                {STROKE_LABELS[s]}
              </button>
            );
          })}
        </HScroll>
        <p className="mt-2 text-xs text-[var(--accent)]">
          {player.strokes[stroke]?.label ?? STROKE_LABELS[stroke]}
        </p>
      </div>

      <p className="hidden text-sm leading-relaxed text-[var(--muted)] lg:block">{player.playingStyle}</p>
    </div>
  );
}

export function PlaybackDock() {
  const t = useCoachStore((s) => s.t);
  const playing = useCoachStore((s) => s.playing);
  const setT = useCoachStore((s) => s.setT);
  const togglePlaying = useCoachStore((s) => s.togglePlaying);
  const setPlaying = useCoachStore((s) => s.setPlaying);
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const player = PLAYERS.find((p) => p.id === playerId) ?? PLAYERS[0];
  const stroke = player.strokes[strokeType];
  const pose = sampleStroke(stroke, t);

  return (
    <div className="pointer-events-auto border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-3 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlaying}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-ink)]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="3.5" height="10" rx="0.5" />
              <rect x="8.5" y="2" width="3.5" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 2.5v9l9-4.5-9-4.5z" />
            </svg>
          )}
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Scrub stroke phase</span>
          <div className="flex justify-between text-[11px] text-[var(--muted)]">
            <span>{PHASE_LABELS[pose.phase]}</span>
            <span>{Math.round(t * 100)}%</span>
          </div>
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
            className="mt-1 w-full accent-[var(--accent)]"
          />
        </label>
      </div>
    </div>
  );
}

export function PlaybackControls() {
  const t = useCoachStore((s) => s.t);
  const playing = useCoachStore((s) => s.playing);
  const speed = useCoachStore((s) => s.speed);
  const setT = useCoachStore((s) => s.setT);
  const togglePlaying = useCoachStore((s) => s.togglePlaying);
  const setSpeed = useCoachStore((s) => s.setSpeed);
  const setPlaying = useCoachStore((s) => s.setPlaying);
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);

  const player = PLAYERS.find((p) => p.id === playerId) ?? PLAYERS[0];
  const stroke = player.strokes[strokeType];
  const pose = sampleStroke(stroke, t);
  const contactT = stroke.keyframes.find((k) => k.phase === "contact")?.t ?? 0.72;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={togglePlaying}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-ink)]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="3.5" height="10" rx="0.5" />
              <rect x="8.5" y="2" width="3.5" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 2.5v9l9-4.5-9-4.5z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-[11px] text-[var(--muted)]">
            <span>{PHASE_LABELS[pose.phase]}</span>
            <span>{Math.round(t * 100)}%</span>
          </div>
          <div className="relative mt-1">
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
              className="relative z-10 w-full accent-[var(--accent)]"
              aria-label="Scrub stroke phase"
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-0 -translate-y-1/2"
              aria-hidden
            >
              {stroke.keyframes.map((kf) => (
                <span
                  key={`${kf.phase}-${kf.t}`}
                  className="absolute h-1.5 w-px -translate-x-1/2 bg-[var(--line-strong)]"
                  style={{ left: `${kf.t * 100}%` }}
                  title={PHASE_LABELS[kf.phase]}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setT(contactT);
              }}
              className="sf-chip"
            >
              Jump to contact
            </button>
            {(["ready", "acceleration", "followThrough"] as const).map((phase) => {
              const frame = stroke.keyframes.find((k) => k.phase === phase);
              if (!frame) return null;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setT(frame.t);
                  }}
                  className="sf-chip"
                >
                  {PHASE_LABELS[phase]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[var(--muted)]">Speed</span>
        {[0.15, 0.35, 0.6, 1].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSpeed(v)}
            aria-pressed={speed === v}
            className="sf-chip"
            data-active={speed === v ? "true" : "false"}
          >
            {v === 1 ? "1×" : `${v}×`}
          </button>
        ))}
      </div>
      <p className="text-sm leading-snug text-[var(--foreground)]/90">{pose.coachingCue}</p>
    </div>
  );
}

export function ViewToggles() {
  const showAngles = useCoachStore((s) => s.showAngles);
  const showRacketPath = useCoachStore((s) => s.showRacketPath);
  const showGroundForce = useCoachStore((s) => s.showGroundForce);
  const cameraMode = useCoachStore((s) => s.cameraMode);
  const setShowAngles = useCoachStore((s) => s.setShowAngles);
  const setShowRacketPath = useCoachStore((s) => s.setShowRacketPath);
  const setShowGroundForce = useCoachStore((s) => s.setShowGroundForce);
  const setCameraMode = useCoachStore((s) => s.setCameraMode);

  const toggle = (
    label: string,
    on: boolean,
    set: (v: boolean) => void,
  ) => (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-pressed={on}
      className="sf-chip"
      data-active={on ? "true" : "false"}
    >
      {label}
    </button>
  );

  return (
    <details className="space-y-3">
      <summary className="sf-label cursor-pointer">
        View
      </summary>
      <div className="mt-3 space-y-3">
      <p className="sf-label">Visualization</p>
      <div className="flex flex-wrap gap-2">
        {toggle("Joint angles", showAngles, setShowAngles)}
        {toggle("Racket path", showRacketPath, setShowRacketPath)}
        {toggle("Ground force", showGroundForce, setShowGroundForce)}
      </div>
      <p className="sf-label">Camera</p>
      <div className="flex flex-wrap gap-2">
        {(["orbit", "side", "behind", "front", "firstPerson"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setCameraMode(m)}
            aria-pressed={cameraMode === m}
            title={
              m === "orbit"
                ? "Free orbit — drag to rotate"
                : m === "side"
                  ? "Side-on coaching angle"
                  : m === "behind"
                    ? "Behind the athlete looking to the net"
                    : m === "front"
                      ? "From the net looking back at the athlete"
                      : "Over the hitting shoulder — map hand and face angle"
            }
            className="sf-chip"
            data-active={cameraMode === m ? "true" : "false"}
          >
            {CAMERA_LABELS[m]}
          </button>
        ))}
      </div>
      </div>
    </details>
  );
}
