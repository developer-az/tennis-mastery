"use client";

/**
 * Gear Lab teaching visuals — launch relative to the net with topspin drop,
 * and strike-height zones (neck / chest / waist) per frame personality.
 */

import { useId } from "react";

export type StrikeBand = "neck" | "chest" | "waist";

export interface StrikeZoneHint {
  /** Primary comfortable height band */
  primary: StrikeBand;
  /** Inclusive secondary bands */
  bands: StrikeBand[];
  label: string;
  detail: string;
}

/** Map frame traits → most consistent strike heights. */
export function strikeZoneForFrame(input: {
  headSizeSqIn?: number | null;
  idealLaunchAngleDeg?: number | null;
  idealSwingPathDeg?: number | null;
  spin?: number | null;
  control?: number | null;
  power?: number | null;
  style?: string | null;
}): StrikeZoneHint {
  const hs = input.headSizeSqIn ?? 100;
  const launch = input.idealLaunchAngleDeg ?? 8;
  const path = input.idealSwingPathDeg ?? 20;
  const spin = input.spin ?? 55;
  const control = input.control ?? 55;
  const style = (input.style ?? "").toLowerCase();

  if (path >= 28 || spin >= 78 || /spin|rpms|shape/.test(style)) {
    return {
      primary: "chest",
      bands: launch >= 10 ? ["chest", "neck"] : ["chest", "waist"],
      label: "Chest (spin window)",
      detail:
        "Most consistent on chest-high balls — brush up through the strike zone. Neck-high sits are playable; avoid scooping waist-low with this path.",
    };
  }
  if (hs < 98 || control >= 74 || /precision|player|control/.test(style)) {
    return {
      primary: "waist",
      bands: ["waist", "chest"],
      label: "Waist–chest (precision)",
      detail:
        "Tight sweet spot — take balls at waist to low-chest, out in front. Neck-high contact gets late and sprays; step in rather than reach up.",
    };
  }
  if (hs > 100 || (input.power ?? 50) >= 74) {
    return {
      primary: "chest",
      bands: ["waist", "chest", "neck"],
      label: "Waist to chest (forgiving)",
      detail:
        "Larger bed forgives height variance — still prefer waist–chest out front for depth. Neck-high is usable; don’t wait on waist-low floaters.",
    };
  }
  return {
    primary: "chest",
    bands: ["waist", "chest"],
    label: "Waist–chest (drive window)",
    detail:
      "Strike most balls between waist and chest, contact out front. Match path steepness — flatter frames hate late low contact; steeper frames hate blocked chest drives.",
  };
}

function pathTypeLabel(degrees: number): string {
  if (degrees >= 30) return "Steep spin shape";
  if (degrees >= 22) return "Modern low→high drive";
  if (degrees >= 14) return "Flatter penetrating drive";
  return "Level / block-friendly path";
}

function strikeWindowCopy(launchDeg: number, pathDeg: number, zone: StrikeZoneHint): string {
  return `Best strike height: ${zone.label.toLowerCase()}. ${zone.detail}`;
}

/**
 * Side-view: body strike mold (neck/chest/waist) + perfect face contact →
 * ball clears the net → topspin drop. Gauges fly / spin / depth likelihood
 * for this frame on a clean hit.
 */
