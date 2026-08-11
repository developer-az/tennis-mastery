import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";

/** Resolve display image URL: curated override or generated media API. */
export function racketImageUrl(r: Pick<RacketProfile, "slug" | "imageUrl">): string {
  if (r.imageUrl) return r.imageUrl;
  return `/api/equipment/rackets/${encodeURIComponent(r.slug)}/image`;
}

export function stringImageUrl(s: Pick<StringProfile, "id" | "imageUrl">): string {
  if (s.imageUrl) return s.imageUrl;
  return `/api/equipment/strings/${encodeURIComponent(s.id)}/image`;
}

export function gripImageUrl(g: Pick<GripProfile, "id" | "imageUrl">): string {
  if (g.imageUrl) return g.imageUrl;
  return `/api/equipment/grips/${encodeURIComponent(g.id)}/image`;
}

/** Attach resolved imageUrl onto catalog rows for JSON APIs. */
export function withRacketImages<T extends RacketProfile>(rackets: T[]): T[] {
  return rackets.map((r) => ({
    ...r,
    imageUrl: r.imageUrl ?? racketImageUrl(r),
  }));
}

export function withStringImages<T extends StringProfile>(strings: T[]): T[] {
  return strings.map((s) => ({
    ...s,
    imageUrl: s.imageUrl ?? stringImageUrl(s),
  }));
}

export function withGripImages<T extends GripProfile>(grips: T[]): T[] {
  return grips.map((g) => ({
    ...g,
    imageUrl: g.imageUrl ?? gripImageUrl(g),
  }));
}
