/**
 * Intelligent equipment search: normalize spaces/hyphens, split alphanumeric
 * runs (cx200 ↔ CX 200), and match across brand/model fields.
 */

/** Lowercase and strip separators so "CX-200" / "cx 200" / "CX200" collapse. */
export function compactKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Compact while preserving token boundaries — joins only within each
 * whitespace/punctuation-separated chunk so "Classic X" never becomes "…cx…".
 */
export function compactChunks(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((chunk) => chunk.replace(/[^a-z0-9]+/g, ""));
}

/**
 * Split letter↔digit boundaries and keep the compact form.
 * "cx200" → ["cx200", "cx", "200"]
 * "Pure Aero 98" → ["pureaero98", "pure", "aero", "98", "pureaero", …]
 */
export function searchTokens(value: string): string[] {
  const compact = compactKey(value);
  if (!compact) return [];

  const parts = compact.match(/[a-z]+|\d+/g) ?? [];
  const out = new Set<string>([compact, ...parts]);

  for (let i = 0; i < parts.length - 1; i++) {
    out.add(parts[i] + parts[i + 1]);
  }

  return Array.from(out).filter(Boolean);
}

/** Tokens from each whitespace chunk (safer for multi-field haystacks). */
export function fieldTokens(...fields: Array<string | number | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const field of fields) {
    if (field == null || String(field).length === 0) continue;
    for (const chunk of compactChunks(String(field))) {
      for (const t of searchTokens(chunk)) out.add(t);
      out.add(chunk);
    }
    // Also add full-field compact for model strings like "CX 200 Tour"
    const fieldCompact = compactKey(String(field));
    if (fieldCompact) {
      out.add(fieldCompact);
      for (const t of searchTokens(String(field))) out.add(t);
    }
  }
  return out;
}

export function searchHaystack(...fields: Array<string | number | null | undefined>): string {
  return fields
    .filter((f) => f != null && String(f).length > 0)
    .map(String)
    .join(" ");
}

/**
 * Returns true when the query matches the haystack fields.
 * - Short queries ("cx"): token / compact match on brand+model+slug (not free-text)
 * - Concatenated models ("cx200"): match compact OR alphanumeric split tokens
 * - Multi-word ("dunlop cx 200"): every significant token must appear
 */
export function matchesEquipmentSearch(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // Split primary (identity) fields from optional free-text (summary/notes)
  const primary = fields.slice(0, Math.min(4, fields.length));
  const hayLower = searchHaystack(...fields).toLowerCase();
  const primaryLower = searchHaystack(...primary).toLowerCase();

  // Fast path: plain substring on any field (keeps "pure aero", "blade")
  if (hayLower.includes(q)) return true;

  // Gauge-style tokens: "1.30" / "1.3" against numeric fields (gaugesMm joined)
  const gaugeToken = q.match(/\b(1\.\d{1,2})\b/);
  if (gaugeToken) {
    const target = parseFloat(gaugeToken[1]);
    for (const field of fields) {
      if (typeof field === "number" && Math.abs(field - target) <= 0.02) return true;
      if (typeof field === "string") {
        const nums = field.match(/1\.\d{1,2}/g);
        if (nums?.some((n) => Math.abs(parseFloat(n) - target) <= 0.02)) return true;
      }
    }
  }

  const qCompact = compactKey(q);
  if (!qCompact) return true;

  const primaryTokens = fieldTokens(...primary);
  const primaryCompactBlob = primary.map((f) => compactKey(String(f ?? ""))).join("");

  // Compact substring only on identity fields (brand/model/slug/year) —
  // avoids "Classic X" → "…cx…" false positives from prose summaries.
  if (primaryCompactBlob.includes(qCompact)) return true;
  for (const t of primaryTokens) {
    if (t.includes(qCompact) || (qCompact.includes(t) && t.length >= 3)) {
      if (t.includes(qCompact)) return true;
    }
  }

  const qTokens = searchTokens(q).filter((t) => t.length >= 2 || /^\d+$/.test(t));
  if (qTokens.length === 0) return primaryCompactBlob.includes(qCompact);

  const significant = qTokens.filter((t) => t !== qCompact || qTokens.length === 1);
  const tokensToCheck =
    significant.length > 0
      ? significant.filter((t) => t.length >= 2 || /^\d+$/.test(t))
      : qTokens;

  const tokenHit = (t: string) =>
    primaryTokens.has(t) ||
    primaryCompactBlob.includes(t) ||
    primaryLower.includes(t);

  if (tokensToCheck.length >= 2) {
    return tokensToCheck.every(tokenHit);
  }

  const only = tokensToCheck[0] ?? qCompact;
  if (tokenHit(only)) return true;

  // Fuzzy prefix on identity tokens only
  for (const ht of primaryTokens) {
    if (ht.length < 2) continue;
    if (ht.startsWith(only) || (only.length >= 3 && only.startsWith(ht))) return true;
  }

  return false;
}

/** Score for ranking: higher = better match (exact compact > token > substring). */
export function searchMatchScore(
  query: string,
  ...fields: Array<string | number | null | undefined>
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const qCompact = compactKey(q);
  if (!qCompact) return 0;

  const brandCompact = compactKey(String(fields[0] ?? ""));
  const modelCompact = compactKey(String(fields[1] ?? ""));
  const slugCompact = compactKey(String(fields[2] ?? ""));
  const identity = brandCompact + modelCompact + slugCompact;

  let score = 0;
  if (modelCompact === qCompact) score += 100;
  else if (modelCompact.startsWith(qCompact)) score += 70;
  else if (modelCompact.includes(qCompact)) score += 50;
  else if (identity.includes(qCompact)) score += 35;

  if (slugCompact.includes(qCompact)) score += 15;
  if (brandCompact && brandCompact.includes(qCompact)) score += 10;

  return score;
}
