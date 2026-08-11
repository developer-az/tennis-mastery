"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { LeadTapePiece, LeadTapeZone, RacketProfile } from "@/types/equipment";
import {
  LEAD_TAPE_MASS_PRESETS,
  LEAD_TAPE_ZONES,
  computeLeadTapeEffect,
  createLeadTapePiece,
  snapToNearestZone,
} from "@/lib/equipment/leadTape";
import { useGearStore } from "@/store/gearStore";
import { LaunchAngleVisual, SwingPathVisual } from "./RacketVisuals";

const VB_W = 200;
const VB_H = 280;

export function LeadTapeLab({ rackets }: { rackets: RacketProfile[] }) {
  const setup = useGearStore((s) => s.setup);
  const setLeadTapePieces = useGearStore((s) => s.setLeadTapePieces);
  const pieces = useMemo(() => setup.leadTape?.pieces ?? [], [setup.leadTape?.pieces]);

  const baseRacket = useMemo(() => {
    if (setup.racketSlug) {
      const found = rackets.find((r) => r.slug === setup.racketSlug);
      if (found) return found;
    }
    return rackets[0] ?? null;
  }, [rackets, setup.racketSlug]);

  const [massPreset, setMassPreset] = useState<(typeof LEAD_TAPE_MASS_PRESETS)[number]>(1);
  const [dragId, setDragId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const effect = useMemo(
    () =>
      baseRacket
        ? computeLeadTapeEffect(baseRacket, pieces)
        : null,
    [baseRacket, pieces],
  );

  const updatePieces = useCallback(
    (next: LeadTapePiece[]) => {
      setLeadTapePieces(next);
    },
    [setLeadTapePieces],
  );

  const addAtZone = (zone: LeadTapeZone) => {
    updatePieces([...pieces, createLeadTapePiece(massPreset, zone)]);
  };

  const removePiece = (id: string) => {
    updatePieces(pieces.filter((p) => p.id !== id));
  };

  const clearAll = () => updatePieces([]);

  const clientToNorm = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0.5, y: 0.3 };
    const rect = svg.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
    const y = Math.max(0.05, Math.min(0.95, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const onPointerDownPiece = (e: ReactPointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragId(id);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragId) return;
    const { x, y } = clientToNorm(e.clientX, e.clientY);
    const zone = snapToNearestZone(x, y);
    const z = LEAD_TAPE_ZONES[zone];
    // Soft snap: blend toward zone center when close
    const dx = z.x - x;
    const dy = z.y - y;
    const dist = Math.hypot(dx, dy);
    const snap = dist < 0.08;
    updatePieces(
      pieces.map((p) =>
        p.id === dragId
          ? {
              ...p,
              x: snap ? z.x : x,
              y: snap ? z.y : y,
              zone,
            }
          : p,
      ),
    );
  };

  const onPointerUp = () => setDragId(null);

  if (!baseRacket || !effect) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Load a racket catalog to customize lead tape.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Lead tape lab
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Customize {baseRacket.brand} {baseRacket.model}
          </h3>
          <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
            {setup.racketSlug
              ? "Using your saved frame. Add strips, drag them on the diagram, and watch launch angle and swing path update."
              : "Save a racket to My setup for your exact frame — showing the first catalog frame as a demo base."}
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Strip mass</span>
          {LEAD_TAPE_MASS_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={massPreset === m}
              onClick={() => setMassPreset(m)}
              className="rounded-md px-3 py-1.5 text-sm tabular-nums transition"
              style={{
                background: massPreset === m ? "var(--accent-dim)" : "transparent",
                color: massPreset === m ? "var(--accent)" : "var(--foreground)",
                boxShadow: "0 0 0 1px var(--line)",
              }}
            >
              {m} g
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded-md px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
            style={{ boxShadow: "0 0 0 1px var(--line)" }}
          >
            Clear all
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEAD_TAPE_ZONES) as LeadTapeZone[]).map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => addAtZone(zone)}
              className="rounded-md px-2.5 py-1.5 text-xs transition hover:bg-white/5"
              style={{ boxShadow: "0 0 0 1px var(--line)" }}
              title={LEAD_TAPE_ZONES[zone].hint}
            >
              + {LEAD_TAPE_ZONES[zone].label}
            </button>
          ))}
        </div>

        <div
          className="relative mx-auto max-w-sm select-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-auto w-full touch-none"
            role="img"
            aria-label="Racket lead tape diagram"
          >
            <defs>
              <linearGradient id="ltFrame" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d6a4f" />
                <stop offset="100%" stopColor="#1b4332" />
              </linearGradient>
            </defs>
            <rect width={VB_W} height={VB_H} fill="#0a1410" rx="4" />
            {/* Hoop */}
            <ellipse
              cx="100"
              cy="88"
              rx="58"
              ry="70"
              fill="#0d1f18"
              stroke="url(#ltFrame)"
              strokeWidth="8"
            />
            {/* Throat + handle */}
            <path
              d="M 90 150 L 92 210 L 108 210 L 110 150 Z"
              fill="#1b4332"
              stroke="#2d6a4f"
              strokeWidth="2"
            />
            <rect x="93" y="208" width="14" height="52" rx="3" fill="#152820" stroke="#c8f560" strokeWidth="1" />

            {/* Zone markers */}
            {(Object.entries(LEAD_TAPE_ZONES) as [LeadTapeZone, (typeof LEAD_TAPE_ZONES)[LeadTapeZone]][]).map(
              ([id, z]) => (
                <g key={id} opacity="0.45">
                  <circle
                    cx={z.x * VB_W}
                    cy={z.y * VB_H}
                    r="10"
                    fill="none"
                    stroke="rgba(200,245,96,0.5)"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={z.x * VB_W}
                    y={z.y * VB_H + 22}
                    textAnchor="middle"
                    fill="rgba(232,239,233,0.4)"
                    fontSize="7"
                  >
                    {id}
                  </text>
                </g>
              ),
            )}

            {/* Tape pieces */}
            {pieces.map((p) => {
              const w = 14 + p.massG * 4;
              const h = 6 + p.massG * 1.5;
              return (
                <g
                  key={p.id}
                  transform={`translate(${p.x * VB_W}, ${p.y * VB_H})`}
                  style={{ cursor: dragId === p.id ? "grabbing" : "grab" }}
                  onPointerDown={(e) => onPointerDownPiece(e, p.id)}
                >
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx="2"
                    fill="#c8f560"
                    stroke="#0b1a14"
                    strokeWidth="1"
                    opacity={dragId === p.id ? 1 : 0.92}
                  >
                    <title>
                      {p.massG}g @ {LEAD_TAPE_ZONES[p.zone].label} — drag to move, or remove below
                    </title>
                  </rect>
                  <text
                    y="1"
                    textAnchor="middle"
                    fill="#0b1a14"
                    fontSize="6"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {p.massG}g
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Drag strips on the racket. They snap to tip, 12, 3/9, throat, or handle.
          </p>
        </div>

        {pieces.length > 0 && (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
            {pieces.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="tabular-nums text-[var(--accent)]">{p.massG} g</span>
                  <span className="text-[var(--muted)]"> · {LEAD_TAPE_ZONES[p.zone].label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removePiece(p.id)}
                  className="text-xs text-[var(--muted)] transition hover:text-[var(--amber)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-8">
        <div
          className="grid gap-3 sm:grid-cols-2"
          style={{ animation: "rise 0.4s ease-out both" }}
        >
          <Stat
            label="Added mass"
            value={`${effect.addedMassG} g`}
            hint="Total lead tape on the frame"
          />
          <Stat
            label="Δ Swingweight"
            value={`${effect.deltaSwingweight >= 0 ? "+" : ""}${effect.deltaSwingweight}`}
            hint={`Effective SW ~ ${effect.swingweight}`}
          />
          <Stat
            label="Δ Balance"
            value={`${effect.deltaBalanceMm >= 0 ? "+" : ""}${effect.deltaBalanceMm} mm`}
            hint={`Balance ~ ${effect.balanceMm} mm`}
          />
          <Stat
            label="Total weight"
            value={`${effect.weightG} g`}
            hint={`From ${baseRacket.weightG ?? "—"} g unstrung base`}
          />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <LaunchAngleVisual degrees={effect.launchAngleDeg} />
            <p className="mt-2 text-xs tabular-nums text-[var(--muted)]">
              Base {baseRacket.idealLaunchAngleDeg}°
              {effect.deltaLaunchDeg !== 0
                ? ` · ${effect.deltaLaunchDeg > 0 ? "+" : ""}${effect.deltaLaunchDeg}° with tape`
                : " · unchanged"}
            </p>
          </div>
          <div>
            <SwingPathVisual degrees={effect.swingPathDeg} />
            <p className="mt-2 text-xs tabular-nums text-[var(--muted)]">
              Base {baseRacket.idealSwingPathDeg}°
              {effect.deltaSwingPathDeg !== 0
                ? ` · ${effect.deltaSwingPathDeg > 0 ? "+" : ""}${effect.deltaSwingPathDeg}° with tape`
                : " · unchanged"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
            What this does
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
            {effect.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Coaching-grade model for learning — not a TWU lab measurement. Tape layout is saved
            with My setup in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-md px-3 py-3"
      style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}
