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
  BASELINE_TO_NET_M,
  formatFt,
  M_TO_FT,
  NET_HEIGHT_M,
  type StrikeBand,
} from "@/lib/equipment/ballFlight";
import { AthleteSilhouette, RacketHoopPhoto } from "@/components/gear/AthleteSilhouette";

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
  return `${zone.label} · ${formatFt(zone.heightM)} high · ${formatFt(zone.outFrontM)} in front · ${launchDeg.toFixed(1)}° leave · path ~${pathDeg.toFixed(0)}°.`;
}

function FootRuler({
  x,
  sy,
  loM,
  hiM,
  maxFt = 6,
}: {
  x: number;
  sy: (m: number) => number;
  loM: number;
  hiM: number;
  maxFt?: number;
}) {
  const ticks = Array.from({ length: maxFt + 1 }, (_, ft) => ft);
  return (
    <g>
      <rect
        x={x - 5}
        y={sy(hiM)}
        width="10"
        height={Math.max(2, sy(loM) - sy(hiM))}
        fill="rgba(197,232,90,0.22)"
        rx="1"
      />
      <line x1={x} y1={sy(0)} x2={x} y2={sy(maxFt / M_TO_FT)} stroke="rgba(232,239,233,0.5)" strokeWidth="1.4" />
      {ticks.map((ft) => {
        const y = sy(ft / M_TO_FT);
        return (
          <g key={ft}>
            <line x1={x} y1={y} x2={x + 7} y2={y} stroke="rgba(232,239,233,0.55)" strokeWidth="1" />
            <text x={x - 3} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="6.5">
              {ft} ft
            </text>
          </g>
        );
      })}
      <text x={x + 10} y={(sy(loM) + sy(hiM)) / 2 + 3} fill="var(--chart-control)" fontSize="6.5">
        sweet
      </text>
    </g>
  );
}

/** Side-view athlete cutout facing the net (+x). Scale only — not a measured height. */
function PlayerSideFigure({
  x,
  ground,
}: {
  x: number;
  sy?: (m: number) => number;
  ground: number;
  handX?: number;
  handY?: number;
}) {
  const scale = 0.92;
  return <AthleteSilhouette x={x} y={ground - 6} scale={scale} />;
}

