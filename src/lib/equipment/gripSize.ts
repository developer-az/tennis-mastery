/** Standard US grip sizes (L0–L5). */

export type GripSizeCode = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export const GRIP_SIZES: {
  code: GripSizeCode;
  inches: string;
  label: string;
  hint: string;
}[] = [
  { code: "L0", inches: '4"', label: "L0 · 4\"", hint: "Smallest common adult / junior-adult size." },
  { code: "L1", inches: '4 1/8"', label: "L1 · 4⅛\"", hint: "Common for smaller hands." },
  { code: "L2", inches: '4 1/4"', label: "L2 · 4¼\"", hint: "Very common retail default." },
  { code: "L3", inches: '4 3/8"', label: "L3 · 4⅜\"", hint: "Most popular men’s retail size." },
  { code: "L4", inches: '4 1/2"', label: "L4 · 4½\"", hint: "Larger hands / less overgrip build-up." },
  { code: "L5", inches: '4 5/8"', label: "L5 · 4⅝\"", hint: "Largest common adult size." },
];

export function gripSizeLabel(code: GripSizeCode | null | undefined): string {
  if (!code) return "";
  return GRIP_SIZES.find((g) => g.code === code)?.label ?? code;
}

export function isGripSizeCode(v: string): v is GripSizeCode {
  return GRIP_SIZES.some((g) => g.code === v);
}
