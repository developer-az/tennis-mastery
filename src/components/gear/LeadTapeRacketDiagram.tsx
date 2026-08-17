"use client";

import { useId } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 280;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

/** Clean hoop map — tape as metallic strips on real zone slots. */
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
            <stop offset="0%" stopColor="#5a5a5a" />
            <stop offset="40%" stopColor="#1c1c1c" />
            <stop offset="100%" stopColor="#2e2e2e" />
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
            <ellipse cx="100" cy="86" rx="50" ry="62" />
          </clipPath>
        </defs>

        <rect x="91" y="196" width="18" height="58" rx="3" fill={`url(#ltGrip-${uid})`} />
        <path d="M88 252 L100 250 L112 252 L110 264 L90 264 Z" fill="#111" />
        <path d="M94 166 L96 198 L104 198 L106 166 Z" fill="#1a1a1a" />
        <path d="M78 146 Q100 166 122 146 L112 166 Q100 174 88 166 Z" fill="#161616" />

        <g clipPath={`url(#ltBed-${uid})`} opacity="0.55">
          {Array.from({ length: 16 }).map((_, i) => {
            const x = 52 + (i + 0.5) * (96 / 16);
            return <line key={`m${i}`} x1={x} y1="24" x2={x} y2="148" stroke="var(--foreground)" strokeWidth="0.4" />;
          })}
          {Array.from({ length: 19 }).map((_, i) => {
            const y = 26 + (i + 0.5) * (120 / 19);
            return <line key={`c${i}`} x1="50" y1={y} x2="150" y2={y} stroke="var(--foreground)" strokeWidth="0.35" />;
          })}
        </g>

        <ellipse cx="100" cy="86" rx="56" ry="68" fill="none" stroke={`url(#ltGraphite-${uid})`} strokeWidth="11" />

        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const vertical = id === "three" || id === "nine";
          const w = vertical ? 7 : 26;
          const h = vertical ? 26 : 7;
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
                stroke={selected ? "var(--accent)" : massHere > 0 ? "#3a3a3a" : "color-mix(in srgb, var(--foreground) 22%, transparent)"}
                strokeWidth={selected ? 1.6 : 0.8}
              />
              <text
                x={cx}
                y={cy + (vertical ? 22 : 16)}
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
          ? "Tap 12, 3, 9, throat, or handle."
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
      return "yoke";
    case "handle":
      return "grip";
  }
}
