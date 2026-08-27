/**
 * Spec-first playability
 * ----------------------
 * How a frame hits, and whether a bag is court-ready, from measurable
 * quantities: mass, swingweight, RA, balance, head size, pattern, string
 * material/shape, tension, gauge, grip stack, lead tape, and the player.
 *
 * Model names and marketing lines are not inputs. Physics follows the
 * coaching-grade maps used across Gear Lab (Brody; Cross & Lindsey /
 * Tennis Warehouse University): effective mass ~ SW at impact, RA ~ COR
 * and dwell, open beds ~ mains movement / launch, tip mass ~ m·r².
 */

import type { RacketProfile, StringProfile } from "@/types/equipment";
import type { ForehandGripKind } from "@/lib/equipment/forehandMold";
import type { FlightMetrics } from "@/lib/equipment/moldPhysics";

export type CourtReadyBand =
  | "court-ready"
  | "playable-with-cautions"
  | "needs-tuning"
  | "poor-match";

export type PlayabilitySeverity = "ok" | "caution" | "stop";

export interface PlayabilityFlag {
  id: string;
  severity: PlayabilitySeverity;
  title: string;
  why: string;
  physics: string;
}

export interface SetupFactor {
  id: "frame" | "string" | "tension" | "gauge" | "grip" | "tape" | "player";
  label: string;
  /** How this piece is pulling the bag — short physics note. */
  note: string;
  /** Signed pull on the court-ready score. */
  pull: number;
}

export interface PlayabilityPlayer {
  forehandGrip?: ForehandGripKind | null;
  armFriendly?: boolean;
  generatesOwnPower?: boolean;
  valuesDurability?: boolean;
}

export interface FrameSpecInput {
  weightG?: number | null;
  swingweight?: number | null;
  stiffnessRa?: number | null;
  balanceMm?: number | null;
  headSizeSqIn?: number | null;
  stringPattern?: string | null;
}

export interface FrameSpecPhysics {
  weightG: number;
  swingweight: number;
  ra: number;
  balanceMm: number;
  headSizeSqIn: number;
  mains: number;
  crosses: number;
  open: boolean;
  dense: boolean;
  balance: "HL" | "EVEN" | "HH";
  /** Pace off a typical intermediate swing (trampoline + RHS ease + some plow). */
  power: number;
  spin: number;
  control: number;
  comfort: number;
  plow: number;
  whip: number;
  forgiveness: number;
  armLoad: number;
  launchDeg: number;
  pathDeg: number;
  style: string;
  specLine: string;
  hitKicker: string;
  howItHits: string;
}

export interface SetupPlayability {
  band: CourtReadyBand;
  score: number;
  headline: string;
  howItHits: string;
  trajectory: string;
  specLine: string;
  flags: PlayabilityFlag[];
  factors: SetupFactor[];
  missing: string[];
}

function clamp(v: number, a = 5, b = 98): number {
  return Math.max(a, Math.min(b, Math.round(v)));
}

