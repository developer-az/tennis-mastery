import type { StringProfile, TensionOutcome } from "@/types/equipment";

function clamp(v: number, a = 5, b = 98): number {
  return Math.max(a, Math.min(b, Math.round(v)));
}

/** Reference gauge for catalog baseline scores (typical 16g / ~1.30 mm mid). */
export function referenceGaugeMm(string: StringProfile): number {
  const gauges = string.gaugesMm;
  if (gauges.length === 0) return 1.25;
  const mid = gauges[Math.floor((gauges.length - 1) / 2)];
  return mid;
}

/**
 * Material-informed stiffness when not authored on the profile.
 * Polys feel boardier; gut/multi feel softer at the same RA-like score.
 */
export function stringStiffness(string: StringProfile): number {
  if (string.stiffness != null) return string.stiffness;
  const materialBias: Record<StringProfile["material"], number> = {
    polyester: 18,
    "co-poly": 12,
    hybrid: 4,
    multifilament: -10,
    "synthetic-gut": -6,
    "natural-gut": -16,
  };
  return clamp(58 + materialBias[string.material] - (string.comfort - 50) * 0.55);
}

/**
 * Gauge is a real playability lever (industry + lab consensus):
 * - Thinner (higher US gauge # / smaller mm): more spin bite & trampoline power,
 *   slightly more comfort, markedly less durability.
 * - Thicker: more durability & control/stability, less snap-back spin window.
 *
 * Magnitudes are coaching-grade deltas (~±6–12 pts across common 1.20–1.35 mm),
 * not a claim of single-session lab ownership. Spin still depends heavily on
 * string movement/snap-back (shape + friction), so gauge is secondary to shape
 * but still material for differentiation.
 */
export function gaugeDeltas(string: StringProfile, gaugeMm: number) {
  const ref = referenceGaugeMm(string);
  // Positive thinness: thinner than reference → positive
  const thin = (ref - gaugeMm) / 0.05; // per 0.05 mm step

  return {
    power: thin * 3.5,
    control: -thin * 2.5,
    spin: thin * 4.5 + (string.shape !== "round" ? thin * 1.2 : 0),
    comfort: thin * 3,
    durability: -thin * 7,
    stiffness: -thin * 2.5,
  };
}

/**
 * Model how a string bed changes when tension and gauge move away from the
 * catalog baseline (mid recommended tension + reference gauge).
 */
export function tensionOutcome(
  string: StringProfile,
  tensionLbs: number,
  gaugeMm?: number,
): TensionOutcome {
  const [lo, hi] = string.tensionRangeLbs;
  const mid = string.recommendedTensionLbs;
  const span = Math.max(4, (hi - lo) / 2);
  const delta = (tensionLbs - mid) / span; // -1 soft … +1 tight
  const gauge = gaugeMm ?? referenceGaugeMm(string);
  const g = gaugeDeltas(string, gauge);
  const baseStiff = stringStiffness(string);

  const power = clamp(string.power - delta * 14 + g.power);
  const control = clamp(string.control + delta * 16 + g.control);
  const spin = clamp(
    string.spin - delta * 6 + (string.shape !== "round" ? -delta * 2 : 0) + g.spin,
  );
  const comfort = clamp(string.comfort - delta * 18 + g.comfort);
  const durability = clamp(string.durability + g.durability);
  const stiffness = clamp(baseStiff + delta * 10 + g.stiffness);

  let dwellHint: string;
  let launchHint: string;
  if (delta <= -0.55) {
    dwellHint = "Long dwell — trampoline pocket, ball sits on the bed.";
    launchHint = "Higher launch angle; aim lower on the net / add spin shape.";
  } else if (delta <= -0.15) {
    dwellHint = "Generous pocket — easy depth with a soft response.";
    launchHint = "Slightly elevated launch; great for heavy topspin paths.";
  } else if (delta < 0.15) {
    dwellHint = "Balanced pocket — the string's intended personality.";
    launchHint = "Neutral launch for this string's construction.";
  } else if (delta < 0.55) {
    dwellHint = "Shorter dwell — crisper take-off and earlier feedback.";
    launchHint = "Flatter launch window; reward clean, penetrating contact.";
  } else {
    dwellHint = "Boardy / connected — minimal trampoline, max feedback.";
    launchHint = "Lowest launch for this bed; watch for long balls if late.";
  }

  const thinVsRef = referenceGaugeMm(string) - gauge;
  let gaugeHint: string;
  if (Math.abs(thinVsRef) < 0.02) {
    gaugeHint = `${gauge.toFixed(2)} mm is this string's reference gauge — catalog scores assume this thickness.`;
  } else if (thinVsRef > 0) {
    gaugeHint = `Thinner ${gauge.toFixed(2)} mm: more spin bite and pocket power, less durability than thicker options.`;
  } else {
    gaugeHint = `Thicker ${gauge.toFixed(2)} mm: longer life and a firmer, more controlled response; slightly less snap-back spin.`;
  }

  return {
    tensionLbs,
    gaugeMm: gauge,
    power,
    control,
    spin,
    comfort,
    durability,
    stiffness,
    dwellHint,
    launchHint,
    gaugeHint,
  };
}

/** True when the string's recommended range overlaps the player's target tension. */
export function tensionRangeOverlaps(
  string: StringProfile,
  targetLbs: number,
  toleranceLbs = 2,
): boolean {
  const [lo, hi] = string.tensionRangeLbs;
  return targetLbs + toleranceLbs >= lo && targetLbs - toleranceLbs <= hi;
}

export function compareStrings(a: StringProfile, b: StringProfile) {
  return {
    power: a.power - b.power,
    control: a.control - b.control,
    spin: a.spin - b.spin,
    comfort: a.comfort - b.comfort,
    durability: a.durability - b.durability,
    tensionMaintenance: a.tensionMaintenance - b.tensionMaintenance,
    stiffness: stringStiffness(a) - stringStiffness(b),
  };
}

export function materialLabel(m: StringProfile["material"]): string {
  switch (m) {
    case "polyester":
      return "Polyester";
    case "co-poly":
      return "Co-polyester";
    case "multifilament":
      return "Multifilament";
    case "synthetic-gut":
      return "Synthetic gut";
    case "natural-gut":
      return "Natural gut";
    case "hybrid":
      return "Hybrid";
  }
}

export function shapeLabel(s: StringProfile["shape"]): string {
  switch (s) {
    case "round":
      return "Round";
    case "octagonal":
      return "Octagonal";
    case "hexagonal":
      return "Hexagonal";
    case "pentagonal":
      return "Pentagonal";
    case "twisted":
      return "Twisted";
    case "textured":
      return "Textured";
    case "triangular":
      return "Triangular";
  }
}

/** US gauge label approximation from mm (for UI differentiation). */
export function gaugeLabel(mm: number): string {
  if (mm <= 1.18) return "18g";
  if (mm <= 1.22) return "17L";
  if (mm <= 1.26) return "17g";
  if (mm <= 1.3) return "16g";
  if (mm <= 1.34) return "15L";
  return "15g";
}
