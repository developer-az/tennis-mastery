"use client";

import { PLAYERS, STROKE_LABELS } from "@/data/players";
import { useCoachStore } from "@/store/coachStore";
import type { StrokeType } from "@/types/biomechanics";
import { PHASE_LABELS, sampleStroke } from "@/lib/kinematics";

const STROKES = Object.keys(STROKE_LABELS) as StrokeType[];

export function PlayerStrokePicker() {
  const playerId = useCoachStore((s) => s.playerId);
  const stroke = useCoachStore((s) => s.stroke);
  const setPlayer = useCoachStore((s) => s.setPlayer);
  const setStroke = useCoachStore((s) => s.setStroke);
  const player = PLAYERS.find((p) => p.id === playerId)!;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Athlete
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAYERS.map((p) => {
            const active = p.id === playerId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlayer(p.id)}
                aria-pressed={active}
                className="cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-all duration-200 hover:brightness-110"
                style={{
                  background: active ? p.color : "rgba(232,239,233,0.04)",
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
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Stroke
        </p>
        <div className="flex flex-wrap gap-2">
          {STROKES.map((s) => {
            const active = s === stroke;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStroke(s)}
                className="rounded-md px-3 py-1.5 text-sm transition-colors duration-200"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#0b1a14" : "var(--foreground)",
                  boxShadow: active ? "none" : "0 0 0 1px var(--line)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {STROKE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[var(--muted)]">{player.playingStyle}</p>
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

  const player = PLAYERS.find((p) => p.id === playerId)!;
  const stroke = player.strokes[strokeType];
  const pose = sampleStroke(stroke, t);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={togglePlaying}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)] text-[#0b1a14] transition hover:brightness-110"
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
          <div className="flex justify-between text-[11px] uppercase tracking-wider text-[var(--muted)]">
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
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[var(--muted)]">Speed</span>
        {[0.15, 0.35, 0.6, 1].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSpeed(v)}
            className="rounded px-2 py-0.5 text-xs transition"
            style={{
              background: speed === v ? "var(--line-strong)" : "transparent",
              boxShadow: "0 0 0 1px var(--line)",
            }}
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
      className="rounded-md px-2.5 py-1.5 text-xs transition"
      style={{
        background: on ? "var(--accent-dim)" : "transparent",
        boxShadow: "0 0 0 1px var(--line)",
        color: on ? "var(--accent)" : "var(--muted)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Visualization
      </p>
      <div className="flex flex-wrap gap-2">
        {toggle("Joint angles", showAngles, setShowAngles)}
        {toggle("Racket path", showRacketPath, setShowRacketPath)}
        {toggle("Ground force", showGroundForce, setShowGroundForce)}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["orbit", "side", "behind", "front"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setCameraMode(m)}
            className="rounded-md px-2.5 py-1.5 text-xs capitalize transition"
            style={{
              background: cameraMode === m ? "var(--line-strong)" : "transparent",
              boxShadow: "0 0 0 1px var(--line)",
            }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
