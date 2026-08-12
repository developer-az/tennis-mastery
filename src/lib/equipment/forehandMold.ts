/**
 * Optimal forehand grip + racket-face angle for a molded setup.
 * Driven by swing path, launch, and spin/control personality — not product marketing.
 */

import type { RacketProfile } from "@/types/equipment";

export type StrikeHeightBand = "neck" | "chest" | "waist";

export type ForehandGripKind =
  | "eastern"
  | "semi-western"
  | "western"
  | "extreme-western";

/** Degrees the stringbed is closed past vertical at contact (0 = vertical face). */
export type FaceClosureBand =
  | "near-vertical"
  | "mildly-closed"
  | "closed"
  | "strongly-closed";

export interface FaceAngleAdvice {
  /** Closed past vertical — positive = closed (top of hoop leans toward opponent’s court). */
  closedDeg: number;
  band: FaceClosureBand;
  label: string;
  detail: string;
}

export interface ForehandMoldAdvice {
  grip: ForehandGripKind;
  gripLabel: string;
  /** Index-knuckle bevel (1 = continental … 5 = extreme western). */
  bevel: number;
  bevelHint: string;
  why: string;
  face: FaceAngleAdvice;
  /** Height band this grip + face pair wants most. */
  prefersHeight: StrikeHeightBand;
  practice: string[];
  avoid: string;
  /** Short line for chips / headers */
  summary: string;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function gripFromPath(path: number, spin: number): ForehandGripKind {
  // Path steepness is the primary driver; spin score nudges extremes.
  if (path >= 32 || (path >= 28 && spin >= 80)) return "extreme-western";
  if (path >= 26 || (path >= 22 && spin >= 74)) return "western";
  if (path >= 16 || spin >= 62) return "semi-western";
  return "eastern";
}

function bevelFor(grip: ForehandGripKind): number {
  switch (grip) {
    case "eastern":
      return 2;
    case "semi-western":
      return 3;
    case "western":
      return 4;
    case "extreme-western":
      return 5;
  }
}

function gripLabel(grip: ForehandGripKind): string {
  switch (grip) {
    case "eastern":
      return "Eastern forehand";
    case "semi-western":
      return "Semi-western forehand";
    case "western":
      return "Western forehand";
    case "extreme-western":
      return "Extreme western forehand";
  }
}

function prefersHeightFor(grip: ForehandGripKind): StrikeHeightBand {
  switch (grip) {
    case "eastern":
      return "waist";
    case "semi-western":
      return "chest";
    case "western":
    case "extreme-western":
      return "chest";
  }
}

/**
 * Face closure at contact for a clean center hit.
 * Steeper grips naturally present a more closed face; power-biased molds
 * need a touch more close to keep depth; flat/control molds stay nearer vertical.
 */
function faceForMold(input: {
  grip: ForehandGripKind;
  launch: number;
  path: number;
  power: number;
  control: number;
  spin: number;
}): FaceAngleAdvice {
  const baseByGrip: Record<ForehandGripKind, number> = {
    eastern: 2.5,
    "semi-western": 6,
    western: 10,
    "extreme-western": 14,
  };
  let closed = baseByGrip[input.grip];
  // Lofty leave → close a bit more so the ball doesn’t sail
  closed += clamp((input.launch - 8) * 0.55, -1.5, 2.5);
  // Path already accounted in grip; small extra from very steep path
  closed += clamp((input.path - 22) * 0.12, -1, 1.5);
  // Power-biased frames spray if face stays open
  if (input.power - input.control >= 10) closed += 1.2;
  if (input.control - input.power >= 12) closed -= 0.8;
  // Spin molds reward brushing with a stably closed face
  if (input.spin >= 74) closed += 0.6;

  closed = round1(clamp(closed, 0.5, 18));

  let band: FaceClosureBand;
  let label: string;
  if (closed < 4) {
    band = "near-vertical";
    label = "Nearly vertical face";
  } else if (closed < 8) {
    band = "mildly-closed";
    label = "Mildly closed face";
  } else if (closed < 12) {
    band = "closed";
    label = "Closed face";
  } else {
    band = "strongly-closed";
    label = "Strongly closed face";
  }

  const detail =
    band === "near-vertical"
      ? `~${closed}° closed past vertical — keep the face honest through contact; opening it dumps launch into the tape on flat paths.`
      : band === "mildly-closed"
        ? `~${closed}° closed — enough lean to load spin without burying the ball; don’t slap with an open face on this mold.`
        : band === "closed"
          ? `~${closed}° closed — top of the hoop leans toward the opponent. Match the brush; an open face here sails long.`
          : `~${closed}° closed — extreme lean for high RPMs. Mistiming open will rocket long; mistiming too closed dumps short.`;

  return { closedDeg: closed, band, label, detail };
}

export function deriveForehandMold(input: {
  racket?: RacketProfile | null;
  launchAngleDeg?: number | null;
  swingPathDeg?: number | null;
  power?: number | null;
  spin?: number | null;
  control?: number | null;
}): ForehandMoldAdvice | null {
  const racket = input.racket;
  const launch =
    input.launchAngleDeg ?? racket?.idealLaunchAngleDeg ?? null;
  const path = input.swingPathDeg ?? racket?.idealSwingPathDeg ?? null;
  if (launch == null && path == null && !racket) return null;

  const L = launch ?? 8;
  const P = path ?? 22;
  const spin = input.spin ?? racket?.spin ?? 55;
  const power = input.power ?? racket?.power ?? 55;
  const control = input.control ?? racket?.control ?? 55;

  const grip = gripFromPath(P, spin);
  const bevel = bevelFor(grip);
  const face = faceForMold({ grip, launch: L, path: P, power, control, spin });
  const prefersHeight = prefersHeightFor(grip);

  const whyBits: string[] = [];
  whyBits.push(
    `Path ~${P.toFixed(0)}° and spin ${spin} push the index knuckle toward bevel ${bevel} (${gripLabel(grip).toLowerCase()}).`,
  );
  if (power - control >= 10) {
    whyBits.push(
      "Power-biased mold needs that closed face so free depth doesn’t sail — don’t open up to “help” the ball over.",
    );
  } else if (control - power >= 10) {
    whyBits.push(
      "Control mold already flattens launch — stay nearer the recommended face; over-closing kills depth.",
    );
  }
  if (L >= 10) {
    whyBits.push(
      `Leave ~${L.toFixed(1)}° is lofty — the closed face is what keeps shape from floating long.`,
    );
  } else if (L <= 6) {
    whyBits.push(
      `Leave ~${L.toFixed(1)}° is flat — don’t over-close; catch the ball early in the ${prefersHeight} window.`,
    );
  }

  const practice: string[] = [
    `Find bevel ${bevel}: base knuckle of the index finger on that face of the handle — check it before every basket.`,
    `Shadow 10 swings to ${prefersHeight}-high contact with the face held ~${face.closedDeg}° closed; freeze at contact and look at the strings.`,
    face.band === "near-vertical" || face.band === "mildly-closed"
      ? "Feed drills: if balls dump, open 1–2° or take earlier — don’t jump to a more western grip first."
      : "Feed drills: if balls sail, close 1–2° more or brush steeper — don’t flatten the path to “control” it.",
  ];

  const avoid =
    grip === "eastern"
      ? "Avoid sliding toward western on this mold — you’ll invent steep path the frame doesn’t reward and spray high balls."
      : grip === "extreme-western"
        ? "Avoid continental/eastern on sitting chest balls — you’ll block with an open face and sail or dump."
        : "Avoid checking up with an open face at contact — this mold’s spin window assumes the lean stays through the hit.";

  return {
    grip,
    gripLabel: gripLabel(grip),
    bevel,
    bevelHint: `Index knuckle on bevel ${bevel} (1 = continental … 5 = extreme western)`,
    why: whyBits.join(" "),
    face,
    prefersHeight,
    practice,
    avoid,
    summary: `${gripLabel(grip)} · bevel ${bevel} · face ${face.closedDeg}° closed`,
  };
}