export function LaunchAngleVisual({
  degrees,
  pathDeg = 22,
  zone,
  spin = 55,
  power = 55,
  control = 55,
  label = "Strike mold → flight",
}: {
  degrees: number;
  pathDeg?: number;
  zone?: StrikeZoneHint;
  spin?: number | null;
  power?: number | null;
  control?: number | null;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const launch = Math.max(1.5, Math.min(16, degrees));
  const path = Math.max(5, Math.min(40, pathDeg));
  const z =
    zone ??
    strikeZoneForFrame({
      idealLaunchAngleDeg: launch,
      idealSwingPathDeg: path,
      spin,
      control,
      power,
    });

  const bandY: Record<StrikeBand, { y: number; h: number; title: string }> = {
    neck: { y: 18, h: 20, title: "Neck" },
    chest: { y: 40, h: 26, title: "Chest" },
    waist: { y: 68, h: 24, title: "Waist" },
  };

  const primary = bandY[z.primary];
  const faceCx = 78;
  const faceCy = primary.y + primary.h * 0.55;
  const floorY = 148;
  const netX = 132;
  const netTop = 58;
  const netBot = 138;

  const clearancePx = 14 + launch * 2.8 + Math.max(0, path - 18) * 0.2;
  const overNetY = netTop - clearancePx;
  const apexX = netX + 24 + launch * 1.1;
  const apexY = overNetY - (8 + launch * 1.5);
  const spinDrop = 0.3 + (path / 40) * 0.7;
  const landX = 208;
  const landY = Math.min(floorY - 4, apexY + 32 + spinDrop * 34 - launch * 1.1);
  const midPreX = (faceCx + netX) / 2;
  const midPreY = faceCy + (overNetY - faceCy) * 0.5 - 8;
  const flight = `M ${faceCx} ${faceCy} Q ${midPreX} ${midPreY}, ${netX} ${overNetY} Q ${apexX} ${apexY}, ${landX} ${landY}`;

  const sp = spin ?? 55;
  const pw = power ?? 55;
  const ct = control ?? 55;
  const flyRisk = Math.max(
    8,
    Math.min(96, Math.round(28 + (launch - 7) * 7 + (22 - path) * 1.2 + (pw - ct) * 0.25)),
  );
  const spinLev = Math.max(
    8,
    Math.min(96, Math.round(sp * 0.55 + path * 1.1 + (launch > 9 ? 6 : 0))),
  );
  const depth = Math.max(
    8,
    Math.min(96, Math.round(pw * 0.5 + (18 - Math.abs(launch - 7)) * 2.2 + (40 - path) * 0.35)),
  );

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {label}
      </p>
      <svg viewBox="0 0 220 168" className="h-auto w-full max-w-md" aria-hidden>
        <defs>
          <linearGradient id={`ballArc-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8f560" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#c8f560" stopOpacity="1" />
            <stop offset="100%" stopColor="#f4a261" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <line
          x1="12"
          y1={floorY}
          x2="214"
          y2={floorY}
          stroke="rgba(232,239,233,0.22)"
          strokeWidth="1.5"
        />
        <rect
          x="14"
          y="14"
          width="28"
          height="86"
          rx="12"
          fill="rgba(232,239,233,0.05)"
          stroke="rgba(232,239,233,0.22)"
        />
        <circle
          cx="28"
          cy="10"
          r="7"
          fill="rgba(232,239,233,0.1)"
          stroke="rgba(232,239,233,0.3)"
        />
        {(Object.keys(bandY) as StrikeBand[]).map((band) => {
          const b = bandY[band];
          const active = z.bands.includes(band);
          const isPrimary = z.primary === band;
          return (
            <g key={band}>
              <rect
                x="16"
                y={b.y}
                width="24"
                height={b.h}
                rx="3"
                fill={
                  isPrimary
                    ? "rgba(200,245,96,0.3)"
                    : active
                      ? "rgba(200,245,96,0.1)"
                      : "transparent"
                }
                stroke={
                  isPrimary
                    ? "#c8f560"
                    : active
                      ? "rgba(200,245,96,0.4)"
                      : "rgba(232,239,233,0.1)"
                }
                strokeWidth={isPrimary ? 1.4 : 1}
              />
              <text
                x="46"
                y={b.y + b.h / 2 + 3}
                fill={isPrimary ? "#c8f560" : "#8aa396"}
                fontSize="8"
              >
                {b.title}
                {isPrimary ? " · mold" : ""}
              </text>
            </g>
          );
        })}
        <ellipse
          cx={faceCx}
          cy={faceCy}
          rx="16"
          ry="11"
          fill="rgba(200,245,96,0.12)"
          stroke="#c8f560"
          strokeWidth="1.8"
        />
        <line
          x1={faceCx - 10}
          y1={faceCy - 4}
          x2={faceCx + 10}
          y2={faceCy - 4}
          stroke="rgba(200,245,96,0.35)"
          strokeWidth="0.8"
        />
        <line
          x1={faceCx - 10}
          y1={faceCy}
          x2={faceCx + 10}
          y2={faceCy}
          stroke="rgba(200,245,96,0.35)"
          strokeWidth="0.8"
        />
        <line
          x1={faceCx - 10}
          y1={faceCy + 4}
          x2={faceCx + 10}
          y2={faceCy + 4}
          stroke="rgba(200,245,96,0.35)"
          strokeWidth="0.8"
        />
        <circle cx={faceCx} cy={faceCy} r="3.4" fill="#c8f560">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x={faceCx - 18} y={faceCy + 22} fill="#8aa396" fontSize="8">
          face center
        </text>
        <line x1={netX} y1={netTop} x2={netX} y2={netBot} stroke="#e8efe9" strokeWidth="2.4" />
        <line
          x1={netX - 11}
          y1={netTop}
          x2={netX + 11}
          y2={netTop}
          stroke="#c8f560"
          strokeWidth="2.4"
        />
        <text x={netX - 9} y={netTop - 5} fill="#8aa396" fontSize="8">
          net
        </text>
        <path
          d={flight}
          fill="none"
          stroke={`url(#ballArc-${uid})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={apexX} cy={apexY} r="2.8" fill="#f4a261" />
        <line
          x1={netX + 5}
          y1={overNetY}
          x2={netX + 5}
          y2={netTop}
          stroke="#7dd3fc"
          strokeWidth="1.4"
          strokeDasharray="2 2"
        />
        <text x={netX + 9} y={(overNetY + netTop) / 2 + 3} fill="#7dd3fc" fontSize="7">
          clear
        </text>
        <path
          d={`M ${apexX + 3} ${apexY + 2} q ${16 + spinDrop * 8} ${10 + spinDrop * 12}, ${30 + spinDrop * 8} ${20 + spinDrop * 16}`}
          fill="none"
          stroke="#f4a261"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />
        <text
          x={Math.min(170, landX - 40)}
          y={Math.min(apexY + 34, landY - 6)}
          fill="#f4a261"
          fontSize="7"
        >
          topspin drop
        </text>
      </svg>

      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {z.label}
        <span className="ml-2 text-base text-[var(--muted)]">
          · {launch.toFixed(1)}° leave · path ~{path.toFixed(0)}°
        </span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Same height mold as “where to strike” — the green face mark is the perfect stringbed
        center. From there the ball clears the tape (~{launch.toFixed(1)}°), then path ~
        {path.toFixed(0)}° pulls it down. Gauges show fly risk, spin leverage, and depth on a
        clean hit.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <FlightGauge label="Fly risk" value={flyRisk} color="#f4a261" hint="Long / sail" />
        <FlightGauge label="Spin lever" value={spinLev} color="#7dd3fc" hint="Drop after tape" />
        <FlightGauge label="Depth" value={depth} color="#c8f560" hint="Through the court" />
      </div>
    </div>
  );
}

function FlightGauge({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number;
  color: string;
  hint: string;
}) {
  return (
    <div className="rounded-md px-2 py-2" style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color }}>
        {label}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <p className="mt-1 text-[11px] tabular-nums text-[var(--foreground)]/85">
        {value}
        <span className="ml-1 text-[10px] text-[var(--muted)]">{hint}</span>
      </p>
    </div>
  );
}

