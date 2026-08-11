import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import {
  externalGripImage,
  externalRacketImage,
  externalStringImage,
} from "./externalImages";

/** Same-origin media route (redirects to TW photo when available). */
export function racketImageUrl(r: Pick<RacketProfile, "slug">): string {
  return `/api/equipment/rackets/${encodeURIComponent(r.slug)}/image`;
}

export function stringImageUrl(s: Pick<StringProfile, "id">): string {
  return `/api/equipment/strings/${encodeURIComponent(s.id)}/image`;
}

export function gripImageUrl(g: Pick<GripProfile, "id">): string {
  return `/api/equipment/grips/${encodeURIComponent(g.id)}/image`;
}

/** Absolute product photo when known; else local media API path. */
export function withRacketImages<T extends RacketProfile>(rackets: T[]): T[] {
  return rackets.map((r) => ({
    ...r,
    imageUrl: r.imageUrl ?? externalRacketImage(r.slug) ?? racketImageUrl(r),
  }));
}

export function withStringImages<T extends StringProfile>(strings: T[]): T[] {
  return strings.map((s) => ({
    ...s,
    imageUrl: s.imageUrl ?? externalStringImage(s.id) ?? stringImageUrl(s),
  }));
}

export function withGripImages<T extends GripProfile>(grips: T[]): T[] {
  return grips.map((g) => ({
    ...g,
    imageUrl: g.imageUrl ?? externalGripImage(g.id) ?? gripImageUrl(g),
  }));
}
