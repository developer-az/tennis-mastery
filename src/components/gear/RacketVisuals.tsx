"use client";

/**
 * Gear Lab teaching visuals — launch relative to the net with topspin drop,
 * and strike-height zones (neck / chest / waist) per frame personality.
 */

import { useId } from "react";
import type { ForehandMoldAdvice } from "@/lib/equipment/forehandMold";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import {
  computeBallTrajectory,
  contactHeightWindowM,
  contactOutFrontM,
  BALL_RADIUS_M,
  NET_HEIGHT_M,
  type StrikeBand,
} from "@/lib/equipment/ballFlight";

export type { StrikeBand };

export interface StrikeZoneHint {
  /** Primary comfortable height band */
  primary: StrikeBand;
  /** Inclusive secondary bands */
  bands: StrikeBand[];
  label: string;
  detail: string;
  heightM: number;
  heightLoM: number;
  heightHiM: number;
  outFrontM: number;
  outFrontLoM: number;
  outFrontHiM: number;
}

function measuresFor(primary: StrikeBand, pathDeg: number) {
  const h = contactHeightWindowM(primary);
  const f = contactOutFrontM(pathDeg);
  return {
    heightM: h.mid,
    heightLoM: h.lo,
    heightHiM: h.hi,
    outFrontM: f.mid,
    outFrontLoM: f.lo,
    outFrontHiM: f.hi,
  };
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
      ...measuresFor("chest", path),
    };
  }
  if (hs < 98 || control >= 74 || /precision|player|control/.test(style)) {
    return {
      primary: "waist",
      bands: ["waist", "chest"],
      label: "Waist–chest (precision)",
      detail:
        "Tight sweet spot — take balls at waist to low-chest, out in front. Neck-high contact gets late and sprays; step in rather than reach up.",
      ...measuresFor("waist", path),
    };
  }
  if (hs > 100 || (input.power ?? 50) >= 74) {
    return {
      primary: "chest",
      bands: ["waist", "chest", "neck"],
      label: "Waist to chest (forgiving)",
      detail:
        "Larger bed forgives height variance — still prefer waist–chest out front for depth. Neck-high is usable; don’t wait on waist-low floaters.",
      ...measuresFor("chest", path),
    };
  }
  return {
    primary: "chest",
    bands: ["waist", "chest"],
    label: "Waist–chest (drive window)",
    detail:
      "Strike most balls between waist and chest, contact out front. Match path steepness — flatter frames hate late low contact; steeper frames hate blocked chest drives.",
    ...measuresFor("chest", path),
  };
}

function pathTypeLabel(degrees: number): string {
  if (degrees >= 30) return "Steep spin shape";
  if (degrees >= 22) return "Modern low→high drive";
  if (degrees >= 14) return "Flatter penetrating drive";
  return "Level / block-friendly path";
}

function strikeWindowCopy(launchDeg: number, pathDeg: number, zone: StrikeZoneHint): string {
  return `${zone.label} · ${zone.heightM.toFixed(2)} m high · ${zone.outFrontM.toFixed(2)} m in front · ${launchDeg.toFixed(1)}° leave · path ~${pathDeg.toFixed(0)}°.`;
}

/**
 * Side-view: strike mold → flight vs net.
 * When `flight` is passed, gauges and path match the molded setup exactly.
 */