function ClosedGroundstrokeFace({
  cx,
  cy,
  closedDeg,
}: {
  cx: number;
  cy: number;
  closedDeg: number;
  uid?: string;
}) {
  return (
    <RacketHoopPhoto
      cx={cx}
      cy={cy}
      rot={-12}
      faceClosed={closedDeg}
      scale={0.72}
      frame="var(--chart-control)"
      strings="color-mix(in srgb, var(--foreground) 35%, transparent)"
    />
  );
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
  faceClosedDeg = 8,
  label = "Strike mold → flight",
  compact = false,
}: {
  degrees: number;
  pathDeg?: number;
  zone?: StrikeZoneHint;
  spin?: number | null;
  power?: number | null;
  control?: number | null;
  flight?: FlightMetrics | null;
  faceClosedDeg?: number;
  label?: string;
  /** Hide gauges + long copy when embedded in a larger story. */
  compact?: boolean;
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

  const xMin = -z.outFrontM - 0.35;
  const xMax = Math.max(traj.landX, traj.netX + 2.5, 16);
  const yMax = Math.max(1.95, traj.apex.y * 1.08, 6.2 / M_TO_FT);
  const plot = { left: 48, right: 292, top: 10, ground: 188 };
  const sx = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left);
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
  const baseX = sx(-z.outFrontM);
  const launchLen = 26;
  const closed = Math.max(0, Math.min(28, faceClosedDeg));

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {label}
      </p>
      <svg viewBox="0 0 300 210" className="h-auto w-full max-w-lg" aria-hidden>
        <defs>
          <linearGradient id={`ballArc-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-control)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--chart-control)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--chart-power)" stopOpacity="0.95" />
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
        <rect x="8" y={plot.ground} width="284" height="14" fill={`url(#court-${uid})`} opacity="0.7" />
        <line x1="12" y1={plot.ground} x2="292" y2={plot.ground} stroke="rgba(247,245,238,0.4)" strokeWidth="1.4" />

        <FootRuler x={22} sy={sy} loM={z.heightLoM} hiM={z.heightHiM} />

        <line
          x1={baseX}
          y1={plot.ground - 16}
          x2={baseX}
          y2={plot.ground}
          stroke="#f4f1ea"
          strokeWidth="2"
        />
        <text x={baseX} y={plot.ground + 12} textAnchor="middle" fill="#f4f1ea" fontSize="6.5">
          baseline
        </text>

        <PlayerSideFigure x={baseX + 6} ground={plot.ground} />

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
        <text x={netPx} y={tapeY - 5} textAnchor="middle" fill="var(--muted)" fontSize="6.5">
          net 3.0 ft
        </text>

        <polyline
          points={poly}
          fill="none"
          stroke={`url(#ballArc-${uid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <ClosedGroundstrokeFace cx={faceCx} cy={faceCy} closedDeg={closed} />

        <line
          x1={faceCx}
          y1={faceCy}
          x2={faceCx + launchLen}
          y2={faceCy}
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        <line
          x1={faceCx}
          y1={faceCy}
          x2={faceCx + Math.cos(leaveRad) * launchLen}
          y2={faceCy - Math.sin(leaveRad) * launchLen}
          stroke="var(--chart-control)"
          strokeWidth="1.6"
        />
        <path
          d={`M ${faceCx + 16} ${faceCy} A 16 16 0 0 ${launch > 0 ? 0 : 1} ${faceCx + Math.cos(leaveRad) * 16} ${faceCy - Math.sin(leaveRad) * 16}`}
          fill="none"
          stroke="var(--chart-control)"
          strokeWidth="1.2"
        />
        <text
          x={faceCx + 20}
          y={faceCy - Math.sin(leaveRad) * 10 - 4}
          fill="var(--chart-control)"
          fontSize="7"
        >
          {launch.toFixed(1)}° leave
        </text>
        <text x={faceCx + 10} y={faceCy + 22} fill="var(--chart-power)" fontSize="6.5">
          {closed.toFixed(1)}° closed
        </text>
        <circle
          cx={faceCx + Math.cos(leaveRad) * 9}
          cy={faceCy - Math.sin(leaveRad) * 9}
          r="3.1"
          fill="#d4e054"
        />

        <line
          x1={netPx + 8}
          y1={ballAtNetY}
          x2={netPx + 8}
          y2={tapeY}
          stroke="var(--chart-spin)"
          strokeWidth="1.4"
        />
        <text x={netPx + 12} y={(ballAtNetY + tapeY) / 2 + 3} fill="var(--chart-spin)" fontSize="7">
          +{traj.netClearIn.toFixed(1)}″
        </text>
        {traj.landX <= xMax ? (
          <circle cx={sx(traj.landX)} cy={sy(BALL_RADIUS_M)} r="3.2" fill="none" stroke="var(--chart-power)" strokeWidth="0.8" />
        ) : null}
        <text x={netPx} y={plot.ground + 12} textAnchor="middle" fill="var(--muted)" fontSize="6.5">
          {formatFt(BASELINE_TO_NET_M, 0)} from baseline
        </text>
      </svg>

      {!compact ? (
        <>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
            {launch.toFixed(1)}° leave
            <span className="ml-2 text-base text-[var(--muted)]">
              · +{traj.netClearIn.toFixed(1)}″ over a 3.0 ft net
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Contact {formatFt(z.outFrontM)} in front of the baseline at {formatFt(z.heightM)}. Face{" "}
            {closed.toFixed(1)}° closed. Ball center at the net is {formatFt(traj.heightAtNet)} (
            {traj.netClearIn.toFixed(1)}″ of air over the tape).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FlightGauge label="Plow" value={plow} color="var(--chart-comfort)" hint="Mass through hit" />
            <FlightGauge label="Topspin" value={topspin} color="var(--chart-spin)" hint="Drop after tape" />
            <FlightGauge
              label="Launch"
              value={clampNum(Math.round(launch * 6.2), 8, 98)}
              color="var(--chart-control)"
              hint={`${launch.toFixed(1)}° leave`}
            />
            <FlightGauge label="Depth" value={depth} color="var(--chart-power)" hint={`Fly risk ${flyRisk}`} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs tabular-nums text-[var(--muted)]">
          {launch.toFixed(1)}° leave · +{traj.netClearIn.toFixed(1)}″ clear · apex {formatFt(traj.apex.y)} · land ~
          {formatFt(traj.landX)} past contact
        </p>
      )}
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
  faceClosedDeg = 8,
  label = "Where to strike on this frame",
  compact = false,
}: {
  degrees: number;
  zone?: StrikeZoneHint;
  faceClosedDeg?: number;
  label?: string;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const deg = Math.max(5, Math.min(40, degrees));
  const z = zone ?? strikeZoneForFrame({ idealSwingPathDeg: deg });
  const type = pathTypeLabel(deg);
  const steep = deg / 40;
  const closed = Math.max(0, Math.min(28, faceClosedDeg));

  const ground = 188;
  const yMax = 1.95;
  const pxPerM = (ground - 12) / yMax;
  const torsoX = 70;
  const sx = (m: number) => torsoX + m * 140;
  const sy = (m: number) => ground - m * pxPerM;
  const cx = sx(z.outFrontM);
  const cy = sy(z.heightM);
  const rx = Math.max(9, ((z.outFrontHiM - z.outFrontLoM) / 2) * 140);
  const ry = Math.max(11, ((z.heightHiM - z.heightLoM) / 2) * pxPerM);

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        {label}
      </p>
      <svg viewBox="0 0 260 210" className="h-auto w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id={`pathStroke-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-power)" stopOpacity="0.25" />
            <stop offset="55%" stopColor="var(--chart-power)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--chart-control)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`frame3d-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#141414" />
          </linearGradient>
        </defs>
        <line x1="18" y1={ground} x2="246" y2={ground} stroke="rgba(232,239,233,0.35)" strokeWidth="1.4" />
        <text x="72" y={ground + 12} fill="var(--muted)" fontSize="6.5">
          0 ft
        </text>

        <FootRuler x={22} sy={sy} loM={z.heightLoM} hiM={z.heightHiM} />

        <PlayerSideFigure x={torsoX} ground={ground} />

        <path
          d={`M ${torsoX + 14} ${ground - 3} A ${sx(z.outFrontM) - torsoX} 28 0 0 1 ${sx(z.outFrontHiM)} ${ground - 3}`}
          fill="none"
          stroke="var(--chart-spin)"
          strokeWidth="1.4"
        />
        <line x1={torsoX + 8} y1={ground + 6} x2={cx} y2={ground + 6} stroke="var(--chart-spin)" strokeWidth="1" />
        <text x={(torsoX + cx) / 2} y={ground + 16} textAnchor="middle" fill="var(--chart-spin)" fontSize="7">
          {formatFt(z.outFrontM)} in front
        </text>

        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="rgba(197,232,90,0.14)"
          stroke="var(--chart-control)"
          strokeWidth="1.8"
        />
        <text x={cx} y={cy - ry - 8} textAnchor="middle" fill="var(--chart-control)" fontSize="7.5" fontWeight="600">
          {z.primary} · {formatFt(z.heightM)}
        </text>

        <path
          d={`M ${torsoX + 10} ${sy(Math.max(0.4, z.heightLoM - 0.15))}
              Q ${sx(z.outFrontM * 0.45)} ${sy(z.heightLoM)}, ${cx} ${cy}
              T ${sx(z.outFrontM + 0.28)} ${sy(z.heightHiM + 0.08 + steep * 0.1)}`}
          fill="none"
          stroke={`url(#pathStroke-${uid})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <ClosedGroundstrokeFace cx={cx} cy={cy} closedDeg={closed} />
        <circle cx={cx + 6} cy={cy} r="3" fill="var(--chart-control)" />
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {formatFt(z.heightM)} · {formatFt(z.outFrontM)} out
      </p>
      <p className="mt-1 text-sm text-[var(--foreground)]/85">
        {z.label} · path ~{deg.toFixed(0)}° · {type} · face {closed.toFixed(1)}° closed
      </p>
      {!compact ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Sweet-spot window {formatFt(z.heightLoM)}–{formatFt(z.heightHiM)} high and {formatFt(z.outFrontLoM)}–
          {formatFt(z.outFrontHiM)} in front of the torso. {z.detail}
        </p>
      ) : (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Window {formatFt(z.heightLoM)}–{formatFt(z.heightHiM)} · {formatFt(z.outFrontLoM)}–
          {formatFt(z.outFrontHiM)} out
        </p>
      )}
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
    `Take it ${formatFt(z.outFrontM)} in front (${formatFt(z.outFrontLoM)}–${formatFt(z.outFrontHiM)}) at ${formatFt(z.heightM)} (${z.primary}; ${formatFt(z.heightLoM)}–${formatFt(z.heightHiM)}).`,
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
  const r = 44;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
        Optimal FH grip for this mold
      </p>
      <svg viewBox="0 0 220 160" className="h-auto w-full max-w-md" aria-hidden>
        <defs>
          <linearGradient id={`bevelFace-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3d5c4a" />
            <stop offset="100%" stopColor="#1a3328" />
          </linearGradient>
          <linearGradient id={`bevelEdge-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c5c9c6" />
            <stop offset="100%" stopColor="#6a726c" />
          </linearGradient>
        </defs>
        <polygon
          points={Array.from({ length: 8 }, (_, i) => {
            const a = (-90 + i * 45) * (Math.PI / 180);
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
          }).join(" ")}
          fill={`url(#bevelFace-${uid})`}
          stroke={`url(#bevelEdge-${uid})`}
          strokeWidth="2.2"
        />
        {labels.map((lab, i) => {
          const mid = (-90 + i * 45 + 22.5) * (Math.PI / 180);
          const fx = cx + (r - 6) * Math.cos(mid);
          const fy = cy + (r - 6) * Math.sin(mid);
          const tx = cx + (r + 20) * Math.cos(mid);
          const ty = cy + (r + 20) * Math.sin(mid);
          const active = lab.n === bevel;
          const a0 = (-90 + i * 45) * (Math.PI / 180);
          const a1 = (-90 + (i + 1) * 45) * (Math.PI / 180);
          const p0x = cx + r * Math.cos(a0);
          const p0y = cy + r * Math.sin(a0);
          const p1x = cx + r * Math.cos(a1);
          const p1y = cy + r * Math.sin(a1);
          const inner = r - 10;
          return (
            <g key={lab.n}>
              <line
                x1={cx + inner * Math.cos(a0)}
                y1={cy + inner * Math.sin(a0)}
                x2={p0x}
                y2={p0y}
                stroke="rgba(232,239,233,0.18)"
                strokeWidth="0.8"
              />
              {active ? (
                <path
                  d={`M ${cx} ${cy} L ${p0x} ${p0y} L ${p1x} ${p1y} Z`}
                  fill="color-mix(in srgb, var(--accent) 35%, transparent)"
                  stroke="var(--chart-control)"
                  strokeWidth="1.4"
                >
                  <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite" />
                </path>
              ) : null}
              <circle
                cx={fx}
                cy={fy}
                r={active ? 4 : 1.8}
                fill={active ? "var(--chart-control)" : "rgba(232,239,233,0.25)"}
              />
              {lab.n <= 5 ? (
                <text
                  x={tx}
                  y={ty + 3}
                  textAnchor="middle"
                  fill={active ? "var(--chart-control)" : "var(--muted)"}
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
        <circle cx={cx} cy={cy} r="14" fill="#0e1814" stroke="rgba(232,239,233,0.25)" strokeWidth="1" />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--foreground)" fontSize="9">
          butt
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--muted)" fontSize="7">
          knuckle → {bevel}
        </text>
        <path
          d={`M ${cx + 10} ${cy + r + 6} q 18 14, 34 6`}
          fill="none"
          stroke="var(--chart-power)"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />
        <text x={cx + 46} y={cy + r + 20} fill="var(--chart-power)" fontSize="8">
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

export function FaceAngleAtContactVisual({
  advice,
  compact = false,
}: {
  advice: ForehandMoldAdvice;
  compact?: boolean;
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
            <stop offset="0%" stopColor="rgba(197,232,90,0.55)" />
            <stop offset="100%" stopColor="rgba(197,232,90,0.2)" />
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
        <text x="168" y="144" fill="var(--muted)" fontSize="8">
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
        <text x={cx - 26} y={cy - 44} fill="var(--muted)" fontSize="8">
          vertical
        </text>
        <path
          d={`M ${cx} ${cy - 34} A 34 34 0 0 1 ${cx + Math.sin(rad) * 34} ${cy - Math.cos(rad) * 34}`}
          fill="none"
          stroke="var(--chart-spin)"
          strokeWidth="1.6"
        />
        <text x={cx + 8 + closed * 0.35} y={cy - 40} fill="var(--chart-spin)" fontSize="9">
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
          stroke="var(--chart-power)"
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
          stroke="var(--chart-control)"
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
            stroke="rgba(197,232,90,0.45)"
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
        <circle cx={cx} cy={cy} r="3" fill="var(--chart-control)">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={ballX} cy={ballY} r="7" fill="rgba(244,162,97,0.9)" />
        <line
          x1={cx + nx * 10}
          y1={cy + ny * 10}
          x2={ballX - nx * 8}
          y2={ballY - ny * 8}
          stroke="var(--chart-power)"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />

        {/* Front / back legend */}
        <rect x="14" y="18" width="10" height="10" rx="2" fill="rgba(197,232,90,0.45)" stroke="var(--chart-control)" />
        <text x="28" y="27" fill="var(--chart-control)" fontSize="8">
          Strings · front (hits ball)
        </text>
        <rect x="14" y="34" width="10" height="10" rx="2" fill="rgba(244,162,97,0.35)" stroke="var(--chart-power)" />
        <text x="28" y="43" fill="var(--chart-power)" fontSize="8">
          Frame · back
        </text>
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {advice.face.label}
        <span className="ml-2 text-base text-[var(--muted)]">
          · ~{advice.face.closedDeg.toFixed(1)}° past vertical
        </span>
      </p>
      {!compact ? (
        <>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{advice.face.detail}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]/80">
            Pair with {advice.prefersHeight}-high contact on the{" "}
            <span className="text-[var(--accent)]">{advice.gripLabel.toLowerCase()}</span>.{" "}
            {advice.avoid}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Lime = strings (hits ball). Amber = frame back. Pair with {advice.prefersHeight}-high contact ·{" "}
          {advice.gripLabel.toLowerCase()}.
        </p>
      )}
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
  const hx = 132;
  const hy = primary.y + primary.h * 0.55;

  return (
    <div className="relative">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--chart-spin)]">
        Contact geometry
      </p>
      <svg viewBox="0 0 220 130" className="h-auto w-full max-w-md" aria-hidden>
        <AthleteSilhouette x={40} y={108} scale={0.72} opacity={0.88} />
        {bands.map((b) => {
          const active = b.id === advice.prefersHeight;
          return (
            <g key={b.id}>
              <rect
                x="68"
                y={b.y}
                width="28"
                height={b.h}
                rx="2"
                fill={active ? "color-mix(in srgb, var(--accent) 28%, transparent)" : "transparent"}
                stroke={active ? "var(--chart-control)" : "color-mix(in srgb, var(--foreground) 12%, transparent)"}
              />
              <text
                x="102"
                y={b.y + b.h / 2 + 3}
                fill={active ? "var(--chart-control)" : "var(--muted)"}
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
          x2={hx - 18}
          y2={hy}
          stroke="color-mix(in srgb, var(--chart-spin) 55%, transparent)"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        <RacketHoopPhoto cx={hx} cy={hy} rot={-8} faceClosed={closed} scale={0.55} />
        <text x={hx} y={hy + 42} textAnchor="middle" fill="var(--muted)" fontSize="7.5">
          face {closed.toFixed(1)}° closed
        </text>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        Prefer {advice.prefersHeight}-high contact with a {advice.face.label.toLowerCase()} face — coaching
        estimate, not a video measurement.
      </p>
    </div>
  );
}

/** Plan aliases — concrete court diagrams (same implementations). */
export const CourtSideFlightDiagram = LaunchAngleVisual;
export const StrikeWindowDiagram = SwingPathVisual;
export const FaceClosureCallout = FaceAngleAtContactVisual;
