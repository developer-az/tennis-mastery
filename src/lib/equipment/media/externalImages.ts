import imageCache from "@/data/equipment/image-cache.json";

type CacheEntry = { code?: string; title?: string; imageUrl: string };
type CacheBucket = Record<string, CacheEntry>;

const rackets = (imageCache as { rackets: CacheBucket }).rackets ?? {};
const strings = (imageCache as { strings: CacheBucket }).strings ?? {};
const grips = (imageCache as { grips: CacheBucket }).grips ?? {};

const ACCESSORY_TITLE =
  /\b(grommet|bumper\s*guard|overgrip|replacement grip|dampener|vibration|silencer|stencil|wristband|backpack|towel)\b/i;
const ACCESSORY_CODE = /(BG|GROM|BUMP|OGRIP)$/i;

/** Reject TW accessory pages that were mis-keyed onto racket slugs. */
function isRacketPhoto(entry: CacheEntry | undefined): entry is CacheEntry {
  if (!entry?.imageUrl) return false;
  const title = entry.title ?? "";
  const code = entry.code ?? "";
  if (ACCESSORY_TITLE.test(title)) return false;
  if (ACCESSORY_CODE.test(code)) return false;
  if (/Grommet|Bumper/i.test(entry.imageUrl)) return false;
  return true;
}

/** Tennis Warehouse (or curated) product photo when matched. */
export function externalRacketImage(slug: string): string | null {
  const entry = rackets[slug];
  return isRacketPhoto(entry) ? entry.imageUrl : null;
}

export function externalStringImage(id: string): string | null {
  return strings[id]?.imageUrl ?? null;
}

export function externalGripImage(id: string): string | null {
  return grips[id]?.imageUrl ?? null;
}

/** Sort key: real TW/product photos before SVG portraits. */
export function hasExternalPhoto(
  kind: "racket" | "string" | "grip",
  id: string,
): boolean {
  if (kind === "racket") return isRacketPhoto(rackets[id]);
  if (kind === "string") return Boolean(strings[id]?.imageUrl);
  return Boolean(grips[id]?.imageUrl);
}

export function photoFirst(a: boolean, b: boolean): number {
  return Number(b) - Number(a);
}

export function twImageMeta(kind: "rackets" | "strings" | "grips", key: string) {
  const bucket = kind === "rackets" ? rackets : kind === "strings" ? strings : grips;
  const entry = bucket[key];
  if (kind === "rackets" && entry && !isRacketPhoto(entry)) return null;
  return entry ?? null;
}
