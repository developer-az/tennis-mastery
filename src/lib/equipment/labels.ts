/**
 * Display helpers so brand+model never doubles ("Tourna Tourna Grip")
 * and rails stay scannable.
 */

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** True when `name` already starts with the brand (case-insensitive). */
export function nameIncludesBrand(brand: string, name: string): boolean {
  const b = normalize(brand).toLowerCase();
  const n = normalize(name).toLowerCase();
  if (!b || !n) return false;
  if (n === b || n.startsWith(`${b} `)) return true;
  // Multi-word brands: "Signum Pro" in "Signum Pro Poly Plasma…"
  const brandCompact = b.replace(/[^a-z0-9]+/g, "");
  const nameCompact = n.replace(/[^a-z0-9]+/g, "");
  return Boolean(brandCompact) && nameCompact.startsWith(brandCompact);
}

/** Model/name with leading brand stripped when redundant. */
export function modelWithoutBrand(brand: string, name: string): string {
  const b = normalize(brand);
  const n = normalize(name);
  if (!b || !n) return n;
  if (n.toLowerCase() === b.toLowerCase()) return n;
  const re = new RegExp(`^${escapeRegExp(b)}\\s+`, "i");
  return n.replace(re, "").trim() || n;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Full shop label: "Tourna Grip", "Kirschbaum Super Smash" — never doubles brand. */
export function equipmentLabel(brand: string, name: string): string {
  const b = normalize(brand);
  const n = normalize(name);
  if (!b) return n;
  if (!n) return b;
  if (nameIncludesBrand(b, n)) return n;
  return `${b} ${n}`;
}

/** Short model for rails / chips — brand optional, gauge/parenthetical trimmed. */
export function shortProductName(name: string, maxChars = 22): string {
  let n = normalize(name)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Drop trailing gauge like "1.25" / "1.30" for compact rails
  n = n.replace(/\s+\d\.\d{2}$/, "").trim();
  if (n.length <= maxChars) return n;
  const cut = n.slice(0, maxChars - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 8 ? cut.slice(0, space) : cut).trim()}…`;
}

/** Brand + short model for horizontal swap rails. */
export function railLabel(brand: string, name: string, maxChars = 20): string {
  const model = shortProductName(modelWithoutBrand(brand, name), maxChars);
  const b = normalize(brand);
  if (!b || nameIncludesBrand(b, model)) return shortProductName(model, maxChars);
  const combined = `${b} ${model}`;
  if (combined.length <= maxChars + 6) return combined;
  return model;
}