function clampFloat(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function parseStringPattern(pattern: string | null | undefined): {
  mains: number;
  crosses: number;
  open: boolean;
  dense: boolean;
} {
  let mains = 16;
  let crosses = 19;
  if (pattern) {
    const parts = pattern.toLowerCase().replace(/\s/g, "").replace("×", "x").split("x");
    mains = parseInt(parts[0], 10) || 16;
    crosses = parseInt(parts[1], 10) || 19;
  }
  const open = mains <= 16 && crosses <= 19;
  const dense = mains >= 18 || crosses >= 20;
  return { mains, crosses, open, dense };
}

/** HL < ~320 mm for midweight; HH is tip-heavy. */
export function balanceClassOf(bal: number | null | undefined, weightG: number): "HL" | "EVEN" | "HH" {
  const b = bal ?? 320;
  if (b < 318 || (weightG >= 310 && b < 322)) return "HL";
  if (b > 328) return "HH";
  return "EVEN";
}

export function parseExpertScores(summary: string | null | undefined): {
  power: number | null;
  spin: number | null;
  control: number | null;
} {
  const scores = { power: null as number | null, spin: null as number | null, control: null as number | null };
  if (!summary) return scores;
  const re = /(\d+)\/100 for (power|spin|control)/gi;
  for (const m of summary.matchAll(re)) {
    scores[m[2].toLowerCase() as "power" | "spin" | "control"] = parseInt(m[1], 10);
  }
  return scores;
}

function mix(physics: number, expert: number | null, expertWeight: number): number {
  if (expert == null || !Number.isFinite(expert)) return physics;
  return clamp(physics * (1 - expertWeight) + expert * expertWeight);
}

function styleFromScores(input: {
  power: number;
  spin: number;
  control: number;
  headSizeSqIn: number;
  open: boolean;
  dense: boolean;
}): string {
  const { power: p, spin: sp, control: c, headSizeSqIn: hs, open, dense } = input;
  if (hs >= 104 && p >= 70) return "Forgiving power frame";
  if (dense && c >= 72 && hs <= 98) return "Precision player's frame";
  if (sp >= 78 && open && p >= 65) return "Heavy-spin baseliner";
  if (sp >= 70 && open) return "Modern shape / RPMS";
  if (c >= 70 && p >= 55 && p <= 72 && hs <= 100) return "Controlled all-courter";
  if (p >= 74 && c <= 60) return "Easy depth & pace";
  if (Math.abs(p - c) <= 10 && sp >= 55 && sp <= 75) return "Balanced modern frame";
  return "Versatile modern frame";
}

/**
 * Catalog + teaching-window numbers from specs only.
 * Expert 0–100s may tint power/spin/control (≤20%) for unmeasured hoop
 * construction — they never replace launch, path, comfort, or style logic.
 */
export function computeFrameSpecPhysics(
  input: FrameSpecInput,
  expert?: { power: number | null; spin: number | null; control: number | null } | null,
): FrameSpecPhysics {
  const weightG = input.weightG ?? 300;
  const swingweight = input.swingweight ?? 315;
  const ra = input.stiffnessRa ?? 65;
  const balanceMm = input.balanceMm ?? 320;
  const headSizeSqIn = input.headSizeSqIn ?? 100;
  const { mains, crosses, open, dense } = parseStringPattern(input.stringPattern);
  const balance = balanceClassOf(balanceMm, weightG);

  const plow = clamp(
    40 +
      (swingweight - 305) * 0.9 +
      (weightG - 295) * 0.45 +
      (balance === "HH" ? 8 : balance === "HL" ? -6 : 0),
  );
  const whip = clamp(
    45 +
      (318 - balanceMm) * 1.1 +
      (305 - weightG) * 0.4 +
      (open ? 5 : 0) -
      Math.max(0, swingweight - 325) * 0.55,
  );
  const forgiveness = clamp(
    50 + (headSizeSqIn - 98) * 3.2 - (dense ? 10 : 0) - (ra - 64) * 0.8 + (open ? 3 : 0),
  );
  const armLoad = clamp(
    35 + (ra - 58) * 2.2 + Math.max(0, swingweight - 318) * 0.4 - (headSizeSqIn - 98) * 0.6,
  );

  // Pace: trampoline (RA, head) + easy RHS (light / HL) + some plow.
  const physPower = clamp(
    50 +
      (ra - 64) * 1.15 +
      (headSizeSqIn - 98) * 1.7 +
      (305 - weightG) * 0.22 +
      (swingweight - 312) * 0.18 +
      (balanceMm - 320) * 0.12 +
      (open ? 2 : dense ? -3 : 0),
  );
  // Spin: mains movement, head, dwell (lower RA), polar speed if they can still whip it.
  const physSpin = clamp(
    54 +
      (open ? 14 : dense ? -9 : 0) +
      (headSizeSqIn - 98) * 1.45 +
      (64 - ra) * 0.35 +
      Math.min(12, Math.max(-8, (swingweight - 308) * 0.12)) +
      (whip >= 68 ? 4 : whip <= 42 ? -4 : 0),
  );
  // Control: dense bed, smaller head, mass stability, less trampoline.
  const physControl = clamp(
    52 +
      (dense ? 13 : open ? -4 : 0) +
      (weightG - 295) * 0.35 +
      (98 - headSizeSqIn) * 1.7 +
      (66 - ra) * 0.55 +
      (320 - balanceMm) * 0.12 +
      Math.min(8, Math.max(0, swingweight - 318) * 0.15),
  );
  const comfort = clamp(
    100 - (ra - 50) * 1.7 - Math.max(0, swingweight - 320) * 0.35 + (headSizeSqIn - 98) * 0.8,
  );

  const power = mix(physPower, expert?.power ?? null, 0.2);
  const spin = mix(physSpin, expert?.spin ?? null, 0.2);
  const control = mix(physControl, expert?.control ?? null, 0.2);

  const launchDeg = round1(
    clampFloat(
      4.6 +
        (headSizeSqIn - 95) * 0.28 +
        (open ? 0.45 : 0) -
        (dense ? 0.4 : 0) +
        (64 - ra) * 0.035 +
        (balanceMm - 320) * 0.006,
      2.5,
      12,
    ),
  );
  const pathDeg = round1(
    clampFloat(
      16 +
        (open ? 5 : 0) -
        (dense ? 3.2 : 0) +
        (headSizeSqIn - 98) * 0.35 +
        (64 - ra) * 0.1 +
        (318 - balanceMm) * 0.04 +
        (spin - 55) * 0.08,
      8,
      38,
    ),
  );

  const style = styleFromScores({ power, spin, control, headSizeSqIn, open, dense });
  const specLine = [
    `${Math.round(weightG)}g`,
    `SW ${Math.round(swingweight)}`,
    `RA ${Math.round(ra)}`,
    `${Math.round(balanceMm)}mm ${balance}`,
    `${headSizeSqIn} sq in`,
    `${mains}×${crosses}`,
  ].join(" · ");

  const hitBits: string[] = [];
  if (plow >= 70) hitBits.push("plow-first");
  else if (whip >= 70) hitBits.push("whip-first");
  else hitBits.push("mid-inertia");
  if (ra >= 68) hitBits.push(`RA ${Math.round(ra)} connected`);
  else if (ra <= 60) hitBits.push(`RA ${Math.round(ra)} pocketed`);
  hitBits.push(`${mains}×${crosses}`);
  if (open) hitBits.push("spin window");
  if (dense) hitBits.push("directional");
  const hitKicker = hitBits.join(" · ");

  const howItHits = describeHowFrameHits({
    weightG,
    swingweight,
    ra,
    headSizeSqIn,
    mains,
    crosses,
    open,
    dense,
    balance,
    plow,
    whip,
    armLoad,
    launchDeg,
    pathDeg,
  });

  return {
    weightG,
    swingweight,
    ra,
    balanceMm,
    headSizeSqIn,
    mains,
    crosses,
    open,
    dense,
    balance,
    power,
    spin,
    control,
    comfort,
    plow,
    whip,
    forgiveness,
    armLoad,
    launchDeg,
    pathDeg,
    style,
    specLine,
    hitKicker,
    howItHits,
  };
}

function describeHowFrameHits(p: {
  weightG: number;
  swingweight: number;
  ra: number;
  headSizeSqIn: number;
  mains: number;
  crosses: number;
  open: boolean;
  dense: boolean;
  balance: "HL" | "EVEN" | "HH";
  plow: number;
  whip: number;
  armLoad: number;
  launchDeg: number;
  pathDeg: number;
}): string {
  const sentences: string[] = [];
  if (p.plow >= 72) {
    sentences.push(
      `At ${Math.round(p.weightG)}g and SW ${Math.round(p.swingweight)}, the hoop plows through contact — depth comes from mass and inertia, not just swing speed.`,
    );
  } else if (p.whip >= 70) {
    sentences.push(
      `At ${Math.round(p.weightG)}g and SW ${Math.round(p.swingweight)}, this is a whippy hoop: easier racquet-head speed, less free plow on a heavy incoming ball.`,
    );
  } else {
    sentences.push(
      `At ${Math.round(p.weightG)}g and SW ${Math.round(p.swingweight)}, inertia sits in a modern mid band — you supply most of the pace; the frame neither cannonballs nor disappears.`,
    );
  }

  if (p.ra >= 68) {
    sentences.push(
      `RA ${Math.round(p.ra)} returns energy quickly (connected, less dwell) and raises arm load on mishits (arm load ${p.armLoad}/100).`,
    );
  } else if (p.ra <= 60) {
    sentences.push(
      `RA ${Math.round(p.ra)} flexes and pockets the ball — more dwell, and a higher leave if you open the face.`,
    );
  } else {
    sentences.push(
      `RA ${Math.round(p.ra)} is mid stiffness — neither trampoline-stiff nor a soft pocket.`,
    );
  }

  if (p.open) {
    sentences.push(
      `The ${p.mains}×${p.crosses} ${p.headSizeSqIn} sq in bed lets mains move: more spin window and a typical leave near ${p.launchDeg.toFixed(1)}° on a ~${p.pathDeg.toFixed(0)}° path.`,
    );
  } else if (p.dense) {
    sentences.push(
      `The ${p.mains}×${p.crosses} ${p.headSizeSqIn} sq in bed is directional: less free RPM, more honesty on aim, leave nearer ${p.launchDeg.toFixed(1)}°.`,
    );
  } else {
    sentences.push(
      `${p.mains}×${p.crosses} in a ${p.headSizeSqIn} sq in head is a middle bed (~${p.launchDeg.toFixed(1)}° leave).`,
    );
  }

  if (p.balance === "HL") {
    sentences.push("Head-light balance recovers faster on the take-back and at net.");
  } else if (p.balance === "HH") {
    sentences.push("Mass out front stabilizes contact and adds plow — late prep gets punished.");
  }

  return sentences.join(" ");
}

/** Overlay spec physics onto a catalog row (live or snapshot). */
export function applySpecPhysics(r: RacketProfile): RacketProfile {
  const physics = computeFrameSpecPhysics(r, parseExpertScores(r.summary));
  return {
    ...r,
    power: physics.power,
    spin: physics.spin,
    control: physics.control,
    comfort: physics.comfort,
    idealLaunchAngleDeg: physics.launchDeg,
    idealSwingPathDeg: physics.pathDeg,
    style: physics.style,
  };
}

export function emptyPlayability(missing: string[] = ["frame", "string"]): SetupPlayability {
  return {
    band: "needs-tuning",
    score: 28,
    headline: "Nothing to calculate yet",
    howItHits:
      "Add a frame (mass, SW, RA, pattern) and a bed (string, tension, gauge). Then we can tell you whether the combination is court-ready — from physics, not the model name.",
    trajectory: "No launch or path until a frame is in the bag.",
    specLine: "",
    flags: [],
    factors: [],
    missing,
  };
}

const BAND_HEADLINE: Record<CourtReadyBand, string> = {
  "court-ready": "Court-ready — this bag plays as a tennis setup",
  "playable-with-cautions": "Playable, with physics caveats",
  "needs-tuning": "Not court-ready yet — the combination still fights itself",
  "poor-match": "Poor match — this setup is a hard way to play tennis",
};

export function evaluateSetupPlayability(input: {
  racket?: RacketProfile | null;
  string?: StringProfile | null;
  tensionLbs?: number | null;
  gaugeMm?: number | null;
  hasGrip?: boolean;
  grip?: {
    thicknessMm: number;
    effectiveSizeIndex: number;
    overgripCount: number;
    buildNote: string;
  } | null;
  tape?: {
    totalG: number;
    tipG: number;
    handleG: number;
    deltaSw: number;
    effectiveSw: number | null;
  } | null;
  scores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
  };
  launchAngleDeg?: number | null;
  swingPathDeg?: number | null;
  flight?: FlightMetrics | null;
  completeness: number;
  player?: PlayabilityPlayer | null;
}): SetupPlayability {
  const racket = input.racket ?? null;
  const string = input.string ?? null;
  const tension = input.tensionLbs ?? null;
  const gauge = input.gaugeMm ?? null;
  const player = input.player ?? null;
  const flags: PlayabilityFlag[] = [];
  const factors: SetupFactor[] = [];
  const missing: string[] = [];

  if (!racket) missing.push("frame");
  if (!string) missing.push("string");
  if (string && tension == null) missing.push("tension");
  if (!input.hasGrip) missing.push("grip");

  const physics = racket ? computeFrameSpecPhysics(racket, parseExpertScores(racket.summary)) : null;

  let score = 48;
  if (racket) score += 14;
  if (string) score += 8;
  if (string && tension != null) score += 6;
  if (input.hasGrip) score += 4;
  if (input.completeness >= 80) score += 4;

  if (physics) {
    factors.push({
      id: "frame",
      label: "Frame specs",
      note: physics.hitKicker,
      pull: 0,
    });
  }

  if (string) {
    const isPoly = string.material === "polyester" || string.material === "co-poly";
    const shaped = string.shape !== "round";
    const mid = string.recommendedTensionLbs;
    const [lo, hi] = string.tensionRangeLbs;
    const t = tension ?? mid;
    const g = gauge ?? string.gaugesMm[Math.floor((string.gaugesMm.length - 1) / 2)] ?? 1.25;
    const thin = g <= 1.22;
    factors.push({
      id: "string",
      label: "String bed",
      note: `${string.material}${shaped ? ` · ${string.shape}` : " · round"} · ${isPoly ? "connected bite" : "softer pocket"}`,
      pull: 0,
    });
    if (tension != null) {
      factors.push({
        id: "tension",
        label: "Tension",
        note: `${t} lbs (band ${lo}–${hi}, rec ${mid})`,
        pull: 0,
      });
    }
    if (gauge != null) {
      factors.push({
        id: "gauge",
        label: "Gauge",
        note: `${g.toFixed(2)} mm${thin ? " — thinner bite, less durability" : ""}`,
        pull: 0,
      });
    }

    if (tension != null && (tension < lo - 1.5 || tension > hi + 1.5)) {
      flags.push({
        id: "tension-out-of-band",
        severity: "stop",
        title: "Tension outside this string’s playable band",
        why: `${tension} lbs vs recommended ${lo}–${hi} lbs.`,
        physics:
          "Far below band: trampoline launch and tension loss. Far above: boardy COR, less pocket, higher arm load.",
      });
      score -= 16;
    } else if (tension != null && (tension < lo || tension > hi)) {
      flags.push({
        id: "tension-edge",
        severity: "caution",
        title: "Tension on the edge of the string’s band",
        why: `${tension} lbs sits at the edge of ${lo}–${hi} lbs.`,
        physics: "Expect a livelier or boardier bed than the catalog scores assume.",
      });
      score -= 6;
    } else if (tension != null) {
      score += 4;
    }

    if (physics && physics.ra >= 67 && isPoly && t >= 54) {
      const arm = Boolean(player?.armFriendly);
      flags.push({
        id: "stiffness-stack",
        severity: arm ? "stop" : "caution",
        title: arm ? "Stiff frame + tight poly vs your arm" : "Stiffness stacked: frame + poly + tension",
        why: `RA ${Math.round(physics.ra)} with ${string.material} at ${t} lbs.`,
        physics:
          "Frame COR is already high; a stiff bed at high tension shortens dwell further and spikes shock on mishits.",
      });
      score -= arm ? 18 : 9;
    }

    if (physics?.open && isPoly && shaped && t <= mid - 3) {
      flags.push({
        id: "launchy-shaped-poly",
        severity: "caution",
        title: "Open bed + shaped poly + soft tension",
        why: "Mains already move; shaped edges and low tension add launch.",
        physics: "Expect a higher leave and more sail on clean flat hits unless the face stays closed.",
      });
      score -= 6;
    }

    if (physics?.dense && (string.material === "natural-gut" || string.material === "multifilament") && t <= mid) {
      flags.push({
        id: "soft-on-dense",
        severity: "ok",
        title: "Soft bed restoring pocket on a dense pattern",
        why: "Gut/multi on 18×20-class beds put dwell back that the pattern takes away.",
        physics: "Good pairing: directional hoop, elastic bed. Watch durability if you break often.",
      });
      score += 4;
    }

    if (player?.valuesDurability && thin && (string.material === "multifilament" || string.material === "natural-gut")) {
      flags.push({
        id: "durability-mismatch",
        severity: "caution",
        title: "Thin soft bed vs durability preference",
        why: `${g.toFixed(2)} mm ${string.material} will not last if you notch or snap strings.`,
        physics: "Thinner gauges raise spin/power and cut durability sharply.",
      });
      score -= 5;
    }
  }

  const grip = input.grip;
  if (grip && input.hasGrip) {
    factors.push({
      id: "grip",
      label: "Handle",
      note: grip.buildNote,
      pull: 0,
    });
    if (grip.effectiveSizeIndex >= 5.2 || grip.overgripCount >= 3) {
      flags.push({
        id: "grip-overbuild",
        severity: "caution",
        title: "Handle build is muting leverage",
        why: grip.buildNote,
        physics: "Oversized stacks round the bevels and slow wrist snap — spin and serve snap drop.",
      });
      score -= 7;
    }
  }

  const tape = input.tape;
  const effectiveSw = tape?.effectiveSw ?? physics?.swingweight ?? racket?.swingweight ?? null;
  if (tape && tape.totalG > 0) {
    factors.push({
      id: "tape",
      label: "Lead tape",
      note: `+${round1(tape.totalG)}g · SW ${tape.deltaSw >= 0 ? "+" : ""}${round1(tape.deltaSw)} (now ${effectiveSw ?? "—"})`,
      pull: 0,
    });
    if (tape.totalG >= 12) {
      flags.push({
        id: "tape-heavy",
        severity: "caution",
        title: "A lot of tape for one hoop",
        why: `+${round1(tape.totalG)}g custom mass.`,
        physics: "SW scales with m·r². Big tip loads plow hard and make late prep expensive.",
      });
      score -= 6;
    }
  }

  if (effectiveSw != null) {
    const ownPower = Boolean(player?.generatesOwnPower);
    if (effectiveSw >= 345) {
      flags.push({
        id: "sw-extreme",
        severity: "stop",
        title: "Swingweight is past a playable tennis setup",
        why: `Effective SW ${Math.round(effectiveSw)}.`,
        physics: "Most players cannot produce enough RHS; late balls sit, volleys die, arm load climbs.",
      });
      score -= 16;
    } else if (effectiveSw >= 334 && !ownPower) {
      flags.push({
        id: "sw-high",
        severity: "caution",
        title: "Heavy swingweight for a player who doesn’t supply their own power",
        why: `Effective SW ${Math.round(effectiveSw)}.`,
        physics: "Plow is real, but you have to get the hoop there. If preparation is late, this plays like a club.",
      });
      score -= 8;
    } else if (effectiveSw <= 288 && ownPower) {
      flags.push({
        id: "sw-light",
        severity: "caution",
        title: "Too little inertia for a power player",
        why: `Effective SW ${Math.round(effectiveSw)}.`,
        physics: "The hoop gets pushed around on heavy incoming balls; expect instability unless you add tip/3–9 mass.",
      });
      score -= 6;
    }
  }

  const launch = input.launchAngleDeg ?? physics?.launchDeg ?? null;
  const path = input.swingPathDeg ?? physics?.pathDeg ?? null;
  const flight = input.flight ?? null;
  const gripKind = player?.forehandGrip ?? null;
  const western = gripKind === "western" || gripKind === "extreme-western";
  const eastern = gripKind === "eastern";

  if (launch != null && physics) {
    if (launch >= 10 && western && physics.open && (tension == null || (string && tension <= string.recommendedTensionLbs))) {
      flags.push({
        id: "balloon-combo",
        severity: "caution",
        title: "Western grip + high-launch open bed",
        why: `Leave ~${launch.toFixed(1)}° with a windshield-wiper grip on an open pattern.`,
        physics: "Western already adds vertical leave. Open mains and a live bed stack launch — clean hits sail unless the face stays closed.",
      });
      score -= 8;
    }
    if (launch <= 5.4 && physics.dense && !player?.generatesOwnPower) {
      flags.push({
        id: "net-combo",
        severity: "caution",
        title: "Low-launch dense bed without free power",
        why: `Leave ~${launch.toFixed(1)}° on a dense pattern.`,
        physics: "You have to create depth with RHS and height. Late or low contact dies in the net.",
      });
      score -= 7;
    }
    if (eastern && launch >= 9.2 && (input.scores.power ?? 0) >= 70) {
      flags.push({
        id: "eastern-spray",
        severity: "caution",
        title: "Eastern grip on a launchy power hoop",
        why: "A flatter grip on a high-leave frame sprays unless you close the face.",
        physics: "Eastern wants a more vertical face. Trampoline + open face = long balls.",
      });
      score -= 5;
    }
    if (western && physics.dense && physics.spin < 68) {
      flags.push({
        id: "spin-starved",
        severity: "caution",
        title: "Western spin game on a dense, low-spin hoop",
        why: "The grip wants RPM the bed will not give for free.",
        physics: "18×20-class patterns bite less. You must own the low-to-high path or switch to a more open bed.",
      });
      score -= 6;
    }
  }

  if (flight) {
    if (flight.flyRisk >= 80) {
      flags.push({
        id: "fly-risk-high",
        severity: "stop",
        title: "Clean hits are modeled as sailing long",
        why: `Fly risk ${flight.flyRisk}/100 · net clear +${flight.netClearIn.toFixed(1)}″.`,
        physics: "Leave, plow, and low path-to-spin are stacking. Raise tension, close the face, or drop tip mass.",
      });
      score -= 14;
    } else if (flight.flyRisk >= 70) {
      flags.push({
        id: "fly-risk",
        severity: "caution",
        title: "Sail risk on clean center hits",
        why: `Fly risk ${flight.flyRisk}/100.`,
        physics: "The molded leave is high relative to spin drop. Tune one lever: +1–2 lbs or less tip tape.",
      });
      score -= 7;
    }
    if (flight.netClearIn <= 3.6) {
      flags.push({
        id: "net-skim",
        severity: "caution",
        title: "Net clearance is thin",
        why: `~+${flight.netClearIn.toFixed(1)}″ over the tape on a clean hit.`,
        physics: "Low leave / flat path. Soften tension a pound or add a little tip mass if balls die in the net.",
      });
      score -= 7;
    }
    if (flight.flyRisk >= 28 && flight.flyRisk <= 62 && flight.netClearIn >= 5 && flight.netClearIn <= 14) {
      score += 6;
      flags.push({
        id: "flight-window",
        severity: "ok",
        title: "Flight sits in a playable tennis window",
        why: `+${flight.netClearIn.toFixed(1)}″ clear · depth ${flight.depth} · fly risk ${flight.flyRisk}.`,
        physics: "Leave, spin drop, and plow are not fighting each other on a center hit.",
      });
    }
  }

  if (physics && player?.armFriendly && physics.armLoad >= 72 && physics.ra >= 68) {
    if (!flags.some((f) => f.id === "stiffness-stack")) {
      flags.push({
        id: "arm-frame",
        severity: "caution",
        title: "Connected / stiff hoop vs arm-friendly preference",
        why: `RA ${Math.round(physics.ra)} · arm load ${physics.armLoad}/100.`,
        physics: "Soften the bed (gauge, multi/hybrid, lower tension) before chasing more plow.",
      });
      score -= 8;
    }
  }

  if (physics && !player?.generatesOwnPower && physics.dense && physics.weightG >= 315 && physics.headSizeSqIn <= 98) {
    flags.push({
      id: "demand-stack",
      severity: "caution",
      title: "Tour-demand specs without a power-generating player",
      why: `${Math.round(physics.weightG)}g · ${physics.headSizeSqIn}" · ${physics.mains}×${physics.crosses}.`,
      physics: "Heavy + small + dense is a precision tool. Recreational RHS will leave balls short.",
      });
    score -= 8;
  }

  if (player) {
    factors.push({
      id: "player",
      label: "You",
      note: [
        player.forehandGrip ? `${player.forehandGrip.replace("-", " ")} FH` : null,
        player.generatesOwnPower ? "supplies own pace" : "needs some free depth",
        player.armFriendly ? "arm-friendly" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No grip/arm notes yet — verdict is generic.",
      pull: 0,
    });
  }

  score = clamp(score, 8, 96);

  const stopCount = flags.filter((f) => f.severity === "stop").length;
  const cautionCount = flags.filter((f) => f.severity === "caution").length;
  let band: CourtReadyBand;
  if (!racket) {
    band = "needs-tuning";
  } else if (stopCount > 0 || score < 42) {
    band = "poor-match";
  } else if (score >= 78 && stopCount === 0 && cautionCount <= 1) {
    band = "court-ready";
  } else if (score >= 60 && stopCount === 0) {
    band = "playable-with-cautions";
  } else {
    band = "needs-tuning";
  }

  const howItHits = buildCombinedHowItHits({
    physics,
    string,
    tension,
    gauge,
    tape,
    player,
    scores: input.scores,
  });

  const trajectory =
    launch != null && path != null
      ? [
          `Leave ~${launch.toFixed(1)}° · path ~${path.toFixed(0)}°.`,
          flight
            ? `Net +${flight.netClearIn.toFixed(1)}″ · plow ${flight.plow} · topspin ${flight.topspin} · depth ${flight.depth} · fly risk ${flight.flyRisk}.`
            : null,
        ]
          .filter(Boolean)
          .join(" ")
      : "Add a frame to lock a leave angle and swing path.";

  return {
    band,
    score,
    headline: BAND_HEADLINE[band],
    howItHits,
    trajectory,
    specLine: physics?.specLine ?? "",
    flags,
    factors,
    missing,
  };
}

function buildCombinedHowItHits(input: {
  physics: FrameSpecPhysics | null;
  string: StringProfile | null;
  tension: number | null;
  gauge: number | null;
  tape: { totalG: number; tipG: number; deltaSw: number } | null | undefined;
  player: PlayabilityPlayer | null;
  scores: {
    power: number | null;
    spin: number | null;
    control: number | null;
    comfort: number | null;
  };
}): string {
  const parts: string[] = [];
  if (input.physics) {
    parts.push(input.physics.howItHits);
  } else {
    parts.push("No frame specs yet — we cannot compute plow, dwell, or leave.");
  }

  if (input.string) {
    const t = input.tension ?? input.string.recommendedTensionLbs;
    const isPoly = input.string.material === "polyester" || input.string.material === "co-poly";
    const g = input.gauge;
    const gaugeBit = g != null ? ` at ${g.toFixed(2)} mm` : "";
    if (isPoly) {
      parts.push(
        `${input.string.material} at ${t} lbs${gaugeBit} adds bite and a firmer pocket; it will drop launch versus a multi and raise connected feel.`,
      );
    } else {
      parts.push(
        `${input.string.material} at ${t} lbs${gaugeBit} lengthens dwell and comfort; spin must come more from path than from the bed.`,
      );
    }
  }

  if (input.tape && input.tape.totalG > 0) {
    parts.push(
      `Tape +${round1(input.tape.totalG)}g (${input.tape.tipG > 0 ? "including tip mass" : "mostly handle/throat"}) shifts SW ${input.tape.deltaSw >= 0 ? "+" : ""}${round1(input.tape.deltaSw)} — plow vs whip, not a new racket.`,
    );
  }

  if (input.player?.forehandGrip) {
    const g = input.player.forehandGrip.replace("-", " ");
    parts.push(`Your ${g} forehand is part of the leave math — grip + bed + face have to agree.`);
  }

  const { power: p, spin: s, control: c } = input.scores;
  if (p != null && s != null && c != null) {
    parts.push(`Molded scores sit around power ${p} / spin ${s} / control ${c} after string, grip, and tape.`);
  }

  return parts.join(" ");
}

export function courtReadyLabel(band: CourtReadyBand): string {
  switch (band) {
    case "court-ready":
      return "Court-ready";
    case "playable-with-cautions":
      return "Playable";
    case "needs-tuning":
      return "Needs tuning";
    case "poor-match":
      return "Poor match";
  }
}

export function courtReadyTone(band: CourtReadyBand): string {
  switch (band) {
    case "court-ready":
      return "var(--accent)";
    case "playable-with-cautions":
      return "var(--chart-control)";
    case "needs-tuning":
      return "var(--amber)";
    case "poor-match":
      return "var(--danger)";
  }
}
