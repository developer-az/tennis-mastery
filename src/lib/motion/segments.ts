import type { Anthropometrics } from "../../types/biomechanics";
import { HAND_LEN, RACKET_LEN } from "./types";

export type SegmentLens = {
  hipW: number;
  shoulderW: number;
  torso: number;
  neck: number;
  upper: number;
  fore: number;
  hand: number;
  thigh: number;
  shank: number;
  racket: number;
};

export function segmentLens(anthro: Anthropometrics): SegmentLens {
  const h = anthro.heightM;
  return {
    hipW: 0.112 * h,
    shoulderW: 0.21 * (anthro.wingspanM / Math.max(1.6, h)) * h,
    torso: anthro.torsoRatio * h,
    neck: 0.13 * h,
    upper: anthro.upperArmRatio * h,
    fore: anthro.forearmRatio * h,
    hand: HAND_LEN * (h / 1.85),
    thigh: anthro.thighRatio * h,
    shank: anthro.shankRatio * h,
    racket: RACKET_LEN,
  };
}
