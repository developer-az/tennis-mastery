"use client";

import { useId } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 280;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

/**
 * One evenodd silhouette: closed isometric head, open V-throat into a neck,
 * then shaft + grip. Inner path is the stringbed hole.
 */
const FRAME_OUTER = [
  "M 100 16",
  "C 118 14 140 18 148 46",
  "C 156 70 156 98 146 120",
  "C 138 134 126 140 118 152",
  "C 112 164 109 176 108 190",
  "L 109 210",
  "L 111 218",
  "L 112 256",
  "C 112 262 118 264 114 274",
  "L 86 274",
  "C 82 264 88 262 88 256",
  "L 89 218",
  "L 91 210",
  "L 92 190",
  "C 91 176 88 164 82 152",
  "C 74 140 62 134 54 120",
  "C 44 98 44 70 52 46",
  "C 60 18 82 14 100 16",
  "Z",
].join(" ");

const STRINGBED = [
  "M 100 26",
  "C 116 24 132 28 138 52",
  "C 144 74 144 96 136 114",
  "C 128 126 112 128 100 128",
  "C 88 128 72 126 64 114",
  "C 56 96 56 74 62 52",
  "C 68 28 84 24 100 26",
  "Z",
].join(" ");

/** Open throat — the V under the hoop; without this hole the neck reads as a yoke. */
const THROAT_GAP = [
  "M 86 134",
  "L 114 134",
  "L 106 176",
  "L 94 176",
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
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role={interactive ? "group" : "img"}
        aria-label="Racket lead-tape diagram"
      >
        <defs>
          <linearGradient id={`ltGraphite-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5e5e5e" />
            <stop offset="40%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#2f2f2f" />
          </linearGradient>
          <linearGradient id={`ltMetal-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8eaed" />
            <stop offset="55%" stopColor="#9aa3ab" />
            <stop offset="100%" stopColor="#5c656e" />
          </linearGradient>
          <linearGradient id={`ltGrip-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a1c14" />
            <stop offset="50%" stopColor="#4a3224" />
            <stop offset="100%" stopColor="#2a1c14" />
          </linearGradient>
          <clipPath id={`ltBed-${uid}`}>
            <path d={STRINGBED} />
          </clipPath>
          <clipPath id={`ltHandle-${uid}`}>
            <rect x="88" y="216" width="24" height="44" rx="3" />
          </clipPath>
        </defs>

        <path
          d={`${FRAME_OUTER} ${STRINGBED} ${THROAT_GAP}`}
          fill={`url(#ltGraphite-${uid})`}
          fillRule="evenodd"
        />
        <path d={STRINGBED} fill="none" stroke="#2a4a3a" strokeWidth="1.2" />

        <g clipPath={`url(#ltBed-${uid})`} opacity="0.48">
          {Array.from({ length: 16 }).map((_, i) => {
            const x = 62 + (i + 0.5) * (76 / 16);
            return (
              <line
                key={`m${i}`}
                x1={x}
                y1="26"
                x2={x}
                y2="128"
                stroke="var(--foreground)"
                strokeWidth="0.4"
              />
            );
          })}
          {Array.from({ length: 19 }).map((_, i) => {
            const y = 28 + (i + 0.5) * (100 / 19);
            return (
              <line
                key={`c${i}`}
                x1="60"
                y1={y}
                x2="140"
                y2={y}
                stroke="var(--foreground)"
                strokeWidth="0.35"
              />
            );
          })}
        </g>

        <g clipPath={`url(#ltHandle-${uid})`}>
          <rect x="88" y="216" width="24" height="44" fill={`url(#ltGrip-${uid})`} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line
              key={`g${i}`}
              x1="89"
              y1={222 + i * 5.5}
              x2="111"
              y2={222 + i * 5.5}
              stroke="#1a120c"
              strokeWidth="0.55"
              opacity="0.4"
            />
          ))}
        </g>
        <ellipse cx="100" cy="271.5" rx="13" ry="2.2" fill="#0a0a0a" />

        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const vertical = id === "three" || id === "nine";
          const w = id === "throat" ? 20 : vertical ? 6 : 20;
          const h = id === "throat" ? 7.5 : vertical ? 20 : 6.5;
          const labelX = vertical ? cx + (id === "three" ? 12 : -12) : cx;
          const labelY = vertical ? cy + 4 : cy + 14;
          const fill = massHere > 0
            ? `url(#ltMetal-${uid})`
            : selected
              ? "color-mix(in srgb, var(--accent) 38%, transparent)"
              : "color-mix(in srgb, var(--foreground) 14%, transparent)";
          const stroke = selected
            ? "var(--accent)"
            : massHere > 0
              ? "#3a3a3a"
              : "color-mix(in srgb, var(--foreground) 30%, transparent)";
          return (
            <g
              key={id}
              style={{ cursor: interactive ? "pointer" : "default" }}
              onClick={interactive ? () => onZoneClick?.(id) : undefined}
            >
              <rect
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                rx="1.3"
                fill={fill}
                stroke={stroke}
                strokeWidth={selected ? 1.6 : 0.85}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fill={selected ? "var(--accent)" : "var(--label)"}
                fontSize="8"
                fontWeight="600"
              >
                {massHere > 0 ? `${massHere}g` : shortZone(id)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-xs text-[var(--muted)]">
        {interactive
          ? "Tap 12, 3, 9, neck, or handle."
          : totalG > 0
            ? `${totalG.toFixed(1)} g on this hoop`
            : "No tape"}
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
