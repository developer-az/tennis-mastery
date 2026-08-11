export type EquipmentTab = "rackets" | "strings" | "grips";

export type RacketStyle =
  | "Heavy-spin baseliner"
  | "Modern shape / RPMS"
  | "Precision player's frame"
  | "Controlled all-courter"
  | "Forgiving power frame"
  | "Easy depth & pace"
  | "Balanced modern frame"
  | "Versatile modern frame"
  | string;

export interface RacketProfile {
  slug: string;
  brand: string;
  model: string;
  year: number;
  weightG: number | null;
  swingweight: number | null;
  stiffnessRa: number | null;
  balanceMm: number | null;
  headSizeSqIn: number | null;
  stringPattern: string | null;
  summary: string;
  atpPlayers: string[];
  wtaPlayers: string[];
  power: number;
  spin: number;
  control: number;
  comfort: number;
  idealLaunchAngleDeg: number;
  idealSwingPathDeg: number;
  style: RacketStyle;
}

export type StringMaterial =
  | "polyester"
  | "co-poly"
  | "multifilament"
  | "synthetic-gut"
  | "natural-gut"
  | "hybrid";

export type StringShape =
  | "round"
  | "octagonal"
  | "hexagonal"
  | "pentagonal"
  | "twisted"
  | "textured"
  | "triangular";

export interface StringProfile {
  id: string;
  brand: string;
  name: string;
  material: StringMaterial;
  shape: StringShape;
  gaugesMm: number[];
  /** Baseline 0–100 at mid recommended tension and reference (usually mid) gauge */
  power: number;
  control: number;
  spin: number;
  comfort: number;
  durability: number;
  tensionMaintenance: number;
  /**
   * Dynamic stiffness feel 0–100 (higher = boardier / more connected).
   * Optional in data — derived from material + comfort when omitted.
   */
  stiffness?: number;
  tensionRangeLbs: [number, number];
  recommendedTensionLbs: number;
  feel: string;
  bestFor: string;
  notes: string;
}

export interface TensionOutcome {
  tensionLbs: number;
  gaugeMm: number;
  power: number;
  control: number;
  spin: number;
  comfort: number;
  durability: number;
  stiffness: number;
  dwellHint: string;
  launchHint: string;
  gaugeHint: string;
}

export type GripKind = "overgrip" | "replacement";

export interface GripProfile {
  id: string;
  brand: string;
  name: string;
  kind: GripKind;
  /** Relative 0–100 scales */
  tackiness: number;
  cushion: number;
  thicknessMm: number;
  absorbency: number;
  durability: number;
  texture: "smooth" | "perforated" | "ribbed" | "dry-tack" | "tour" | "raised";
  feel: string;
  uniqueTrait: string;
  bestFor: string;
  notes: string;
}

export interface RacketCatalogMeta {
  source: string;
  version: string;
  updated: string;
  count: number;
  live: boolean;
}
