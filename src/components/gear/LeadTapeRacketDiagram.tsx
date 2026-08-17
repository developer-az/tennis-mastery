"use client";

import { useId } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 280;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

/** Realistic hoop / throat / string density with metallic lead strips on zones. */
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
            <stop offset="0%" stopColor="#4a4a4a" />
            <stop offset="35%" stopColor="#1a1a1a" />
            <stop offset="70%" stopColor="#2e2e2e" />
            <stop offset="100%" stopColor="#121212" />
          </linearGradient>
          <linearGradient id={`ltMetal-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8dce0" />
            <stop offset="40%" stopColor="#9aa3ab" />
            <stop offset="100%" stopColor="#5c656e" />
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
        <rect width={VB_W} height={VB_H} fill="var(--bg-scene)" rx="4" />

        {/* Handle / grip with bevel facets */}
        <rect x="91" y="198" width="18" height="58" rx="3" fill={`url(#ltGrip-${uid})`} />
        {[206, 214, 222, 230, 238, 246].map((y) => (
          <line key={y} x1="92" y1={y} x2="108" y2={y} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
        ))}
        <path
          d="M88 254 L100 252 L112 254 L112 264 L88 264 Z"
          fill="#111"
          stroke="#3a3a3a"
          strokeWidth="0.8"
        />

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

        {/* Stringbed density */}
        <g clipPath={`url(#ltBed-${uid})`} opacity="0.75">
          {Array.from({ length: 18 }).map((_, i) => {
            const x = 50 + (i + 0.5) * (100 / 18);
            return <line key={`m${i}`} x1={x} y1="22" x2={x} y2="150" stroke="#c8c8c0" strokeWidth="0.5" />;
          })}
          {Array.from({ length: 21 }).map((_, i) => {
            const y = 24 + (i + 0.5) * (124 / 21);
            return <line key={`c${i}`} x1="48" y1={y} x2="152" y2={y} stroke="#c8c8c0" strokeWidth="0.45" />;
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
          strokeWidth="12"
        />
        <ellipse
          cx="100"
          cy="86"
          rx="51.5"
          ry="63.5"
          fill="none"
          stroke="var(--silhouette-rim)"
          strokeWidth="1.2"
          opacity="0.7"
        />

        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const hitR = interactive ? 17 : 12;
          const vertical = id === "three" || id === "nine";
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
                fill={
                  selected
                    ? "color-mix(in srgb, var(--accent) 22%, transparent)"
                    : massHere > 0
                      ? "color-mix(in srgb, var(--amber) 16%, transparent)"
                      : "transparent"
                }
                stroke={
                  selected
                    ? "var(--chart-control)"
                    : massHere > 0
                      ? "var(--amber)"
                      : "color-mix(in srgb, var(--foreground) 22%, transparent)"
                }
                strokeWidth={selected ? 2 : 1.1}
                strokeDasharray={massHere > 0 || selected ? undefined : "2 2"}
              />
              {massHere > 0 ? (
                <rect
                  x={cx - (vertical ? 3.5 : 11)}
                  y={cy - (vertical ? 11 : 3.5)}
                  width={vertical ? 7 : 22}
                  height={vertical ? 22 : 7}
                  rx="1"
                  fill={`url(#ltMetal-${uid})`}
                  stroke="#2a2a2a"
                  strokeWidth="0.5"
                />
              ) : null}
              <text
                x={cx}
                y={cy + (massHere > 0 ? 16 : 3)}
                textAnchor="middle"
                fill={selected ? "var(--chart-control)" : "var(--foreground)"}
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
