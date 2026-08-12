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

export type StringAlternative = {
  string: StringProfile;
  score: number;
  /** Why this is a shoppable stand-in */
  why: string;
  /** Suggested search phrase for retail / marketplace */
  shopQuery: string;
};

/**
 * Rank catalog strings by feel similarity so players can hunt cheaper / local stock.
 * Distance is weighted score space + material/shape bonuses.
 */
export function findSimilarStrings(
  reference: StringProfile,
  catalog: StringProfile[],
  opts?: { limit?: number; excludeId?: string },
): StringAlternative[] {
  const limit = opts?.limit ?? 5;
  const exclude = opts?.excludeId ?? reference.id;
  const refStiff = stringStiffness(reference);
  const out: StringAlternative[] = [];

  for (const s of catalog) {
    if (s.id === exclude) continue;
    const stiff = stringStiffness(s);
    const dPower = Math.abs(s.power - reference.power);
    const dSpin = Math.abs(s.spin - reference.spin);
    const dCtl = Math.abs(s.control - reference.control);
    const dComf = Math.abs(s.comfort - reference.comfort);
    const dDur = Math.abs(s.durability - reference.durability);
    const dStiff = Math.abs(stiff - refStiff);
    const dTm = Math.abs(s.tensionMaintenance - reference.tensionMaintenance);

    let dist =
      dSpin * 1.2 +
      dCtl * 1.1 +
      dPower * 0.9 +
      dComf * 1.0 +
      dStiff * 0.85 +
      dDur * 0.55 +
      dTm * 0.4;

    if (s.material === reference.material) dist -= 14;
    else if (isPolyFamily(s.material) && isPolyFamily(reference.material)) dist -= 8;
    if (s.shape === reference.shape) dist -= 10;
    else if (s.shape !== "round" && reference.shape !== "round") dist -= 4;

    const sharedGauge = s.gaugesMm.some((g) =>
      reference.gaugesMm.some((rg) => Math.abs(g - rg) <= 0.03),
    );
    if (sharedGauge) dist -= 5;

    const score = Math.min(99, Math.max(0, Math.round(100 - dist)));
    if (score < 55) continue;

    const bits: string[] = [];
    if (s.material === reference.material) bits.push(`same ${materialLabel(s.material)}`);
    else if (isPolyFamily(s.material) && isPolyFamily(reference.material)) {
      bits.push("poly family");
    }
    if (s.shape === reference.shape) bits.push(`${shapeLabel(s.shape).toLowerCase()} profile`);
    if (dSpin <= 6) bits.push("near spin");
    if (dCtl <= 6) bits.push("near control");
    if (dComf <= 8) bits.push("near comfort");
    if (dStiff <= 8) bits.push("similar stiffness feel");
    if (bits.length === 0) bits.push("closest overall score match");

    out.push({
      string: s,
      score,
      why: bits.join(" · "),
      shopQuery: `${s.brand} ${s.name} tennis string`,
    });
  }

  out.sort((a, b) => b.score - a.score || a.string.name.localeCompare(b.string.name));
  return out.slice(0, limit);
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

/** Common filter buckets for poly 1.30-style browsing. */
export const GAUGE_FILTER_OPTIONS = [1.2, 1.25, 1.3, 1.35] as const;

/**
 * True when any of the string's gauges is within tolerance of target mm.
 * 1.30 band is intentionally wider (±0.03) so 1.28–1.32 polys surface together.
 */
export function stringHasGauge(
  string: StringProfile,
  targetMm: number,
  tolerance?: number,
): boolean {
  const tol = tolerance ?? (Math.abs(targetMm - 1.3) < 0.001 ? 0.03 : 0.02);
  return string.gaugesMm.some((g) => Math.abs(g - targetMm) <= tol);
}

/** Polyester family: tour polys + co-polys (what players mean by "poly"). */
export function isPolyFamily(material: StringProfile["material"]): boolean {
  return material === "polyester" || material === "co-poly";
}

export function matchesMaterialFilter(
  string: StringProfile,
  material: string,
): boolean {
  if (material === "all") return true;
  if (material === "poly") return isPolyFamily(string.material);
  return string.material === material;
}

/**
 * Parse gauge intent from free-text search ("1.30", "1.3", "16g", "poly 1.25").
 * Returns mm when found, else null.
 */
export function parseGaugeFromQuery(query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const mm = q.match(/\b(1\.\d{1,2})\b/);
  if (mm) return parseFloat(mm[1]);
  if (/\b18g?\b/.test(q)) return 1.18;
  if (/\b17l\b/.test(q)) return 1.2;
  if (/\b17g?\b/.test(q)) return 1.25;
  if (/\b16g?\b/.test(q)) return 1.3;
  if (/\b15l\b/.test(q)) return 1.33;
  if (/\b15g?\b/.test(q)) return 1.35;
  return null;
}

/** Detect poly-family intent in free text ("poly", "polyester", "co-poly"). */
export function parsePolyIntent(query: string): boolean {
  return /\b(poly|polyester|co-?poly|copoly)\b/i.test(query);
}

export function stringCategoryBlurb(
  material: string,
  gaugeMm: number | null,
  shape: string,
): string {
  const parts: string[] = [];
  if (material === "poly" || material === "polyester" || material === "co-poly") {
    parts.push(
      "Polyester / co-poly beds emphasize control, spin, and durability with a firmer pocket. Club and tour players usually mean this whole family when they say “poly.”",
    );
  } else if (material === "multifilament") {
    parts.push("Multifilaments play softer with higher launch and comfort than full poly.");
  } else if (material === "natural-gut") {
    parts.push("Natural gut is the comfort and tension-maintenance benchmark.");
  } else if (material === "hybrid") {
    parts.push("Hybrids blend poly bite with gut or multi comfort in one bed.");
  } else if (material === "synthetic-gut") {
    parts.push("Synthetic gut is an accessible all-rounder with easy power.");
  } else if (material === "all") {
    parts.push("Matching strings across materials — open one to learn construction and feel.");
  }
  if (gaugeMm != null) {
    const around130 = Math.abs(gaugeMm - 1.3) < 0.001;
    parts.push(
      around130
        ? `Around 1.30 mm (${gaugeLabel(1.3)} / 16g): the most common poly gauge — balanced durability, control, and spin. Includes nearby 1.28–1.32 options.`
        : `At ~${gaugeMm.toFixed(2)} mm (${gaugeLabel(gaugeMm)}), expect ${
            gaugeMm <= 1.25
              ? "more snap-back spin and pocket, less durability"
              : "more durability and a firmer, control-leaning response"
          }.`,
    );
  }
  if (shape !== "all" && shape !== "round") {
    parts.push(`Shaped (${shape}) profiles add bite for topspin-first players.`);
  } else if (shape === "round") {
    parts.push("Round profiles feel more predictable and less harsh on mishits.");
  }
  return parts.join(" ") || "Browse matching strings and compare feel scores side by side.";
}
