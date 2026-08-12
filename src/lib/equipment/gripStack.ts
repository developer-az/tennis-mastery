import type { GripKind, GripProfile } from "@/types/equipment";
import type { GripSizeCode } from "@/lib/equipment/gripSize";
import { GRIP_SIZES } from "@/lib/equipment/gripSize";

export interface GripLayer {
  id: string;
  label: string;
  kind: GripKind;
}

export const MAX_OVERGRIPS = 3;

export function sizeIndex(code: GripSizeCode | null | undefined): number {
  if (!code) return 3; // L3 default assumption
  return GRIP_SIZES.findIndex((g) => g.code === code);
}

/**
 * Effective handle build from stamped size + stacked grips.
 * ~0.55–0.6 mm overgrip ≈ one grip-size step of build.
 */
export function gripStackEffect(
  layers: GripLayer[],
  catalog: GripProfile[],
  gripSize: GripSizeCode | null | undefined,
): {
  thicknessMm: number;
  cushion: number;
  tackiness: number;
  absorbency: number;
  durability: number;
  overgripCount: number;
  hasReplacement: boolean;
  effectiveSizeIndex: number;
  launchOffset: number;
  controlBias: number;
  spinBias: number;
  comfortBias: number;
  buildNote: string;
} {
  const profiles = layers
    .map((l) => catalog.find((g) => g.id === l.id))
    .filter((g): g is GripProfile => g != null);

  const overgripCount = layers.filter((l) => l.kind === "overgrip").length;
  const hasReplacement = layers.some((l) => l.kind === "replacement");

  let thicknessMm = 0;
  let cushionSum = 0;
  let absorbSum = 0;
  let durSum = 0;
  for (const p of profiles) {
    thicknessMm += p.thicknessMm;
    cushionSum += p.cushion;
    absorbSum += p.absorbency;
    durSum += p.durability;
  }
  const n = Math.max(1, profiles.length);
  const cushion = profiles.length ? cushionSum / n : 50;
  const absorbency = profiles.length ? absorbSum / n : 50;
  const durability = profiles.length ? durSum / n : 50;
  // Outermost layer dominates tack (what the hand feels)
  const outer = profiles[profiles.length - 1];
  const tackiness = outer?.tackiness ?? 50;

  const baseSize = sizeIndex(gripSize);
  const buildSteps = thicknessMm / 0.55;
  const effectiveSizeIndex = baseSize + buildSteps;

  // Soft/thick stack slightly raises perceived launch; oversized build mutes wrist snap
  const launchOffset =
    Math.round(((cushion - 50) * 0.008 + (thicknessMm - 0.6) * 0.2) * 10) / 10;
  let controlBias = 0;
  let spinBias = 0;
  let comfortBias = Math.round((cushion - 50) * 0.15);
  let buildNote = "";

  if (layers.length === 0) {
    buildNote = "No grip layers saved — handle size and stack are unknown levers.";
  } else if (effectiveSizeIndex < 2.3) {
    controlBias = -4;
    spinBias = 2;
    buildNote = `Build feels undersized (~${gripSize ?? "L?"} + ${thicknessMm.toFixed(1)} mm). Add an overgrip or size up for a more stable bevel.`;
  } else if (effectiveSizeIndex > 4.4) {
    controlBias = -3;
    spinBias = -4;
    comfortBias += 4;
    buildNote = `Build feels oversized (~${overgripCount} overgrip${overgripCount === 1 ? "" : "s"}, ${thicknessMm.toFixed(1)} mm). Strip a layer if bevels feel round and wrist snap dies.`;
  } else {
    controlBias = 2;
    buildNote = `Handle build in a workable band (${gripSize ?? "L?"} · ${layers.length} layer${layers.length === 1 ? "" : "s"} · ${thicknessMm.toFixed(1)} mm).`;
  }

  if (overgripCount >= 2) {
    comfortBias += 3;
    spinBias -= 1;
  }

  return {
    thicknessMm: Math.round(thicknessMm * 100) / 100,
    cushion: Math.round(cushion),
    tackiness: Math.round(tackiness),
    absorbency: Math.round(absorbency),
    durability: Math.round(durability),
    overgripCount,
    hasReplacement,
    effectiveSizeIndex: Math.round(effectiveSizeIndex * 10) / 10,
    launchOffset,
    controlBias,
    spinBias,
    comfortBias,
    buildNote,
  };
}

export function canAddGripLayer(layers: GripLayer[], next: GripKind): boolean {
  const overs = layers.filter((l) => l.kind === "overgrip").length;
  const reps = layers.filter((l) => l.kind === "replacement").length;
  if (next === "replacement") return reps === 0 && layers.length === 0;
  return overs < MAX_OVERGRIPS && layers.length < MAX_OVERGRIPS + 1;
}

export function summarizeGripLayers(
  layers: GripLayer[],
  gripSize: GripSizeCode | null | undefined,
): string {
  if (layers.length === 0) return gripSize ? String(gripSize) : "";
  const overs = layers.filter((l) => l.kind === "overgrip");
  const rep = layers.find((l) => l.kind === "replacement");
  const parts: string[] = [];
  if (rep) parts.push(rep.label);
  if (overs.length === 1) parts.push(overs[0].label);
  else if (overs.length > 1) {
    const same = overs.every((o) => o.id === overs[0].id);
    parts.push(same ? `${overs[0].label} ×${overs.length}` : `${overs.length} overgrips`);
  }
  if (gripSize) parts.push(gripSize);
  return parts.join(" · ");
}
