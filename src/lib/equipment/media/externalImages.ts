import imageCache from "@/data/equipment/image-cache.json";

type CacheBucket = Record<string, { code?: string; title?: string; imageUrl: string }>;

const rackets = (imageCache as { rackets: CacheBucket }).rackets ?? {};
const strings = (imageCache as { strings: CacheBucket }).strings ?? {};
const grips = (imageCache as { grips: CacheBucket }).grips ?? {};

/** Tennis Warehouse (or curated) product photo when matched. */
export function externalRacketImage(slug: string): string | null {
  return rackets[slug]?.imageUrl ?? null;
}

export function externalStringImage(id: string): string | null {
  return strings[id]?.imageUrl ?? null;
}

export function externalGripImage(id: string): string | null {
  return grips[id]?.imageUrl ?? null;
}

export function twImageMeta(kind: "rackets" | "strings" | "grips", key: string) {
  const bucket = kind === "rackets" ? rackets : kind === "strings" ? strings : grips;
  return bucket[key] ?? null;
}
