"use client";

import { useId } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 280;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

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
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="40%" stopColor="#161616" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>
          <linearGradient id={`ltGrip-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a1c14" />
            <stop offset="50%" stopColor="#4a3224" />
            <stop offset="100%" stopColor="#2a1c14" />
          </linearGradient>
          <clipPath id={`ltBed-${uid}`}>
            <ellipse cx="100" cy="86" rx="52" ry="64" />
          </clipPath>
        </defs>
        <rect width={VB_W} height={VB_H} fill="#07140f" rx="4" />

        {/* Handle / grip */}
        <rect x="91" y="198" width="18" height="58" rx="4" fill={`url(#ltGrip-${uid})`} />
        {[206, 214, 222, 230, 238, 246].map((y) => (
          <line key={y} x1="92" y1={y} x2="108" y2={y} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
        ))}
        <rect x="88" y="254" width="24" height="10" rx="3" fill="#111" stroke="#3a3a3a" strokeWidth="0.8" />

        {/* Shaft + throat */}
        <path
          d="M94 168 L96 200 L104 200 L106 168 Z"
          fill="#1a1a1a"
          stroke="#2e2e2e"
          strokeWidth="1"
        />
        <path
          d="M78 148 Q100 168 122 148 L112 168 Q100 176 88 168 Z"
          fill="#141414"
          stroke="#2a2a2a"
          strokeWidth="1.2"
        />

        {/* Stringbed */}
        <g clipPath={`url(#ltBed-${uid})`} opacity="0.7">
          {Array.from({ length: 16 }).map((_, i) => {
            const x = 52 + (i + 0.5) * (96 / 16);
            return <line key={`m${i}`} x1={x} y1="22" x2={x} y2="150" stroke="#c8c8c0" strokeWidth="0.55" />;
          })}
          {Array.from({ length: 19 }).map((_, i) => {
            const y = 24 + (i + 0.5) * (124 / 19);
            return <line key={`c${i}`} x1="48" y1={y} x2="152" y2={y} stroke="#c8c8c0" strokeWidth="0.5" />;
          })}
        </g>

        {/* Graphite hoop */}
        <ellipse
          cx="100"
          cy="86"
          rx="58"
          ry="70"
          fill="none"
          stroke={`url(#ltGraphite-${uid})`}
          strokeWidth="11"
        />
        <ellipse cx="100" cy="86" rx="51.5" ry="63.5" fill="none" stroke="#2d4a3c" strokeWidth="1.2" opacity="0.7" />

        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const hitR = interactive ? 16 : 11;
          return (
            <g
              key={id}
              style={{ cursor: interactive ? "pointer" : "default" }}
              onClick={interactive ? () => onZoneClick?.(id) : undefined}
            >
              <circle
                cx={cx}
                cy={cy}
                r={hitR}
                fill={selected ? "rgba(200,245,96,0.22)" : massHere > 0 ? "rgba(244,162,97,0.18)" : "rgba(232,239,233,0.04)"}
                stroke={selected ? "#c8f560" : massHere > 0 ? "#f4a261" : "rgba(232,239,233,0.28)"}
                strokeWidth={selected ? 2 : 1.2}
              />
              {massHere > 0 ? (
                <rect
                  x={cx - 9}
                  y={cy - 3.5}
                  width="18"
                  height="7"
                  rx="1"
                  fill="#111"
                  stroke="#f4a261"
                  strokeWidth="0.6"
                  transform={id === "three" || id === "nine" ? `rotate(90 ${cx} ${cy})` : undefined}
                />
              ) : null}
              <text
                x={cx}
                y={cy + (massHere > 0 ? 14 : 3)}
                textAnchor="middle"
                fill={selected ? "#c8f560" : "#e8efe9"}
                fontSize="7"
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
          ? "Tap 12, 3, 9, throat, or handle to place the selected strip."
          : totalG > 0
            ? `${totalG.toFixed(1)} g lead on this hoop`
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
