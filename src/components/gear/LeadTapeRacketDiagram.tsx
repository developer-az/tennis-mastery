"use client";

import { useId, useMemo } from "react";
import type { LeadTapePiece, LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

const VB_W = 200;
const VB_H = 280;
const ZONE_ORDER: LeadTapeZone[] = ["tip", "twelve", "three", "nine", "throat", "handle"];

/** Closed isometric hoop (modern 100 sq in), then two pillars into a neck. */
const HOOP = { cx: 100, cy: 78, rx: 57, ry: 63, n: 3.2, beam: 11 };

function superellipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n: number,
  steps = 80,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = -Math.PI / 2 + (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + Math.sign(c) * rx * Math.abs(c) ** (2 / n);
    const y = cy + Math.sign(s) * ry * Math.abs(s) ** (2 / n);
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${pts.join(" ")} Z`;
}

/** Clock angle: 0 = 12 o'clock, 90 = 3 o'clock. */
function hoopPoint(angleFromTwelve: number, rx: number, ry: number) {
  const t = ((angleFromTwelve - 90) * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const n = HOOP.n;
  return {
    x: HOOP.cx + Math.sign(c) * rx * Math.abs(c) ** (2 / n),
    y: HOOP.cy + Math.sign(s) * ry * Math.abs(s) ** (2 / n),
  };
}

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

  const geom = useMemo(() => {
    const { cx, cy, rx, ry, n, beam } = HOOP;
    const innerRx = rx - beam;
    const innerRy = ry - beam;
    const outer = superellipsePath(cx, cy, rx, ry, n);
    const inner = superellipsePath(cx, cy, innerRx, innerRy, n);
    const left = hoopPoint(208, rx - 3, ry - 3);
    const right = hoopPoint(152, rx - 3, ry - 3);
    return { outer, inner, innerRx, innerRy, left, right };
  }, []);

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
            <stop offset="42%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#3a3a3a" />
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
            <path d={geom.inner} />
          </clipPath>
        </defs>

        {/* Handle first so the neck sits on top of it */}
        <rect x="89.5" y="204" width="21" height="50" rx="3.2" fill={`url(#ltGrip-${uid})`} />
        <path
          d="M 91 206 L 93 206 L 93 252 L 91 252 Z M 107 206 L 109 206 L 109 252 L 107 252 Z"
          fill="#1a120c"
          opacity="0.35"
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`g${i}`}
            x1="91"
            y1={214 + i * 6.5}
            x2="109"
            y2={214 + i * 6.5}
            stroke="#1a120c"
            strokeWidth="0.55"
            opacity="0.4"
          />
        ))}
        <path d="M 86 252 L 100 249.5 L 114 252 L 112 266 L 88 266 Z" fill="#111" />
        <ellipse cx="100" cy="265.5" rx="12" ry="2" fill="#0a0a0a" />

        {/* Open-throat pillars — gap between them; they meet at the neck, not a filled yoke */}
        <path
          d={`M ${geom.left.x.toFixed(1)} ${geom.left.y.toFixed(1)}
              C 58 152, 74 168, 90 180`}
          fill="none"
          stroke={`url(#ltGraphite-${uid})`}
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${geom.right.x.toFixed(1)} ${geom.right.y.toFixed(1)}
              C 142 152, 126 168, 110 180`}
          fill="none"
          stroke={`url(#ltGraphite-${uid})`}
          strokeWidth="8.5"
          strokeLinecap="round"
        />

        {/* Neck + shaft */}
        <path
          d="M 88 174 C 88 169 112 169 112 174 L 109 190 C 108 194 92 194 91 190 Z"
          fill={`url(#ltGraphite-${uid})`}
        />
        <path d="M 94.5 188 L 105.5 188 L 104 208 L 96 208 Z" fill="#1a1a1a" />

        <g clipPath={`url(#ltBed-${uid})`} opacity="0.5">
          {Array.from({ length: 16 }).map((_, i) => {
            const x = HOOP.cx - geom.innerRx + (i + 0.5) * ((2 * geom.innerRx) / 16);
            return (
              <line
                key={`m${i}`}
                x1={x}
                y1={HOOP.cy - geom.innerRy}
                x2={x}
                y2={HOOP.cy + geom.innerRy}
                stroke="var(--foreground)"
                strokeWidth="0.4"
              />
            );
          })}
          {Array.from({ length: 19 }).map((_, i) => {
            const y = HOOP.cy - geom.innerRy + (i + 0.5) * ((2 * geom.innerRy) / 19);
            return (
              <line
                key={`c${i}`}
                x1={HOOP.cx - geom.innerRx}
                y1={y}
                x2={HOOP.cx + geom.innerRx}
                y2={y}
                stroke="var(--foreground)"
                strokeWidth="0.35"
              />
            );
          })}
        </g>

        {/* Closed isometric hoop — ring, not an open horseshoe */}
        <path
          d={`${geom.outer} ${geom.inner}`}
          fill={`url(#ltGraphite-${uid})`}
          fillRule="evenodd"
        />
        <path d={geom.inner} fill="none" stroke="#2a4a3a" strokeWidth="1.15" opacity="0.75" />

        {ZONE_ORDER.map((id) => {
          const z = LEAD_TAPE_ZONES[id];
          const cx = z.x * VB_W;
          const cy = z.y * VB_H;
          const massHere = massByZone[id] ?? 0;
          const selected = selectedZone === id;
          const vertical = id === "three" || id === "nine";
          const w = id === "throat" ? 22 : vertical ? 6.5 : 22;
          const h = id === "throat" ? 8 : vertical ? 22 : 6.5;
          const labelX = vertical ? cx + (id === "three" ? 11 : -11) : cx;
          const labelY = vertical ? cy + 3 : cy + 15;
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
                rx="1.4"
                fill={
                  massHere > 0
                    ? `url(#ltMetal-${uid})`
                    : selected
                      ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 12%, transparent)"
                }
                stroke={
                  selected
                    ? "var(--accent)"
                    : massHere > 0
                      ? "#3a3a3a"
                      : "color-mix(in srgb, var(--foreground) 28%, transparent)"
                }
                strokeWidth={selected ? 1.6 : 0.8}
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
