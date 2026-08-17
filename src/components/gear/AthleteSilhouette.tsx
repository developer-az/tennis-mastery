"use client";

import { useId } from "react";

/** Filled side-view athlete — open stance, bent knee, arm through contact. */
export function AthleteSilhouette({
  x = 42,
  y = 118,
  scale = 1,
  fill = "var(--silhouette)",
  opacity = 0.94,
}: {
  x?: number;
  y?: number;
  scale?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} fill={fill}>
      {/* Head + visor */}
      <ellipse cx="4" cy="-56" rx="8" ry="9" />
      <path d="M-2 -58 H12" stroke={fill} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Torso, open stance lean toward net */}
      <path d="M-4 -47 C-12 -30 -14 -12 -8 4 L10 6 C16 -10 12 -30 8 -47 Z" />
      {/* Trail arm */}
      <path d="M-8 -32 C-24 -38 -34 -28 -38 -16 C-30 -24 -16 -26 -6 -22 Z" />
      {/* Lead arm to contact */}
      <path d="M8 -30 C22 -22 40 -12 56 -4 C58 0 54 4 48 2 C34 -6 18 -16 8 -20 Z" />
      {/* Front thigh / shin */}
      <path d="M-6 4 C-12 24 -8 42 2 62 L14 58 C6 42 4 24 10 6 Z" />
      {/* Trail planted leg */}
      <path d="M4 6 C14 22 12 40 6 60 L-4 62 C4 42 6 22 0 8 Z" />
      {/* Shoes */}
      <ellipse cx="10" cy="62" rx="11" ry="3.4" />
      <ellipse cx="-2" cy="61" rx="10" ry="3.2" opacity="0.85" />
    </g>
  );
}

export function RacketHoopPhoto({
  cx,
  cy,
  rot = -18,
  faceClosed = 0,
  scale = 1,
  frame = "var(--chart-control)",
  strings = "color-mix(in srgb, var(--foreground) 38%, transparent)",
}: {
  cx: number;
  cy: number;
  rot?: number;
  faceClosed?: number;
  scale?: number;
  frame?: string;
  strings?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot + faceClosed * 0.35}) scale(${scale})`}>
      <defs>
        <linearGradient id={`hoopMetal-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ecece8" stopOpacity="0.95" />
          <stop offset="42%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="22" ry="28" fill="none" stroke={`url(#hoopMetal-${uid})`} strokeWidth="5.8" />
      <ellipse
        cx="0"
        cy="0"
        rx="17.5"
        ry="23.5"
        fill="color-mix(in srgb, var(--bg-scene) 70%, #0a140f)"
        stroke={strings}
        strokeWidth="0.55"
      />
      {[-12, -6, 0, 6, 12].map((x) => (
        <line key={`v${x}`} x1={x} y1={-21} x2={x} y2={21} stroke={strings} strokeWidth="0.5" />
      ))}
      {[-16, -8, 0, 8, 16].map((y) => (
        <line key={`h${y}`} x1={-15} y1={y} x2={15} y2={y} stroke={strings} strokeWidth="0.5" />
      ))}
      <rect x="-3.6" y="26" width="7.2" height="13" rx="1.4" fill={`url(#hoopMetal-${uid})`} />
      <rect x="-2.3" y="39" width="4.6" height="30" rx="1.1" fill="#24362c" stroke={frame} strokeWidth="0.7" />
      <rect x="-3.2" y="67" width="6.4" height="5" rx="1" fill="#141c18" />
    </g>
  );
}
