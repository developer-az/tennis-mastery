"use client";

import { useId } from "react";

/** Filled side-view athlete for court diagrams — open stance, bent knee, arm to contact. */
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
      <ellipse cx="0" cy="-52" rx="7.2" ry="8.2" />
      <path d="M-5.5 -44 C-10 -30 -12.5 -14 -8 3 L8 5 C12.5 -12 10.5 -30 5.5 -44 Z" />
      <path d="M-8 -30 C-22 -37 -31 -29 -35 -18 C-28 -23 -17 -25 -8 -20 Z" />
      <path d="M6 -28 C20 -21 36 -13 50 -5 C52 -1 47 3 42.5 1 C30 -6 16 -14 6 -18 Z" />
      <path d="M1 3 C4.5 11 8.5 19 10.5 29 L4.5 31 C2 21 -1 12 -3 5 Z" />
      <circle cx="8.6" cy="30.5" r="2.8" />
      <path d="M6.2 32.5 C9 41 12 49 14.2 55.5 L8.2 57.2 C5.2 48.5 2.4 40.5 4.2 32.5 Z" />
      <path d="M7.2 55.2 L18.5 58.2 L17.4 61.2 L5.4 58 Z" />
      <path d="M-4 3 C-10.5 13 -14.5 23 -12.2 34.5 L-5.2 33.5 C-6.2 22.5 -4 12 0.2 5 Z" />
      <circle cx="-10.2" cy="34.4" r="2.6" />
      <path d="M-12.2 36.4 C-14.2 44.5 -12 50.5 -6 54.5 L-3.2 50.2 C-8.2 47.2 -10.2 42 -8.2 36.4 Z" />
      <path d="M-8.2 52.2 L2.2 55.2 L1.2 58.2 L-10.2 55 Z" />
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
  strings = "color-mix(in srgb, var(--foreground) 30%, transparent)",
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
  const mains = [-14, -10.5, -7, -3.5, 0, 3.5, 7, 10.5, 14];
  const crosses = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot + faceClosed * 0.35}) scale(${scale})`}>
      <defs>
        <linearGradient id={`hoopMetal-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f2f0eb" stopOpacity="0.95" />
          <stop offset="38%" stopColor={frame} stopOpacity="1" />
          <stop offset="100%" stopColor="#1a1c18" stopOpacity="0.95" />
        </linearGradient>
        <clipPath id={`hoopBed-${uid}`}>
          <ellipse cx="0" cy="0" rx="17.6" ry="23.6" />
        </clipPath>
      </defs>
      <ellipse
        cx="2.5"
        cy="3"
        rx="22"
        ry="28"
        fill="none"
        stroke="color-mix(in srgb, var(--foreground) 12%, transparent)"
        strokeWidth="5"
      />
      <ellipse cx="0" cy="0" rx="22" ry="28" fill="none" stroke={`url(#hoopMetal-${uid})`} strokeWidth="5.6" />
      <ellipse
        cx="0"
        cy="0"
        rx="18.6"
        ry="24.6"
        fill="none"
        stroke="color-mix(in srgb, var(--foreground) 22%, transparent)"
        strokeWidth="0.7"
      />
      <g clipPath={`url(#hoopBed-${uid})`}>
        <ellipse cx="0" cy="0" rx="17.6" ry="23.6" fill="color-mix(in srgb, var(--bg-scene) 82%, transparent)" />
        {mains.map((x) => (
          <line key={`v${x}`} x1={x} y1={-23} x2={x} y2={23} stroke={strings} strokeWidth="0.55" />
        ))}
        {crosses.map((y) => (
          <line key={`h${y}`} x1={-17} y1={y} x2={17} y2={y} stroke={strings} strokeWidth="0.55" />
        ))}
      </g>
      <path
        d="M-6 25 L6 25 L4.2 40 L-4.2 40 Z"
        fill={`url(#hoopMetal-${uid})`}
      />
      <rect x="-2.3" y="39" width="4.6" height="26" rx="1.1" fill="#2a241c" stroke={frame} strokeWidth="0.7" />
      <rect x="-3.1" y="64" width="6.2" height="7" rx="1.4" fill="#1a1612" />
    </g>
  );
}
