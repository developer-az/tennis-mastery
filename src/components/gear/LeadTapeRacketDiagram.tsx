"use client";

import { useId } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 280;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

/** Modern isometric frame — open-throat pillars into a neck, not a closed yoke. */
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
            <stop offset="0%" stopColor="#6a6a6a" />
            <stop offset="38%" stopColor="#1a1a1a" />
            <stop offset="72%" stopColor="#2c2c2c" />
            <stop offset="100%" stopColor="#4a4a4a" />
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
            <rect x="52" y="26" width="96" height="108" rx="36" ry="40" />
          </clipPath>
        </defs>

        <g clipPath={`url(#ltBed-${uid})`} opacity="0.5">
          {Array.from({ length: 16 }).map((_, i) => {
            const x = 54 + (i + 0.5) * (92 / 16);
            return <line key={`m${i}`} x1={x} y1="26" x2={x} y2="134" stroke="var(--foreground)" strokeWidth="0.4" />;
          })}
          {Array.from({ length: 19 }).map((_, i) => {
            const y = 28 + (i + 0.5) * (104 / 19);
            return <line key={`c${i}`} x1="52" y1={y} x2="148" y2={y} stroke="var(--foreground)" strokeWidth="0.35" />;
          })}
        </g>
        <rect
          x="52"
          y="26"
          width="96"
          height="108"
          rx="36"
          ry="40"
          fill="none"
          stroke="color-mix(in srgb, var(--foreground) 18%, transparent)"
          strokeWidth="0.6"
        />

        {/* Open-throat isometric hoop: beam continues into two pillars, no closed yoke. */}
        <path
          d="M 93 182
             C 72 164 50 146 44 118
             C 38 90 42 58 62 34
             C 76 16 90 13 100 13
             C 110 13 124 16 138 34
             C 158 58 162 90 156 118
             C 150 146 128 164 107 182"
          fill="none"
          stroke={`url(#ltGraphite-${uid})`}
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 96 176
             C 78 160 58 144 52 120
             C 46 94 50 66 66 42
             C 78 24 90 22 100 22
             C 110 22 122 24 134 42
             C 150 66 154 94 148 120
             C 142 144 122 160 104 176"
          fill="none"
          stroke="#2a4a3a"
          strokeWidth="1.2"
          opacity="0.7"
        />

        {/* Neck bridge — where the pillars meet the shaft */}
        <path
          d="M 90 174 C 90 170 110 170 110 174 L 108 188 C 108 192 92 192 92 188 Z"
          fill={`url(#ltGraphite-${uid})`}
        />
        <path
          d="M 95 186 L 105 186 L 103.5 206 L 96.5 206 Z"
          fill="#1a1a1a"
        />

        <rect x="90" y="204" width="20" height="50" rx="3.5" fill={`url(#ltGrip-${uid})`} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`g${i}`}
            x1="91"
            y1={212 + i * 7}
            x2="109"
            y2={212 + i * 7}
            stroke="#1a120c"
            strokeWidth="0.6"
            opacity="0.45"
          />
        ))}
        <path d="M 86 252 L 100 250 L 114 252 L 112 266 L 88 266 Z" fill="#111" />
        <ellipse cx="100" cy="265.5" rx="12" ry="2.2" fill="#0a0a0a" />

        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const vertical = id === "three" || id === "nine";
          const w = id === "throat" ? 22 : vertical ? 6.5 : 24;
          const h = id === "throat" ? 8 : vertical ? 24 : 6.5;
          const labelDy = vertical ? 22 : 15;
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
                rx="1.5"
                fill={
                  massHere > 0
                    ? `url(#ltMetal-${uid})`
                    : selected
                      ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 10%, transparent)"
                }
                stroke={
                  selected
                    ? "var(--accent)"
                    : massHere > 0
                      ? "#3a3a3a"
                      : "color-mix(in srgb, var(--foreground) 22%, transparent)"
                }
                strokeWidth={selected ? 1.6 : 0.8}
              />
              <text
                x={cx}
                y={cy + labelDy}
                textAnchor="middle"
                fill={selected ? "var(--accent)" : "var(--muted)"}
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
