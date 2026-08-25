import imageCache from "@/data/equipment/image-cache.json";

type CacheEntry = { code?: string; title?: string; imageUrl: string };
type CacheBucket = Record<string, CacheEntry>;

const rackets = (imageCache as { rackets: CacheBucket }).rackets ?? {};
const strings = (imageCache as { strings: CacheBucket }).strings ?? {};
const grips = (imageCache as { grips: CacheBucket }).grips ?? {};

const ACCESSORY_TITLE =
  /\b(grommet|bumper\s*guard|overgrip|replacement grip|dampener|vibration|silencer|stencil|wristband|backpack|towel)\b/i;
const ACCESSORY_CODE = /(BG|GROM|BUMP|OGRIP)$/i;

/** Ids whose TW cache title is known wrong — prefer SVG portrait. */
const STRING_PHOTO_BLOCKLIST = new Set([
  "prince-synthetic-gut-with-duraflex", // ProBlend, not Syn Gut Duraflex
  "wilson-synthetic-gut-power-16", // Duo Power hybrid pack
  "grapplesnake-tour-malin-125", // Tour Mako, not Tour Malin
  "babolat-pro-hurricane-tour-125", // RPM Hurricane, not Pro Hurricane Tour
  "solinco-confidential-125", // Confidential Soft variant
]);

const GRIP_PHOTO_BLOCKLIST = new Set([
  "yonex-super-grap", // Dry Super Grap photo keyed onto Super Grap
  "wilson-pro-hybrid-replacement", // Shock Shield, not Pro Hybrid
  "tecnifibre-contact-replacement", // X-Tra Feel, not Contact
  "volkl-velo", // Pro Perf, not Velo
  "gamma-honeycomb", // Leather, not Honeycomb
]);

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

function hasPhoto(entry: CacheEntry | undefined): entry is CacheEntry {
  return Boolean(entry?.imageUrl);
}

/** Tennis Warehouse (or curated) product photo when matched. */
export function externalRacketImage(slug: string): string | null {
  const entry = rackets[slug];
  return isRacketPhoto(entry) ? entry.imageUrl : null;
}

export function externalStringImage(id: string): string | null {
  if (STRING_PHOTO_BLOCKLIST.has(id)) return null;
  const entry = strings[id];
  return hasPhoto(entry) ? entry.imageUrl : null;
}

export function externalGripImage(id: string): string | null {
  if (GRIP_PHOTO_BLOCKLIST.has(id)) return null;
  const entry = grips[id];
  return hasPhoto(entry) ? entry.imageUrl : null;
}

/** Sort key: real TW/product photos before SVG portraits. */
export function hasExternalPhoto(
  kind: "racket" | "string" | "grip",
  id: string,
): boolean {
  if (kind === "racket") return isRacketPhoto(rackets[id]);
  if (kind === "string") return Boolean(externalStringImage(id));
  return Boolean(externalGripImage(id));
}

export function photoFirst(a: boolean, b: boolean): number {
  return Number(b) - Number(a);
}

export function twImageMeta(kind: "rackets" | "strings" | "grips", key: string) {
  const bucket = kind === "rackets" ? rackets : kind === "strings" ? strings : grips;
  const entry = bucket[key];
  if (kind === "rackets" && entry && !isRacketPhoto(entry)) return null;
  if (kind === "strings" && STRING_PHOTO_BLOCKLIST.has(key)) return null;
  if (kind === "grips" && GRIP_PHOTO_BLOCKLIST.has(key)) return null;
  return entry ?? null;
}
