import type { RacketProfile, StringMaterial, StringProfile } from "@/types/equipment";
import { derivePlayerFit } from "@/lib/equipment/playerFit";

export const FEEL_MIN = 70;

export type RacketShopType = "beginner" | "power" | "spin" | "control" | "allcourt";

export const RACKET_SHOP_TYPES: { id: RacketShopType; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner-friendly", hint: "Easier to swing and find the middle" },
  { id: "power", label: "Easy power", hint: "Helps the ball go deep" },
  { id: "spin", label: "Heavy spin", hint: "Bites the ball for shape" },
  { id: "control", label: "Control / precision", hint: "Goes where you aim" },
  { id: "allcourt", label: "All-court", hint: "A bit of everything" },
];

export function racketShopType(r: RacketProfile): RacketShopType {
  const fit = derivePlayerFit(r);
  if (fit.skill === "Beginner-friendly") return "beginner";
  if (fit.feelAxis === "Power-oriented" || fit.courtRole === "First-strike power") return "power";
  if (
    fit.feelAxis === "Spin-oriented" ||
    fit.courtRole === "Heavy-spin baseliner" ||
    fit.courtRole === "Shape baseliner"
  ) {
    return "spin";
  }
  if (
    fit.feelAxis === "Control-oriented" ||
    fit.courtRole === "Precision baseliner" ||
    fit.courtRole === "Counterpuncher"
  ) {
    return "control";
  }
  return "allcourt";
}

export function racketShopBadge(r: RacketProfile): string {
  const t = racketShopType(r);
  return RACKET_SHOP_TYPES.find((x) => x.id === t)?.label ?? "All-court";
}

export type FeelKey = "power" | "spin" | "control" | "comfort" | "durability";

export const RACKET_FEELS: { id: FeelKey; label: string; color: string }[] = [
  { id: "spin", label: "Spin", color: "var(--chart-spin)" },
  { id: "power", label: "Power", color: "var(--chart-power)" },
  { id: "control", label: "Control", color: "var(--chart-control)" },
  { id: "comfort", label: "Comfort", color: "var(--chart-comfort)" },
];

export const STRING_FEELS: { id: FeelKey; label: string; color: string }[] = [
  ...RACKET_FEELS,
  { id: "durability", label: "Durability", color: "var(--amber)" },
];

export function uniqueSortedBrands(items: { brand: string }[]): string[] {
  return Array.from(new Set(items.map((i) => i.brand))).sort((a, b) => a.localeCompare(b));
}

export function brandsByCount(
  items: { brand: string }[],
  n?: number,
  pin: string[] = [],
): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.brand, (counts.get(item.brand) ?? 0) + 1);
  }
  const rest = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([brand]) => brand);
  const pinned = pin.filter((b) => counts.has(b));
  const pinnedSet = new Set(pinned);
  const sorted = [...pinned, ...rest.filter((b) => !pinnedSet.has(b))];
  return n ? sorted.slice(0, n) : sorted;
}

/** Prefer shop-critical brands in string aisles (Solinco etc.). */
export const STRING_BRAND_PIN = ["Solinco", "Luxilon", "Babolat", "Wilson", "Yonex", "HEAD", "Tecnifibre"];

/** Prefer Tourna dry-feel + common overgrips in grip aisles. */
export const GRIP_BRAND_PIN = ["Tourna", "Wilson", "Yonex", "HEAD", "Babolat", "Tecnifibre", "Gamma"];

/** Prefer Head Speed / Babolat / Wilson when browsing frames. */
export const RACKET_BRAND_PIN = ["HEAD", "Babolat", "Wilson", "Yonex", "Technifibre", "Tecnifibre", "Prince"];

export type StringMaterialAisle = "poly" | "multifilament" | "synthetic-gut" | "natural-gut" | "hybrid";

export const STRING_MATERIAL_AISLES: { id: StringMaterialAisle; label: string; hint: string }[] = [
  { id: "poly", label: "Poly (spin / control)", hint: "Lasts longer, more bite" },
  { id: "multifilament", label: "Multi (softer on the arm)", hint: "Comfort first" },
  { id: "synthetic-gut", label: "Syn gut (easy starter)", hint: "Simple and forgiving" },
  { id: "natural-gut", label: "Gut (feel)", hint: "Premium pocket" },
  { id: "hybrid", label: "Hybrid", hint: "Mix of control and comfort" },
];

export function stringMaterialAisle(material: StringMaterial): StringMaterialAisle {
  if (material === "polyester" || material === "co-poly") return "poly";
  if (material === "multifilament") return "multifilament";
  if (material === "synthetic-gut") return "synthetic-gut";
  if (material === "natural-gut") return "natural-gut";
  return "hybrid";
}

export function stringMaterialShopLabel(material: StringMaterial): string {
  const aisle = stringMaterialAisle(material);
  return STRING_MATERIAL_AISLES.find((x) => x.id === aisle)?.label ?? material;
}

export function matchesFeel(
  scores: Partial<Record<FeelKey, number>>,
  feel: FeelKey | "all",
  min = FEEL_MIN,
): boolean {
  if (feel === "all") return true;
  return (scores[feel] ?? 0) >= min;
}

export function groupByBrand<T extends { brand: string }>(
  items: T[],
  pin: string[] = [],
): { brand: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.brand);
    if (list) list.push(item);
    else map.set(item.brand, [item]);
  }
  return brandsByCount(items, undefined, pin).map((brand) => ({ brand, items: map.get(brand) ?? [] }));
}

export function stringScore(s: StringProfile, key: FeelKey): number {
  if (key === "durability") return s.durability;
  return s[key];
}
