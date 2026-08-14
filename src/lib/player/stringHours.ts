import type { StringBedHours } from "@/types/playerProfile";

/** Soft poly often loses bite / goes trampoline-y after roughly this many court hours. */
export const POLY_DEAD_HOURS = 8;
export const MULTI_DEAD_HOURS = 20;
export const HYBRID_DEAD_HOURS = 12;

export function deadHoursForMaterial(materialHint: string): number {
  const m = materialHint.toLowerCase();
  if (m.includes("poly") || m.includes("polyester") || m.includes("co-poly")) {
    return POLY_DEAD_HOURS;
  }
  if (m.includes("multi") || m.includes("syn gut") || m.includes("nylon")) {
    return MULTI_DEAD_HOURS;
  }
  if (m.includes("hybrid")) return HYBRID_DEAD_HOURS;
  if (m.includes("gut") || m.includes("natural")) return 30;
  return POLY_DEAD_HOURS;
}

export function bedStatus(
  bed: StringBedHours,
  materialHint?: string,
): {
  status: "fresh" | "aging" | "likely_dead";
  hoursLeft: number;
  limit: number;
  message: string;
} {
  const hint = materialHint ?? bed.stringLabel;
  const limit = deadHoursForMaterial(hint);
  const left = Math.max(0, limit - bed.hours);
  const pct = bed.hours / limit;
  if (pct >= 1) {
    return {
      status: "likely_dead",
      hoursLeft: 0,
      limit,
      message: `${bed.stringLabel}: ~${bed.hours.toFixed(1)}h on bed — string is likely dead. Do not judge a setup on this bed.`,
    };
  }
  if (pct >= 0.7) {
    return {
      status: "aging",
      hoursLeft: left,
      limit,
      message: `${bed.stringLabel}: ~${left.toFixed(1)}h before typical dead zone. Re-check soon.`,
    };
  }
  return {
    status: "fresh",
    hoursLeft: left,
    limit,
    message: `${bed.stringLabel}: ~${bed.hours.toFixed(1)}h / ${limit}h — still in useful window.`,
  };
}
