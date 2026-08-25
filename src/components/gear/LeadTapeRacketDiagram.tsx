"use client";

import { useId } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 320;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

/** Front-view frame: oval head, open V-throat, shaft, grip. Inner cutouts = bed + throat gap. */
const FRAME_OUTER = [
  "M 100 10",
  "C 138 10 162 34 162 72",
  "C 162 104 150 124 128 138",
  "L 114 152",
  "L 106 168",
  "L 100 174",
  "L 94 168",
  "L 86 152",
  "L 72 138",
  "C 50 124 38 104 38 72",
  "C 38 34 62 10 100 10",
  "Z",
].join(" ");

const STRINGBED = [
  "M 100 22",
  "C 130 22 148 40 148 72",
  "C 148 98 138 114 118 122",
  "C 106 126 94 126 82 122",
  "C 62 114 52 98 52 72",
  "C 52 40 70 22 100 22",
  "Z",
].join(" ");

/** Open throat — V under the hoop; without this hole the neck reads as a yoke. */
const THROAT_GAP = [
  "M 88 128",
  "L 112 128",
  "L 104 162",
  "L 96 162",
  "Z",
].join(" ");

const SHAFT = [
  "M 94 162",
  "L 106 162",
  "L 108 228",
  "L 92 228",
  "Z",
].join(" ");