/**
 * Body height bands (neck / chest / waist) with the frame's preferred strike zone highlighted.
 */
export function SwingPathVisual({
  degrees,
  zone,
  label = "Where to strike on this frame",
}: {
  degrees: number;
  zone?: StrikeZoneHint;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const deg = Math.max(5, Math.min(40, degrees));
  const z = zone ?? strikeZoneForFrame({ idealSwingPathDeg: deg });
  const steep = deg / 40;
  const type = pathTypeLabel(deg);

  const bandY: Record<StrikeBand, { y: number; h: number; title: string }> = {
    neck: { y: 22, h: 22, title: "Neck" },
    chest: { y: 46, h: 28, title: "Chest" },
    waist: { y: 76, h: 26, title: "Waist" },
  };

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        {label}
      </p>
      <svg viewBox="0 0 220 150" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id={`pathStroke-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4a261" stopOpacity="0.3" />
            <stop offset="55%" stopColor="#f4a261" stopOpacity="1" />
            <stop offset="100%" stopColor="#c8f560" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect
          x="28"
          y="18"
          width="36"
          height="92"
          rx="14"
          fill="rgba(232,239,233,0.06)"
          stroke="rgba(232,239,233,0.25)"
        />
        <circle
          cx="46"
          cy="14"
          r="9"
          fill="rgba(232,239,233,0.12)"
          stroke="rgba(232,239,233,0.35)"
        />
        {(Object.keys(bandY) as StrikeBand[]).map((band) => {
          const b = bandY[band];
          const active = z.bands.includes(band);
          const primary = z.primary === band;
          return (
            <g key={band}>
              <rect
                x="30"
                y={b.y}
                width="32"
                height={b.h}
                rx="4"
                fill={
                  primary
                    ? "rgba(200,245,96,0.28)"
                    : active
                      ? "rgba(200,245,96,0.12)"
                      : "transparent"
                }
                stroke={
                  primary
                    ? "#c8f560"
                    : active
                      ? "rgba(200,245,96,0.45)"
                      : "rgba(232,239,233,0.12)"
                }
                strokeWidth={primary ? 1.5 : 1}
              />
              <text
                x="70"
                y={b.y + b.h / 2 + 3}
                fill={primary ? "#c8f560" : "#8aa396"}
                fontSize="10"
              >
                {b.title}
                {primary ? " · best" : active ? " · ok" : ""}
              </text>
            </g>
          );
        })}
        <path
          d={`M 52 ${bandY[z.primary].y + bandY[z.primary].h * 0.55 + 8 * (1 - steep)}
              Q 100 ${bandY[z.primary].y + 10 - steep * 12}, 150 ${bandY[z.primary].y - 4 - steep * 8}
              T 205 ${bandY[z.primary].y - 10 - steep * 14}`}
          fill="none"
          stroke={`url(#pathStroke-${uid})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <rect
          x="118"
          y={bandY[z.primary].y + 2}
          width="40"
          height={bandY[z.primary].h - 4}
          rx="3"
          fill="rgba(200,245,96,0.08)"
          stroke="rgba(200,245,96,0.4)"
          strokeDasharray="3 2"
        />
        <text x="120" y={bandY[z.primary].y - 2} fill="#8aa396" fontSize="8">
          contact out front
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {z.label}
      </p>
      <p className="mt-1 text-sm text-[var(--foreground)]/85">
        Path ~{deg.toFixed(0)}° · {type}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{z.detail}</p>
    </div>
  );
}

/** Coaching bullets — when to strike, path type, tunable levers with numbers. */
export function StrikeCoachingBullets({
  launchDeg,
  pathDeg,
  spin,
  control,
  power,
  zone,
  headSizeSqIn,
}: {
  launchDeg: number | null;
  pathDeg: number | null;
  spin?: number | null;
  control?: number | null;
  power?: number | null;
  zone?: StrikeZoneHint;
  headSizeSqIn?: number | null;
}) {
  if (launchDeg == null && pathDeg == null) return null;
  const launch = launchDeg ?? 8;
  const path = pathDeg ?? 20;
  const z =
    zone ??
    strikeZoneForFrame({
      idealLaunchAngleDeg: launch,
      idealSwingPathDeg: path,
      spin,
      control,
      power,
      headSizeSqIn,
    });
  const bullets: string[] = [];

  bullets.push(strikeWindowCopy(launch, path, z));
  bullets.push(
    `Path type: ${pathTypeLabel(path).toLowerCase()} (~${path.toFixed(0)}°). Through the ${z.primary} band, swing along that shape — don’t invent a flatter or steeper path than the frame wants.`,
  );
  bullets.push(
    `Net science: ~${launch.toFixed(1)}° leave clears the tape; topspin from the ~${path.toFixed(0)}° path is what pulls the ball down. Dumping short = late / low contact. Floating long = face too open or bed too soft — try +1–2 lbs before changing frames.`,
  );

  if ((spin ?? 0) >= 72 || path >= 28) {
    bullets.push(
      "Tune spin window: shaped poly, mid gauge, or +2–4 g at 12 o’clock supports this launch; don’t soften tension so much you scoop waist-low balls.",
    );
  } else if ((control ?? 0) >= 72 || path <= 16) {
    bullets.push(
      "Tune precision: denser pattern / +2 lbs / less tip mass keeps launch honest. If depth fades, open the path slightly — don’t wait on contact.",
    );
  } else if ((power ?? 0) >= 72) {
    bullets.push(
      "Tune easy depth: shorter swing is fine; +2 lbs or handle-side tape flattens launch if you’re floating long on clean chest strikes.",
    );
  } else {
    bullets.push(
      "Tune the mold: tension (±2 lbs ≈ small launch shift), gauge, or a few grams tip vs handle — then re-check clearance and strike height here.",
    );
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        How to use this at a high level
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--foreground)]/90">
        {bullets.map((b) => (
          <li key={b} className="border-l-2 border-[var(--accent)]/45 pl-3">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
