"use client";

import { useId } from "react";

/** Filled side-view athlete for court diagrams — open stance, bent knee, arm to contact. */
export function AthleteSilhouette({
  x = 42,
  y = 118,
  scale = 1,
  fill = "var(--silhouette)",
  opacity = 0.92,
}: {
  x?: number;
  y?: number;
  scale?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} fill={fill}>
      {/* Head + torso */}
      <ellipse cx="0" cy="-52" rx="7.5" ry="8.5" />
      <path d="M-6 -44 C-10 -28 -12 -12 -8 2 L8 4 C12 -10 10 -28 6 -44 Z" />
      {/* Trail arm (back) + hitting arm to contact */}
      <path d="M-8 -30 C-22 -36 -30 -28 -34 -18 C-28 -22 -18 -24 -8 -20 Z" />
      <path d="M6 -28 C18 -22 34 -14 48 -6 C50 -2 46 2 42 0 C30 -6 16 -14 6 -18 Z" />

      {/*
        Lead leg (near / net side): hip → knee → calf → ankle → foot.
        Explicit knee joint so thigh and shank read as connected segments.
      */}
      <path d="M1 2 C4 10 8 18 10 28 L4 30 C2 20 -1 12 -3 4 Z" />
      <circle cx="8.5" cy="30" r="3.2" />
      <path d="M6 32 C9 40 12 48 14 55 L8 57 C5 48 2 40 4 32 Z" />
      <path d="M7 55 L18 58 L17 61 L5 58 Z" />

      {/*
        Trail leg (plant / far side): deeper bend, calf tucked under thigh,
        foot planted behind the lead.
      */}
      <path d="M-4 2 C-10 12 -14 22 -12 34 L-5 33 C-6 22 -4 12 0 4 Z" />
      <circle cx="-10" cy="34" r="3" />
      <path d="M-12 36 C-14 44 -12 50 -6 54 L-3 50 C-8 47 -10 42 -8 36 Z" />
      <path d="M-8 52 L2 55 L1 58 L-10 55 Z" />
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
  strings = "rgba(232,239,233,0.35)",
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
          <stop offset="0%" stopColor="#e8efe9" stopOpacity="0.95" />
          <stop offset="45%" stopColor={frame} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1a3328" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="22" ry="28" fill="none" stroke={`url(#hoopMetal-${uid})`} strokeWidth="5.5" />
      <ellipse cx="0" cy="0" rx="18" ry="24" fill="rgba(10,28,20,0.25)" stroke={strings} strokeWidth="0.6" />
      {[-12, -6, 0, 6, 12].map((x) => (
        <line key={`v${x}`} x1={x} y1={-22} x2={x} y2={22} stroke={strings} strokeWidth="0.55" />
      ))}
      {[-16, -8, 0, 8, 16].map((y) => (
        <line key={`h${y}`} x1={-16} y1={y} x2={16} y2={y} stroke={strings} strokeWidth="0.55" />
      ))}
      <rect x="-3.5" y="26" width="7" height="14" rx="1.5" fill={`url(#hoopMetal-${uid})`} />
      <rect x="-2.2" y="40" width="4.4" height="28" rx="1.2" fill="#2a4034" stroke={frame} strokeWidth="0.8" />
      <rect x="-3" y="66" width="6" height="5" rx="1" fill="#1a2820" />
    </g>
  );
}
