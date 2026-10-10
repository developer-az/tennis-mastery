"use client";

import { PLAYERS } from "@/data/players";
import { PHASE_LABELS, sampleStroke } from "@/lib/kinematics";
import { useCoachStore } from "@/store/coachStore";

const PLATES: { phase: keyof typeof PHASE_LABELS; note: string }[] = [
  { phase: "ready", note: "Athletic base" },
  { phase: "trophy", note: "Toss + sit" },
  { phase: "contact", note: "Extension" },
  { phase: "followThrough", note: "Pronation / WW" },
];

/** Generated phase stills — not match footage. */
export function LabReferencePlate() {
  const playerId = useCoachStore((s) => s.playerId);
  const strokeType = useCoachStore((s) => s.stroke);
  const t = useCoachStore((s) => s.t);
  const player = PLAYERS.find((p) => p.id === playerId) ?? PLAYERS[0];
  const stroke = player.strokes[strokeType];
  const live = sampleStroke(stroke, t);
  const marks = stroke.keyframes.map((k) => k.phase);

  return (
    <div className="sf-panel p-3">
      <p className="font-mono text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
        Reference plate
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Authored stills · {player.shortName} {stroke.type} · live {PHASE_LABELS[live.phase]}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {PLATES.filter((p) => marks.includes(p.phase) || p.phase === "ready" || p.phase === "contact").map((p) => {
          const active = live.phase === p.phase;
          return (
            <div
              key={p.phase}
              className="border border-[var(--line)] p-2"
              style={{
                boxShadow: active ? "inset 0 0 0 1px var(--accent)" : undefined,
              }}
            >
              <svg viewBox="0 0 40 48" className="mx-auto h-12 w-10" aria-hidden>
                <line x1="20" y1="12" x2="20" y2="28" stroke="var(--foreground)" strokeWidth="1.2" />
                <circle cx="20" cy="8" r="3" fill="none" stroke="var(--foreground)" strokeWidth="1.2" />
                <line
                  x1="20"
                  y1="16"
                  x2={p.phase === "trophy" ? "28" : p.phase === "contact" ? "34" : "30"}
                  y2={p.phase === "trophy" ? "6" : p.phase === "followThrough" ? "10" : "18"}
                  stroke="var(--accent)"
                  strokeWidth="1.4"
                />
                <line x1="20" y1="28" x2="14" y2="42" stroke="var(--foreground)" strokeWidth="1.2" />
                <line x1="20" y1="28" x2="26" y2="42" stroke="var(--foreground)" strokeWidth="1.2" />
              </svg>
              <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[var(--muted)] uppercase">
                {PHASE_LABELS[p.phase]}
              </p>
              <p className="text-[10px] text-[var(--foreground)]">{p.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