export function LaunchAngleVisual({
  degrees,
  pathDeg = 22,
  zone,
  spin = 55,
  power = 55,
  control = 55,
  flight = null,
  label = "Strike mold → flight",
}: {
  degrees: number;
  pathDeg?: number;
  zone?: StrikeZoneHint;
  spin?: number | null;
  power?: number | null;
  control?: number | null;
  flight?: FlightMetrics | null;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const launch = Math.max(1.5, Math.min(16, flight?.launchDeg ?? degrees));
  const path = Math.max(5, Math.min(40, flight?.pathDeg ?? pathDeg));
  const z =
    zone ??
    strikeZoneForFrame({
      idealLaunchAngleDeg: launch,
      idealSwingPathDeg: path,
      spin,
      control,
      power,
    });

  const plow = flight?.plow ?? Math.round((power ?? 55) * 0.55 + 20);
  const topspin = flight?.topspin ?? Math.round((spin ?? 55) * 0.55 + path * 1.1);
  const depth = flight?.depth ?? 55;
  const flyRisk = flight?.flyRisk ?? 40;
  const netClearIn = flight?.netClearIn ?? roundClear(launch, path);

  const traj = computeBallTrajectory({
    launchDeg: launch,
    netClearIn,
    contactHeightM: z.heightM,
    outFrontM: z.outFrontM,
    topspin,
  });

  const xMax = Math.max(traj.landX, traj.netX + 2.5, 16);
  const yMax = Math.max(2.2, traj.apex.y * 1.12, z.heightM + 0.55);
  const plot = { left: 36, right: 268, top: 16, ground: 152 };
  const sx = (x: number) => plot.left + (x / xMax) * (plot.right - plot.left);
  const sy = (y: number) => plot.ground - (y / yMax) * (plot.ground - plot.top);
  const poly = traj.points
    .filter((p) => p.x <= xMax)
    .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");
  const netPx = sx(traj.netX);
  const tapeY = sy(NET_HEIGHT_M);
  const ballAtNetY = sy(traj.heightAtNet);
  const leaveRad = (launch * Math.PI) / 180;
  const faceCx = sx(0);
  const faceCy = sy(z.heightM);

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {label}
      </p>
      <svg viewBox="0 0 280 168" className="h-auto w-full max-w-lg" aria-hidden>
        <defs>
          <linearGradient id={`ballArc-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8f560" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#c8f560" stopOpacity="1" />
            <stop offset="100%" stopColor="#f4a261" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`court-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6f52" />
            <stop offset="100%" stopColor="#1b4332" />
          </linearGradient>
          <linearGradient id={`frame3d-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="45%" stopColor="#141414" />
            <stop offset="100%" stopColor="#2c2c2c" />
          </linearGradient>
        </defs>
        <rect x="8" y={plot.ground} width="264" height="12" fill={`url(#court-${uid})`} opacity="0.7" />
        <line x1="12" y1={plot.ground} x2="272" y2={plot.ground} stroke="rgba(247,245,238,0.35)" strokeWidth="1.2" />

        {[0, 0.5, NET_HEIGHT_M, 1.5, 2].map((m) => (
          <g key={m}>
            <line
              x1="12"
              y1={sy(m)}
              x2="272"
              y2={sy(m)}
              stroke="rgba(232,239,233,0.08)"
              strokeWidth="0.6"
            />
            <text x="10" y={sy(m) + 3} textAnchor="end" fill="#8aa396" fontSize="6.5">
              {m === NET_HEIGHT_M ? "net" : `${m.toFixed(1)}m`}
            </text>
          </g>
        ))}

        {/* Net — ITF 0.914 m tape */}
        <rect x={netPx - 3} y={tapeY} width="6" height={plot.ground - tapeY} fill="rgba(232,239,233,0.08)" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={i}
            x1={netPx - 5 + i * 1.6}
            y1={tapeY}
            x2={netPx - 5 + i * 1.6}
            y2={plot.ground - 2}
            stroke="rgba(232,239,233,0.28)"
            strokeWidth="0.45"
          />
        ))}
        <line x1={netPx} y1={tapeY} x2={netPx} y2={plot.ground} stroke="#d8d6cf" strokeWidth="1.5" />
        <line x1={netPx - 10} y1={tapeY} x2={netPx + 10} y2={tapeY} stroke="#f3f1ea" strokeWidth="2" />

        <polyline
          points={poly}
          fill="none"
          stroke={`url(#ballArc-${uid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Groundstroke hoop — strings face the net, ball leaves the bed */}
        <g transform={`rotate(${-launch} ${faceCx} ${faceCy})`}>
          <line
            x1={faceCx - 11}
            y1={faceCy + 2}
            x2={faceCx - 22}
            y2={faceCy + 16}
            stroke="#2a2a2a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse
            cx={faceCx}
            cy={faceCy}
            rx="5.5"
            ry="11"
            fill="#0e0e0e"
            stroke={`url(#frame3d-${uid})`}
            strokeWidth="2.4"
          />
          {[-6, -2, 2, 6].map((dy) => (
            <line
              key={dy}
              x1={faceCx - 3.2}
              y1={faceCy + dy}
              x2={faceCx + 3.2}
              y2={faceCy + dy}
              stroke="rgba(210,210,200,0.5)"
              strokeWidth="0.4"
            />
          ))}
        </g>
        <circle cx={faceCx + Math.cos(leaveRad) * 7} cy={faceCy - Math.sin(leaveRad) * 7} r="3.1" fill="#d4e054" />

        <line
          x1={netPx + 8}
          y1={ballAtNetY}
          x2={netPx + 8}
          y2={tapeY}
          stroke="#7dd3fc"
          strokeWidth="1.4"
        />
        <text x={netPx + 12} y={(ballAtNetY + tapeY) / 2 + 3} fill="#7dd3fc" fontSize="7">
          +{traj.netClearIn.toFixed(1)}″
        </text>
        <circle cx={sx(traj.apex.x)} cy={sy(traj.apex.y)} r="2.2" fill="#f4a261" />
        {traj.landX <= xMax ? (
          <circle cx={sx(traj.landX)} cy={sy(BALL_RADIUS_M)} r="3.2" fill="none" stroke="#f4a261" strokeWidth="0.8" />
        ) : null}
        <text x={sx(traj.netX)} y={plot.ground + 11} textAnchor="middle" fill="#8aa396" fontSize="6.5">
          net {traj.netX.toFixed(1)} m
        </text>
      </svg>

      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {launch.toFixed(1)}° leave
        <span className="ml-2 text-base text-[var(--muted)]">
          · +{traj.netClearIn.toFixed(1)}″ over 0.914 m tape
        </span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Ball center at the net is {traj.heightAtNet.toFixed(2)} m (
        {(traj.heightAtNet - NET_HEIGHT_M - BALL_RADIUS_M).toFixed(2)} m / {traj.netClearIn.toFixed(1)}″ of air
        over the tape). Path from the strings at {z.heightM.toFixed(2)} m, {launch.toFixed(1)}° leave — not a sketch.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FlightGauge label="Plow" value={plow} color="#e9c46a" hint="Mass through hit" />
        <FlightGauge label="Topspin" value={topspin} color="#7dd3fc" hint="Drop after tape" />
        <FlightGauge
          label="Launch"
          value={clampNum(Math.round(launch * 6.2), 8, 98)}
          color="#c8f560"
          hint={`${launch.toFixed(1)}° leave`}
        />
        <FlightGauge label="Depth" value={depth} color="#f4a261" hint={`Fly risk ${flyRisk}`} />
      </div>
    </div>
  );
}

function roundClear(launch: number, path: number): number {
  return Math.round((2.2 + launch * 1.85 + Math.max(0, path - 18) * 0.12) * 10) / 10;
}

function clampNum(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
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
 * Side view: optimal contact as a radius in front of the player and a height window.
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
  const type = pathTypeLabel(deg);
  const steep = deg / 40;

  const ground = 168;
  const pxPerM = 92;
  const torsoX = 48;
  const sx = (m: number) => torsoX + m * 155;
  const sy = (m: number) => ground - m * pxPerM;
  const cx = sx(z.outFrontM);
  const cy = sy(z.heightM);
  const rx = Math.max(10, ((z.outFrontHiM - z.outFrontLoM) / 2) * 155);
  const ry = Math.max(12, ((z.heightHiM - z.heightLoM) / 2) * pxPerM);
  const pathStartY = sy(Math.max(0.35, z.heightLoM - 0.18));
  const pathEndX = sx(z.outFrontM + 0.42);
  const pathEndY = sy(z.heightHiM + 0.12 + steep * 0.12);

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        {label}
      </p>
      <svg viewBox="0 0 240 190" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id={`pathStroke-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4a261" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#f4a261" stopOpacity="1" />
            <stop offset="100%" stopColor="#c8f560" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`torso-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a4a3c" />
            <stop offset="100%" stopColor="#152820" />
          </linearGradient>
        </defs>
        <line x1="18" y1={ground} x2="226" y2={ground} stroke="rgba(232,239,233,0.28)" strokeWidth="1.2" />
        <text x="20" y={ground + 12} fill="#8aa396" fontSize="7">
          0 m
        </text>

        {/* Height ticks */}
        {[0.5, 1, 1.5].map((m) => (
          <g key={m}>
            <line
              x1="18"
              y1={sy(m)}
              x2="226"
              y2={sy(m)}
              stroke="rgba(232,239,233,0.08)"
            />
            <text x="16" y={sy(m) + 3} textAnchor="end" fill="#8aa396" fontSize="6.5">
              {m.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Player */}
        <ellipse cx={torsoX} cy={sy(0.95)} rx="11" ry="28" fill={`url(#torso-${uid})`} />
        <circle cx={torsoX} cy={sy(1.55)} r="8" fill="#1e3329" stroke="rgba(232,239,233,0.2)" strokeWidth="0.8" />
        <text x={torsoX} y={sy(1.78)} textAnchor="middle" fill="#8aa396" fontSize="7">
          you
        </text>

        {/* Out-front radius */}
        <path
          d={`M ${torsoX + 14} ${ground - 4} A ${sx(z.outFrontM) - torsoX} ${sx(z.outFrontM) - torsoX} 0 0 1 ${sx(z.outFrontHiM)} ${ground - 4}`}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1.3"
        />
        <line
          x1={torsoX + 12}
          y1={ground + 6}
          x2={cx}
          y2={ground + 6}
          stroke="#7dd3fc"
          strokeWidth="1"
        />
        <text x={(torsoX + cx) / 2} y={ground + 16} textAnchor="middle" fill="#7dd3fc" fontSize="7">
          {z.outFrontM.toFixed(2)} m in front
        </text>

        {/* Height dimension */}
        <line x1={cx + rx + 10} y1={ground} x2={cx + rx + 10} y2={cy} stroke="#c8f560" strokeWidth="1" />
        <text
          x={cx + rx + 14}
          y={(ground + cy) / 2}
          fill="#c8f560"
          fontSize="7"
        >
          {z.heightM.toFixed(2)} m
        </text>

        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="rgba(200,245,96,0.14)"
          stroke="#c8f560"
          strokeWidth="1.8"
        />
        <text x={cx} y={cy - ry - 6} textAnchor="middle" fill="#c8f560" fontSize="8" fontWeight="600">
          {z.primary} window
        </text>

        <path
          d={`M ${torsoX + 8} ${pathStartY}
              Q ${sx(z.outFrontM * 0.45)} ${sy(z.heightLoM)}, ${cx} ${cy}
              T ${pathEndX} ${pathEndY}`}
          fill="none"
          stroke={`url(#pathStroke-${uid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <ellipse
          cx={cx + 10}
          cy={cy}
          rx="8"
          ry="12"
          fill="#111"
          stroke="#3a3a3a"
          strokeWidth="2"
          transform={`rotate(${-16 - steep * 18} ${cx + 10} ${cy})`}
        />
        <circle cx={cx} cy={cy} r="3.2" fill="#d4e054" />
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {z.heightM.toFixed(2)} m · {z.outFrontM.toFixed(2)} m out
      </p>
      <p className="mt-1 text-sm text-[var(--foreground)]/85">
        {z.label} · path ~{deg.toFixed(0)}° · {type}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Hit in a {((z.heightHiM - z.heightLoM) * 100).toFixed(0)} cm height band (
        {z.heightLoM.toFixed(2)}–{z.heightHiM.toFixed(2)} m) and {z.outFrontLoM.toFixed(2)}–
        {z.outFrontHiM.toFixed(2)} m in front of the torso. {z.detail}
      </p>
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
    `Take it ${z.outFrontM.toFixed(2)} m in front (${z.outFrontLoM.toFixed(2)}–${z.outFrontHiM.toFixed(2)} m) at ${z.heightM.toFixed(2)} m (${z.primary}; ${z.heightLoM.toFixed(2)}–${z.heightHiM.toFixed(2)} m).`,
  );
  bullets.push(
    `${launch.toFixed(1)}° leave off the strings. Path ~${path.toFixed(0)}° is the low-to-high through that window. Into the net = late or low; long = face open or bed soft.`,
  );

  if ((spin ?? 0) >= 72 || path >= 28) {
    bullets.push("Spin window: shaped poly or +2–4 g at 12 — don’t soften so much you scoop lows.");
  } else if ((control ?? 0) >= 72 || path <= 16) {
    bullets.push("Precision: +2 lbs or less tip mass. Need depth? Open the path slightly — don’t wait.");
  } else if ((power ?? 0) >= 72) {
    bullets.push("Easy depth: shorter swing is fine. Floating? +2 lbs or handle tape.");
  } else {
    bullets.push("Fine-tune: ±2 lbs, gauge, or a few grams tip vs handle — then re-check clearance.");
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        How to use this
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

/**
 * Octagonal handle bevel map — highlights the index-knuckle bevel for the
 * recommended forehand grip.
 */
export function ForehandGripBevelVisual({
  advice,
}: {
  advice: ForehandMoldAdvice;
}) {
  const uid = useId().replace(/:/g, "");
  const bevel = advice.bevel;
  // Bevel labels around an octagon (1 at top, clockwise from player's view of butt)
  const labels = [
    { n: 1, name: "Cont." },
    { n: 2, name: "East." },
    { n: 3, name: "Semi" },
    { n: 4, name: "West." },
    { n: 5, name: "X-West" },
    { n: 6, name: "—" },
    { n: 7, name: "—" },
    { n: 8, name: "—" },
  ];
  const cx = 110;
  const cy = 78;
  const r = 42;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        Optimal FH grip for this mold
      </p>
      <svg viewBox="0 0 220 160" className="h-auto w-full max-w-md" aria-hidden>
        <defs>
          <radialGradient id={`bevelCore-${uid}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#2d6a4f" />
            <stop offset="100%" stopColor="#1b4332" />
          </radialGradient>
        </defs>
        {/* Octagon */}
        <polygon
          points={Array.from({ length: 8 }, (_, i) => {
            const a = (-90 + i * 45) * (Math.PI / 180);
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
          }).join(" ")}
          fill={`url(#bevelCore-${uid})`}
          stroke="rgba(232,239,233,0.35)"
          strokeWidth="1.5"
        />
        {labels.map((lab, i) => {
          const mid = (-90 + i * 45 + 22.5) * (Math.PI / 180);
          // Face center of each bevel
          const fx = cx + (r - 2) * Math.cos(mid);
          const fy = cy + (r - 2) * Math.sin(mid);
          const tx = cx + (r + 18) * Math.cos(mid);
          const ty = cy + (r + 18) * Math.sin(mid);
          const active = lab.n === bevel;
          const a0 = (-90 + i * 45) * (Math.PI / 180);
          const a1 = (-90 + (i + 1) * 45) * (Math.PI / 180);
          const p0x = cx + r * Math.cos(a0);
          const p0y = cy + r * Math.sin(a0);
          const p1x = cx + r * Math.cos(a1);
          const p1y = cy + r * Math.sin(a1);
          return (
            <g key={lab.n}>
              {active ? (
                <path
                  d={`M ${cx} ${cy} L ${p0x} ${p0y} L ${p1x} ${p1y} Z`}
                  fill="rgba(200,245,96,0.35)"
                  stroke="#c8f560"
                  strokeWidth="1.2"
                >
                  <animate
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                </path>
              ) : null}
              <circle
                cx={fx}
                cy={fy}
                r={active ? 3.2 : 1.6}
                fill={active ? "#c8f560" : "rgba(232,239,233,0.25)"}
              />
              {lab.n <= 5 ? (
                <text
                  x={tx}
                  y={ty + 3}
                  textAnchor="middle"
                  fill={active ? "#c8f560" : "#8aa396"}
                  fontSize={active ? 9 : 8}
                  fontWeight={active ? 600 : 400}
                >
                  {lab.n}
                  {active ? ` · ${lab.name}` : ""}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e8efe9" fontSize="10">
          butt view
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#8aa396" fontSize="8">
          knuckle → bevel {bevel}
        </text>
        {/* Hand cue */}
        <path
          d={`M ${cx + 8} ${cy + r + 8} q 20 18, 36 8`}
          fill="none"
          stroke="#f4a261"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />
        <text x={cx + 48} y={cy + r + 22} fill="#f4a261" fontSize="8">
          index knuckle
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {advice.gripLabel}
      </p>
      <p className="mt-1 text-sm text-[var(--foreground)]/85">{advice.bevelHint}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{advice.why}</p>
    </div>
  );
}

/**
 * Side view of the racket at contact — oval hoop with stringbed (front) vs frame back.
 */
export function FaceAngleAtContactVisual({
  advice,
}: {
  advice: ForehandMoldAdvice;
}) {
  const uid = useId().replace(/:/g, "");
  const closed = advice.face.closedDeg;
  // 0° = vertical stringbed; positive closed tips top toward +x (flight / opponent)
  const rad = (closed * Math.PI) / 180;
  const cx = 88;
  const cy = 72;
  const rx = 15;
  const ry = 26;
  // Normal from stringbed toward ball
  const nx = Math.sin(rad);
  const ny = -Math.cos(rad);
  // Back of hoop (opposite)
  const bx = -nx;
  const by = -ny;
  const ballX = cx + nx * 50;
  const ballY = cy + ny * 50;
  // Throat stub toward bottom of hoop in local face coords
  const throatLocal = [0, ry + 10] as const;
  const throatX = cx + (throatLocal[0] * Math.cos(rad) - throatLocal[1] * Math.sin(rad));
  const throatY = cy + (throatLocal[0] * Math.sin(rad) + throatLocal[1] * Math.cos(rad));
  const buttX = cx + (0 * Math.cos(rad) - (ry + 28) * Math.sin(rad));
  const buttY = cy + (0 * Math.sin(rad) + (ry + 28) * Math.cos(rad));

  // Transform helper for ellipse outline points
  const xf = (lx: number, ly: number) => {
    const x = cx + (lx * Math.cos(rad) - ly * Math.sin(rad));
    const y = cy + (lx * Math.sin(rad) + ly * Math.cos(rad));
    return `${x},${y}`;
  };

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Racket face at contact
      </p>
      <svg viewBox="0 0 220 160" className="h-auto w-full max-w-md" aria-hidden>
        <defs>
          <linearGradient id={`stringsFront-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(200,245,96,0.55)" />
            <stop offset="100%" stopColor="rgba(200,245,96,0.2)" />
          </linearGradient>
          <linearGradient id={`frameBack-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(244,162,97,0.15)" />
            <stop offset="100%" stopColor="rgba(244,162,97,0.45)" />
          </linearGradient>
        </defs>
        <line
          x1="20"
          y1="148"
          x2="200"
          y2="148"
          stroke="rgba(232,239,233,0.2)"
          strokeWidth="1.2"
        />
        <text x="168" y="144" fill="#8aa396" fontSize="8">
          toward opponent →
        </text>
        <line
          x1={cx}
          y1={cy - 40}
          x2={cx}
          y2={cy + 34}
          stroke="rgba(232,239,233,0.3)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <text x={cx - 26} y={cy - 44} fill="#8aa396" fontSize="8">
          vertical
        </text>
        <path
          d={`M ${cx} ${cy - 34} A 34 34 0 0 1 ${cx + Math.sin(rad) * 34} ${cy - Math.cos(rad) * 34}`}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1.6"
        />
        <text x={cx + 8 + closed * 0.35} y={cy - 40} fill="#7dd3fc" fontSize="9">
          {closed.toFixed(1)}° closed
        </text>

        {/* Frame back (amber) — slight offset away from ball */}
        <ellipse
          cx={cx + bx * 3}
          cy={cy + by * 3}
          rx={rx + 1}
          ry={ry + 1}
          transform={`rotate(${closed} ${cx + bx * 3} ${cy + by * 3})`}
          fill={`url(#frameBack-${uid})`}
          stroke="#f4a261"
          strokeWidth="2.2"
        />
        {/* Stringbed front (lime) */}
        <ellipse
          cx={cx + nx * 1.5}
          cy={cy + ny * 1.5}
          rx={rx}
          ry={ry}
          transform={`rotate(${closed} ${cx + nx * 1.5} ${cy + ny * 1.5})`}
          fill={`url(#stringsFront-${uid})`}
          stroke="#c8f560"
          strokeWidth="1.8"
        />
        {/* Cross strings */}
        {[-16, -8, 0, 8, 16].map((oy) => (
          <line
            key={`h-${oy}`}
            x1={parseFloat(xf(-rx + 3, oy).split(",")[0])}
            y1={parseFloat(xf(-rx + 3, oy).split(",")[1])}
            x2={parseFloat(xf(rx - 3, oy).split(",")[0])}
            y2={parseFloat(xf(rx - 3, oy).split(",")[1])}
            stroke="rgba(200,245,96,0.45)"
            strokeWidth="0.7"
          />
        ))}
        {/* Throat + handle stub */}
        <line
          x1={throatX}
          y1={throatY}
          x2={buttX}
          y2={buttY}
          stroke="rgba(232,239,233,0.55)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3" fill="#c8f560">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={ballX} cy={ballY} r="7" fill="rgba(244,162,97,0.9)" />
        <line
          x1={cx + nx * 10}
          y1={cy + ny * 10}
          x2={ballX - nx * 8}
          y2={ballY - ny * 8}
          stroke="#f4a261"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />

        {/* Front / back legend */}
        <rect x="14" y="18" width="10" height="10" rx="2" fill="rgba(200,245,96,0.45)" stroke="#c8f560" />
        <text x="28" y="27" fill="#c8f560" fontSize="8">
          Strings · front (hits ball)
        </text>
        <rect x="14" y="34" width="10" height="10" rx="2" fill="rgba(244,162,97,0.35)" stroke="#f4a261" />
        <text x="28" y="43" fill="#f4a261" fontSize="8">
          Frame · back
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {advice.face.label}
        <span className="ml-2 text-base text-[var(--muted)]">
          · ~{advice.face.closedDeg.toFixed(1)}° past vertical
        </span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{advice.face.detail}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]/80">
        Pair with {advice.prefersHeight}-high contact on the{" "}
        <span className="text-[var(--accent)]">{advice.gripLabel.toLowerCase()}</span>.{" "}
        {advice.avoid}
      </p>
    </div>
  );
}

/**
 * Contact height × face lean — shows why the grip and face belong together.
 */
export function ContactGeometryVisual({
  advice,
}: {
  advice: ForehandMoldAdvice;
}) {
  const bands: { id: "neck" | "chest" | "waist"; y: number; h: number; title: string }[] = [
    { id: "neck", y: 18, h: 22, title: "Neck" },
    { id: "chest", y: 42, h: 28, title: "Chest" },
    { id: "waist", y: 72, h: 26, title: "Waist" },
  ];
  const primary = bands.find((b) => b.id === advice.prefersHeight) ?? bands[1];
  const closed = advice.face.closedDeg;
  const hx = 118;
  const hy = primary.y + primary.h * 0.55;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
        Contact geometry
      </p>
      <svg viewBox="0 0 220 130" className="h-auto w-full max-w-md" aria-hidden>
        <rect
          x="24"
          y="14"
          width="32"
          height="88"
          rx="12"
          fill="rgba(232,239,233,0.05)"
          stroke="rgba(232,239,233,0.22)"
        />
        <circle
          cx="40"
          cy="10"
          r="7"
          fill="rgba(232,239,233,0.1)"
          stroke="rgba(232,239,233,0.3)"
        />
        {bands.map((b) => {
          const active = b.id === advice.prefersHeight;
          return (
            <g key={b.id}>
              <rect
                x="26"
                y={b.y}
                width="28"
                height={b.h}
                rx="3"
                fill={active ? "rgba(200,245,96,0.28)" : "transparent"}
                stroke={active ? "#c8f560" : "rgba(232,239,233,0.12)"}
              />
              <text
                x="62"
                y={b.y + b.h / 2 + 3}
                fill={active ? "#c8f560" : "#8aa396"}
                fontSize="8"
              >
                {b.title}
                {active ? " · strike" : ""}
              </text>
            </g>
          );
        })}
        <line
          x1="78"
          y1={hy}
          x2={hx - 14}
          y2={hy}
          stroke="rgba(125,211,252,0.5)"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        {/* Oval hoop — lime = strings front */}
        <ellipse
          cx={hx + 2}
          cy={hy}
          rx="9"
          ry="14"
          transform={`rotate(${closed} ${hx + 2} ${hy})`}
          fill="rgba(244,162,97,0.25)"
          stroke="#f4a261"
          strokeWidth="1.4"
        />
        <ellipse
          cx={hx}
          cy={hy}
          rx="8"
          ry="13"
          transform={`rotate(${closed} ${hx} ${hy})`}
          fill="rgba(200,245,96,0.3)"
          stroke="#c8f560"
          strokeWidth="1.5"
        />
        <circle cx={hx} cy={hy} r="2.4" fill="#c8f560" />
        <text x={hx + 16} y={hy - 8} fill="#7dd3fc" fontSize="8">
          face ~{closed.toFixed(0)}° closed
        </text>
        <text x={hx + 16} y={hy + 6} fill="#c8f560" fontSize="7">
          lime = strings front
        </text>
        <text x={hx + 16} y={hy + 16} fill="#f4a261" fontSize="7">
          amber = frame back
        </text>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Best geometry: {advice.prefersHeight}-high ball, bevel {advice.bevel}, face ~
        {advice.face.closedDeg.toFixed(1)}° closed — coaching estimate, not a video measurement.
      </p>
    </div>
  );
}

