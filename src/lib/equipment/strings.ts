import type { StringProfile, TensionOutcome } from "@/types/equipment";

function clamp(v: number, a = 5, b = 98): number {
  return Math.max(a, Math.min(b, Math.round(v)));
}

/**
 * Model how a string bed changes when tension moves away from the recommended
 * mid-point. Higher tension → more control / less power / slightly less spin
 * grab window; lower tension → more dwell, power, comfort, and launch.
 */
export function tensionOutcome(string: StringProfile, tensionLbs: number): TensionOutcome {
  const [lo, hi] = string.tensionRangeLbs;
  const mid = string.recommendedTensionLbs;
  const span = Math.max(4, (hi - lo) / 2);
  const delta = (tensionLbs - mid) / span; // -1 soft … +1 tight

  const power = clamp(string.power - delta * 14);
  const control = clamp(string.control + delta * 16);
  const spin = clamp(string.spin - delta * 6 + (string.shape !== "round" ? -delta * 2 : 0));
  const comfort = clamp(string.comfort - delta * 18);

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

  return {
    tensionLbs,
    power,
    control,
    spin,
    comfort,
    dwellHint,
    launchHint,
  };
}

export function compareStrings(a: StringProfile, b: StringProfile) {
  return {
    power: a.power - b.power,
    control: a.control - b.control,
    spin: a.spin - b.spin,
    comfort: a.comfort - b.comfort,
    durability: a.durability - b.durability,
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
