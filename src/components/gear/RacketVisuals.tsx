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
 * Side-view: ideal strike → ball flight OVER the net → topspin drop.
 * Geometry is teaching-first: clearance scales with launch; path steepness
 * adds drop after the tape so users can gauge leverage on a clean strike.
 */
export function LaunchAngleVisual({
  degrees,
  pathDeg = 22,
  label = "Strike launch vs net",
}: {
  degrees: number;
  pathDeg?: number;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const launch = Math.max(1.5, Math.min(16, degrees));
  const path = Math.max(5, Math.min(40, pathDeg));

  const floorY = 118;
  const sx = 36;
  const sy = 92; // contact height (waist/chest)
  const netX = 118;
  const netTop = 50;
  const netBot = 108;

  // Always clear the tape on an ideal strike; loft buys more margin.
  // SVG y decreases upward — lower numbers = higher in the air.
  const clearancePx = 8 + launch * 2.4 + Math.max(0, path - 18) * 0.25;
  const overNetY = netTop - clearancePx;
  const apexX = netX + 22 + launch * 1.2;
  const apexLift = 6 + launch * 1.6;
  const apexY = overNetY - apexLift;
  // Topspin drop: steeper path → lands shorter / pulls down harder after apex
  const spinDrop = 0.3 + (path / 40) * 0.7;
  const landX = 198;
  const landY = Math.min(floorY - 2, apexY + 28 + spinDrop * 36 - launch * 1.2);

  // Smooth path that explicitly passes above the net tape
  const midPreX = (sx + netX) / 2;
  const midPreY = sy + (overNetY - sy) * 0.55 - 6;
  const flight = `M ${sx} ${sy} Q ${midPreX} ${midPreY}, ${netX} ${overNetY} Q ${apexX} ${apexY}, ${landX} ${landY}`;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {label}
      </p>
      <svg viewBox="0 0 220 140" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id={`ballArc-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8f560" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#c8f560" stopOpacity="1" />
            <stop offset="100%" stopColor="#f4a261" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <line
          x1="14"
          y1={floorY}
          x2="210"
          y2={floorY}
          stroke="rgba(232,239,233,0.25)"
          strokeWidth="1.5"
        />
        {/* Net mesh hint */}
        <line x1={netX} y1={netTop} x2={netX} y2={netBot} stroke="#e8efe9" strokeWidth="2.5" />
        <line
          x1={netX - 12}
          y1={netTop}
          x2={netX + 12}
          y2={netTop}
          stroke="#c8f560"
          strokeWidth="2.5"
        />
        <text x={netX - 10} y={netTop - 6} fill="#8aa396" fontSize="9">
          net
        </text>
        {/* Racket face */}
        <ellipse
          cx={sx}
          cy={sy}
          rx="13"
          ry="9"
          fill="rgba(200,245,96,0.1)"
          stroke="#c8f560"
          strokeWidth="1.5"
        />
        <circle cx={sx} cy={sy} r="3.2" fill="#c8f560">
          <animate attributeName="opacity" values="0.45;1;0.45" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="18" y={sy + 20} fill="#8aa396" fontSize="9">
          ideal strike
        </text>
        {/* Flight path — guaranteed over net */}
        <path
          d={flight}
          fill="none"
          stroke={`url(#ballArc-${uid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          style={{ transition: "d 0.55s ease" }}
        />
        {/* Ball marker at apex */}
        <circle cx={apexX} cy={apexY} r="3" fill="#f4a261" opacity="0.9" />
        {/* Clearance bracket */}
        <line
          x1={netX + 6}
          y1={overNetY}
          x2={netX + 6}
          y2={netTop}
          stroke="#7dd3fc"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <text x={netX + 10} y={(overNetY + netTop) / 2 + 3} fill="#7dd3fc" fontSize="8">
          +{clearancePx.toFixed(0)}px clear
        </text>
        {/* Topspin drop cue */}
        <path
          d={`M ${apexX + 4} ${apexY + 2} q ${18 + spinDrop * 8} ${10 + spinDrop * 14}, ${34 + spinDrop * 10} ${22 + spinDrop * 18}`}
          fill="none"
          stroke="#f4a261"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />
        <text x={Math.min(168, landX - 36)} y={Math.min(apexY + 36, landY - 8)} fill="#f4a261" fontSize="8">
          topspin drop
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {launch.toFixed(1)}
        <span className="ml-1 text-base text-[var(--muted)]">° leave · clears the tape</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Ideal strike leaves ~{launch.toFixed(1)}° so the ball passes{" "}
        <span className="text-[var(--foreground)]/80">over</span> the net, then path ~{path.toFixed(0)}°
        (topspin) pulls it down. More path = more drop leverage after the tape; flat path keeps the ball
        penetrating deeper.
        {clearancePx >= 18
          ? " Comfortable clearance on clean contact."
          : " Thin margin — late or blocked contact clips."}
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
