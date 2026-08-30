"use client";

/**
 * Gear Lab teaching visuals — launch relative to the net with topspin drop,
 * and strike-height zones (neck / chest / waist) per frame personality.
 */

import { useId } from "react";
import type { ForehandMoldAdvice } from "@/lib/equipment/forehandMold";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import { AthleteSilhouette, RacketHoopPhoto } from "@/components/gear/AthleteSilhouette";
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
      <line x1={x} y1={sy(0)} x2={x} y2={sy(maxFt / M_TO_FT)} stroke="color-mix(in srgb, var(--foreground) 45%, transparent)" strokeWidth="1.4" />
      {ticks.map((ft) => {
        const y = sy(ft / M_TO_FT);
        return (
          <g key={ft}>
            <line x1={x} y1={y} x2={x + 7} y2={y} stroke="color-mix(in srgb, var(--foreground) 50%, transparent)" strokeWidth="1" />
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

/**
 * Measured side-view at contact: filled athlete cutout + photo-style hoop.
 * Face closed past vertical (clockwise = top of hoop toward the net / +x).
 */
function ContactStroke({
  baseX,
  ground,
  contactX,
  contactY,
  closedDeg,
}: {
  baseX: number;
  sy?: (m: number) => number;
  ground: number;
  contactX: number;
  contactY: number;
  closedDeg: number;
}) {
  const closed = Math.max(0, Math.min(28, closedDeg));
  const scale = Math.max(0.55, Math.min(0.95, (ground - 40) / 90));
  return (
    <g>
      <AthleteSilhouette x={baseX} y={ground - 4} scale={scale} opacity={0.92} />
      <RacketHoopPhoto
        cx={contactX}
        cy={contactY}
        rot={-14}
        faceClosed={closed}
        scale={0.68}
        frame="var(--chart-control)"
        strings="color-mix(in srgb, var(--foreground) 32%, transparent)"
      />
      <line
        x1={contactX}
        y1={contactY - 20}
        x2={contactX}
        y2={contactY + 18}
        stroke="color-mix(in srgb, var(--foreground) 22%, transparent)"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </g>
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
      <p className="sf-kicker mb-2">
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
        <line x1="12" y1={plot.ground} x2="292" y2={plot.ground} stroke="color-mix(in srgb, var(--foreground) 35%, transparent)" strokeWidth="1.4" />

        <FootRuler x={22} sy={sy} loM={z.heightLoM} hiM={z.heightHiM} />

        <line
          x1={baseX}
          y1={plot.ground - 16}
          x2={baseX}
          y2={plot.ground}
          stroke="var(--foreground)"
          strokeWidth="2"
        />
        <text x={baseX} y={plot.ground + 12} textAnchor="middle" fill="var(--foreground)" fontSize="6.5">
          baseline
        </text>

        <ContactStroke
          baseX={baseX + 4}
          sy={sy}
          ground={plot.ground}
          contactX={faceCx}
          contactY={faceCy}
          closedDeg={closed}
        />

        <rect x={netPx - 3} y={tapeY} width="6" height={plot.ground - tapeY} fill="rgba(232,239,233,0.08)" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={i}
            x1={netPx - 5 + i * 1.6}
            y1={tapeY}
            x2={netPx - 5 + i * 1.6}
            y2={plot.ground - 2}
            stroke="color-mix(in srgb, var(--foreground) 28%, transparent)"
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
            {formatFt(z.outFrontM)} out · {formatFt(z.heightM)} high · face {closed.toFixed(1)}° closed · +
            {traj.netClearIn.toFixed(1)}″ over tape.
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
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]">
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
      <p className="sf-kicker sf-kicker-amber mb-2">
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
        <line x1="18" y1={ground} x2="246" y2={ground} stroke="color-mix(in srgb, var(--foreground) 35%, transparent)" strokeWidth="1.4" />
        <text x="72" y={ground + 12} fill="var(--muted)" fontSize="6.5">
          0 ft
        </text>

        <FootRuler x={22} sy={sy} loM={z.heightLoM} hiM={z.heightHiM} />

        <ContactStroke
          baseX={torsoX}
          sy={sy}
          ground={ground}
          contactX={cx}
          contactY={cy}
          closedDeg={closed}
        />

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
        <circle cx={cx + 5} cy={cy} r="2.6" fill="#d4e054" />
      </svg>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
        {formatFt(z.heightM)} · {formatFt(z.outFrontM)} out
      </p>
      <p className="mt-1 text-sm text-[var(--foreground)]/85">
        {z.label} · path ~{deg.toFixed(0)}° · {type} · face {closed.toFixed(1)}° closed
      </p>
      {!compact ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Window {formatFt(z.heightLoM)}–{formatFt(z.heightHiM)} · {formatFt(z.outFrontLoM)}–
          {formatFt(z.outFrontHiM)} out. {z.detail}
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
      <p className="sf-kicker">
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
/**
 * Product-manual bevel chart — unrolled butt-cap faces with knuckle marker.
 * Bevel 1 = continental … bevel 4/5 = western / extreme western.
 */
export function ForehandGripBevelVisual({
  advice,
}: {
  advice: ForehandMoldAdvice;
}) {
  const bevel = advice.bevel;
  const faces = [
    { n: 1, name: "Continental" },
    { n: 2, name: "Eastern" },
    { n: 3, name: "Semi-western" },
    { n: 4, name: "Western" },
    { n: 5, name: "X-Western" },
    { n: 6, name: "—" },
    { n: 7, name: "—" },
    { n: 8, name: "—" },
  ];
  const x0 = 18;
  const y0 = 36;
  const w = 22;
  const h = 54;
  const gap = 3;

  return (
    <div className="relative">
      <p className="sf-kicker sf-kicker-amber mb-2">
        Optimal FH grip for this mold
      </p>
      <svg viewBox="0 0 220 150" className="h-auto w-full max-w-md" aria-hidden>
        <text x="18" y="18" fill="var(--muted)" fontSize="8">
          Butt-cap bevels (unrolled) · index knuckle on highlighted face
        </text>
        {faces.map((f, i) => {
          const x = x0 + i * (w + gap);
          const active = f.n === bevel;
          return (
            <g key={f.n}>
              <rect
                x={x}
                y={y0}
                width={w}
                height={h}
                rx="2"
                fill={
                  active
                    ? "color-mix(in srgb, var(--accent) 38%, var(--panel))"
                    : "color-mix(in srgb, var(--foreground) 8%, var(--panel))"
                }
                stroke={active ? "var(--chart-control)" : "color-mix(in srgb, var(--foreground) 22%, transparent)"}
                strokeWidth={active ? 1.6 : 0.9}
              />
              {/* Facet highlight ridge */}
              <line
                x1={x + 3}
                y1={y0 + 6}
                x2={x + 3}
                y2={y0 + h - 6}
                stroke="color-mix(in srgb, var(--foreground) 18%, transparent)"
                strokeWidth="1"
              />
              <text
                x={x + w / 2}
                y={y0 + h / 2 + 3}
                textAnchor="middle"
                fill={active ? "var(--accent)" : "var(--muted)"}
                fontSize={active ? 11 : 9}
                fontWeight={active ? 700 : 500}
              >
                {f.n}
              </text>
              {f.n <= 5 ? (
                <text
                  x={x + w / 2}
                  y={y0 + h + 14}
                  textAnchor="middle"
                  fill={active ? "var(--chart-control)" : "var(--muted)"}
                  fontSize="6.5"
                >
                  {active ? f.name.slice(0, 4) : f.n}
                </text>
              ) : null}
              {active ? (
                <g>
                  <path
                    d={`M ${x + w / 2} ${y0 - 4} L ${x + w / 2 - 5} ${y0 - 12} L ${x + w / 2 + 5} ${y0 - 12} Z`}
                    fill="var(--chart-power)"
                  />
                  <text x={x + w / 2} y={y0 - 16} textAnchor="middle" fill="var(--chart-power)" fontSize="7">
                    knuckle
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        <text x="18" y="128" fill="var(--muted)" fontSize="7.5">
          1 Cont. → 2 East. → 3 Semi → 4 West. → 5 Extreme
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
  const cx = 96;
  const cy = 58;

  return (
    <div className="relative">
      <p className="sf-kicker mb-2">
        Racket face at contact
      </p>
      <svg viewBox="0 0 220 160" className="h-auto w-full max-w-md" aria-hidden>
        <defs>
          <linearGradient id={`macroFrame-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d8ddd9" />
            <stop offset="45%" stopColor="#3a4a40" />
            <stop offset="100%" stopColor="#1a2820" />
          </linearGradient>
        </defs>
        <line
          x1="24"
          y1="148"
          x2="200"
          y2="148"
          stroke="color-mix(in srgb, var(--foreground) 22%, transparent)"
          strokeWidth="1.2"
        />
        <text x="150" y="144" fill="var(--muted)" fontSize="8">
          toward opponent →
        </text>
        {/* Vertical reference */}
        <line
          x1={cx}
          y1={18}
          x2={cx}
          y2={118}
          stroke="color-mix(in srgb, var(--foreground) 28%, transparent)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <text x={cx - 28} y={16} fill="var(--muted)" fontSize="8">
          vertical
        </text>
        <path
          d={`M ${cx} ${cy - 36} A 36 36 0 0 1 ${cx + Math.sin((closed * Math.PI) / 180) * 36} ${cy - Math.cos((closed * Math.PI) / 180) * 36}`}
          fill="none"
          stroke="var(--chart-spin)"
          strokeWidth="1.6"
        />
        <text x={cx + 10} y={cy - 42} fill="var(--chart-spin)" fontSize="9">
          {closed.toFixed(1)}° closed
        </text>

        {/* Macro edge-on racket */}
        <g transform={`rotate(${closed} ${cx} ${cy})`}>
          <ellipse
            cx={cx}
            cy={cy}
            rx="9"
            ry="28"
            fill="color-mix(in srgb, var(--bg-scene) 70%, #0a1410)"
            stroke={`url(#macroFrame-${uid})`}
            strokeWidth="4.5"
          />
          {[-18, -9, 0, 9, 18].map((dy) => (
            <line
              key={dy}
              x1={cx - 5}
              y1={cy + dy}
              x2={cx + 5}
              y2={cy + dy}
              stroke="color-mix(in srgb, var(--accent) 45%, transparent)"
              strokeWidth="0.55"
            />
          ))}
          <rect
            x={cx - 3.2}
            y={cy + 26}
            width="6.4"
            height="16"
            rx="1.2"
            fill={`url(#macroFrame-${uid})`}
          />
          <rect
            x={cx - 2.4}
            y={cy + 42}
            width="4.8"
            height="36"
            rx="1.4"
            fill="#2a1c14"
            stroke="color-mix(in srgb, var(--foreground) 25%, transparent)"
            strokeWidth="0.7"
          />
          <rect x={cx - 3} y={cy + 76} width="6" height="5" rx="1" fill="#1a120c" />
        </g>

        {/* Ball ahead of closed face */}
        <circle
          cx={cx + Math.sin((closed * Math.PI) / 180) * 42 + 8}
          cy={cy - Math.cos((closed * Math.PI) / 180) * 42}
          r="5"
          fill="var(--chart-power)"
          opacity="0.85"
        />
        <text x="24" y={compact ? 138 : 132} fill="var(--muted)" fontSize="7.5">
          Face closed past vertical — top of hoop tips toward the net
        </text>
      </svg>
      {!compact ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          {advice.face.label}: ~{closed.toFixed(1)}° closed. Prefer {advice.prefersHeight}-high contact.
        </p>
      ) : null}
    </div>
  );
}

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
      <p className="sf-kicker sf-kicker-sky mb-2">
        Contact geometry
      </p>
      <svg viewBox="0 0 220 130" className="h-auto w-full max-w-md" aria-hidden>
        <line
          x1="16"
          y1="118"
          x2="204"
          y2="118"
          stroke="color-mix(in srgb, var(--foreground) 28%, transparent)"
          strokeWidth="1.3"
        />
        {bands.map((b) => {
          const active = b.id === advice.prefersHeight;
          return (
            <g key={b.id}>
              <rect
                x="18"
                y={b.y}
                width="22"
                height={b.h}
                rx="2"
                fill={active ? "color-mix(in srgb, var(--accent) 22%, transparent)" : "transparent"}
                stroke={active ? "var(--chart-control)" : "color-mix(in srgb, var(--foreground) 12%, transparent)"}
              />
              <text
                x="46"
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
        <ContactStroke
          baseX={78}
          sy={(m) => 118 - m * 52}
          ground={118}
          contactX={hx}
          contactY={hy}
          closedDeg={closed}
        />
        <text x={hx} y={hy + 36} textAnchor="middle" fill="var(--muted)" fontSize="7.5">
          {closed.toFixed(1)}° closed past vertical
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