export function LeadTapeRacketDiagram({
  pieces,
  selectedZone = null,
  interactive = true,
  onZoneClick,
}: {
  pieces: LeadTapePiece[];
  selectedZone?: LeadTapeZone | null;
  interactive?: boolean;
  onZoneClick?: (zone: LeadTapeZone) => void;
}) {
  const massByZone: Partial<Record<LeadTapeZone, number>> = {};
  for (const p of pieces) {
    massByZone[p.zone] = (massByZone[p.zone] ?? 0) + p.massG;
  }
  const totalG = pieces.reduce((n, p) => n + p.massG, 0);
  const uid = useId().replace(/:/g, "");

  return (
    <div className="relative mx-auto max-w-[220px]">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full drop-shadow-sm"
        role={interactive ? "group" : "img"}
        aria-label="Racket lead-tape diagram"
      >
        <defs>
          <linearGradient id={`ltFrame-${uid}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#3a3f46" />
            <stop offset="55%" stopColor="#25282d" />
            <stop offset="100%" stopColor="#32363c" />
          </linearGradient>
          <linearGradient id={`ltTape-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d4dce4" />
            <stop offset="50%" stopColor="#8b96a3" />
            <stop offset="100%" stopColor="#5a6570" />
          </linearGradient>
          <linearGradient id={`ltGrip-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a1c14" />
            <stop offset="50%" stopColor="#4a3224" />
            <stop offset="100%" stopColor="#2a1c14" />
          </linearGradient>
          <clipPath id={`ltBed-${uid}`}>
            <path d={STRINGBED} />
          </clipPath>
          <filter id={`ltSoft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Shadow plate */}
        <ellipse
          cx="100"
          cy="308"
          rx="28"
          ry="4"
          fill="color-mix(in srgb, var(--foreground) 8%, transparent)"
        />

        {/* Frame shell */}
        <path
          d={`${FRAME_OUTER} ${STRINGBED} ${THROAT_GAP}`}
          fill={`url(#ltFrame-${uid})`}
          fillRule="evenodd"
          filter={`url(#ltSoft-${uid})`}
        />
        <path
          d={FRAME_OUTER}
          fill="none"
          stroke="color-mix(in srgb, var(--foreground) 18%, transparent)"
          strokeWidth="1"
        />

        {/* Shaft between throat and handle */}
        <path d={SHAFT} fill={`url(#ltFrame-${uid})`} />

        {/* String bed */}
        <path
          d={STRINGBED}
          fill="color-mix(in srgb, var(--accent) 6%, var(--bg-scene))"
          stroke="color-mix(in srgb, var(--accent) 25%, transparent)"
          strokeWidth="0.8"
        />
        <g clipPath={`url(#ltBed-${uid})`} opacity="0.35">
          {Array.from({ length: 14 }).map((_, i) => {
            const x = 54 + (i + 0.5) * (92 / 14);
            return (
              <line
                key={`m${i}`}
                x1={x}
                y1="24"
                x2={x}
                y2="122"
                stroke="var(--foreground)"
                strokeWidth="0.35"
              />
            );
          })}
          {Array.from({ length: 17 }).map((_, i) => {
            const y = 26 + (i + 0.5) * (94 / 17);
            return (
              <line
                key={`c${i}`}
                x1="52"
                y1={y}
                x2="148"
                y2={y}
                stroke="var(--foreground)"
                strokeWidth="0.3"
              />
            );
          })}
        </g>

        {/* Grip */}
        <rect
          x="90"
          y="228"
          width="20"
          height="72"
          rx="4"
          fill={`url(#ltGrip-${uid})`}
        />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line
            key={`g${i}`}
            x1="91"
            y1={234 + i * 7}
            x2="109"
            y2={234 + i * 7}
            stroke="color-mix(in srgb, var(--foreground) 20%, transparent)"
            strokeWidth="0.5"
          />
        ))}
        <rect
          x="88"
          y="296"
          width="24"
          height="8"
          rx="3"
          fill="color-mix(in srgb, var(--foreground) 45%, var(--panel))"
        />

        {/* Metallic lead laps along the hoop when mass is present */}
        {(["tip", "twelve"] as LeadTapeZone[]).map((id) => {
          const mass = massByZone[id] ?? 0;
          if (mass <= 0) return null;
          const laps = Math.min(4, Math.max(1, Math.round(mass)));
          return Array.from({ length: laps }).map((_, i) => (
            <path
              key={`lap-top-${id}-${i}`}
              d={
                id === "tip"
                  ? `M ${78 - i} ${18 + i * 2} A ${22 + i} ${14 + i} 0 0 1 ${122 + i} ${18 + i * 2}`
                  : `M ${72 - i} ${28 + i * 2} A ${28 + i} ${16 + i} 0 0 1 ${128 + i} ${28 + i * 2}`
              }
              fill="none"
              stroke={`url(#ltTape-${uid})`}
              strokeWidth={2.2}
              strokeLinecap="round"
              opacity={0.85 - i * 0.12}
            />
          ));
        })}
        {(["three", "nine"] as LeadTapeZone[]).map((id) => {
          const mass = massByZone[id] ?? 0;
          if (mass <= 0) return null;
          const laps = Math.min(3, Math.max(1, Math.round(mass)));
          const right = id === "three";
          return Array.from({ length: laps }).map((_, i) => (
            <path
              key={`lap-side-${id}-${i}`}
              d={
                right
                  ? `M ${148 + i} ${48 + i} A ${14 + i} ${26 + i} 0 0 1 ${148 + i} ${108 - i}`
                  : `M ${52 - i} ${48 + i} A ${14 + i} ${26 + i} 0 0 0 ${52 - i} ${108 - i}`
              }
              fill="none"
              stroke={`url(#ltTape-${uid})`}
              strokeWidth={2.2}
              strokeLinecap="round"
              opacity={0.85 - i * 0.12}
            />
          ));
        })}

        {/* Tape zones — pills anchored on the frame */}
        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const onHoop = id !== "handle" && id !== "throat";
          const isSide = id === "three" || id === "nine";
          const hasTape = massHere > 0;
          const laps = hasTape && onHoop ? Math.max(1, Math.round(massHere)) : 0;

          const pillW = id === "handle" ? 22 : id === "throat" ? 24 : isSide ? 14 : 22;
          const pillH = id === "handle" ? 14 : id === "throat" ? 10 : isSide ? 22 : 10;
          const px = cx - pillW / 2;
          const py = cy - pillH / 2;

          const fill = hasTape
            ? `url(#ltTape-${uid})`
            : selected
              ? "color-mix(in srgb, var(--accent) 42%, transparent)"
              : "color-mix(in srgb, var(--foreground) 10%, var(--panel))";
          const stroke = selected
            ? "var(--accent)"
            : hasTape
              ? "#4a5560"
              : "color-mix(in srgb, var(--foreground) 22%, transparent)";

          const label = hasTape
            ? laps > 0
              ? `${massHere}g · ${laps}L`
              : `${massHere}g`
            : shortZone(id);
          const labelY = isSide ? cy + 3 : cy + (id === "handle" ? 4 : 3.5);

          return (
            <g
              key={id}
              style={{ cursor: interactive ? "pointer" : "default" }}
              onClick={interactive ? () => onZoneClick?.(id) : undefined}
            >
              <rect
                x={px}
                y={py}
                width={pillW}
                height={pillH}
                rx={pillH / 2}
                fill={fill}
                stroke={stroke}
                strokeWidth={selected ? 1.5 : 0.9}
              />
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fill={
                  hasTape
                    ? "#1a1f24"
                    : selected
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--foreground) 70%, var(--muted))"
                }
                fontSize={hasTape ? "6.5" : "8"}
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 text-center text-xs leading-relaxed text-[var(--muted)]">
        {interactive
          ? "Tap a zone to add a strip (~1 g ≈ one lap)."
          : totalG > 0
            ? `${totalG.toFixed(1)} g on frame`
            : "No lead tape yet"}
      </p>
    </div>
  );
}

function shortZone(id: LeadTapeZone): string {
  switch (id) {
    case "twelve":
      return "12";
    case "three":
      return "3";
    case "nine":
      return "9";
    case "tip":
      return "tip";
    case "throat":
      return "neck";
    case "handle":
      return "grip";
  }
}

/** Plan alias — realistic hoop map with metallic laps / zone taps. */
export const LeadTapeHoopMap = LeadTapeRacketDiagram;
