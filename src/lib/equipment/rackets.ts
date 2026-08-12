import type { RacketProfile, RacketCatalogMeta } from "@/types/equipment";
import snapshot from "@/data/equipment/rackets.snapshot.json";

const RACQIX_URL = "https://www.racqix.com/api/racquets?mode=minimal";

type RacqixRow = {
  slug: string;
  brand: string;
  model: string;
  year: string | number;
  weight: number | null;
  swingweight: number | null;
  ra: number | null;
  balance_mm: number | null;
  head_size: number | null;
  string_pattern: string | null;
  summaries_expert_en?: string | null;
  atp_players?: string[];
  wta_players?: string[];
};

/** Line-only model tokens Racqix often returns without the variant (Pro / MP / CX 200…). */
const LINE_ONLY_RE =
  /^(prestige|gravity|radical|extreme|boom|speed|instinct|cx|fx|sx|vcore|ezone|percept|blade|clash|shift|pure aero|pure drive|pure strike|pro staff|tfight|strike|aero|drive)$/i;

const BRAND_PREFIX_RE =
  /^(head|babolat|wilson|yonex|dunlop|tecnifibre|prince|volkl|solinco|gamma|prokennex|donnay|lacoste|adidas)-/i;

/**
 * Prefer a human display name from the slug when Racqix truncates `model`
 * (e.g. slug head-prestige-pro-2024 + model "Prestige" → "Prestige Pro").
 */
export function resolveDisplayModel(slug: string, model: string): string {
  const cleaned = (model || "").trim();
  let body = slug.replace(BRAND_PREFIX_RE, "");
  body = body.replace(/-?\d{4}$/, "");
  body = body.replace(/^graphene(-\d+)?(-plus)?-/, "");
  body = body.replace(/^srixon-/, "");

  const fromSlug = body
    .split("-")
    .filter(Boolean)
    .map((seg) => {
      if (/^\d+x\d+$/i.test(seg)) return seg.toLowerCase();
      if (/^\d+$/.test(seg)) return seg;
      const lower = seg.toLowerCase();
      const acronyms: Record<string, string> = {
        mp: "MP",
        ls: "LS",
        os: "OS",
        pro: "Pro",
        tour: "Tour",
        team: "Team",
        elite: "Elite",
        limited: "Limited",
        mid: "Mid",
        plus: "Plus",
        lite: "Lite",
        cx: "CX",
        fx: "FX",
        sx: "SX",
        g360: "G360",
      };
      if (acronyms[lower]) return acronyms[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\bMp L\b/g, "MP L")
    .replace(/\b18x20\b/gi, "18x20")
    .replace(/\b16x19\b/gi, "16x19");

  const modelCompact = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const slugCompact = body.replace(/-/g, "").toLowerCase();
  const lineOnly = LINE_ONLY_RE.test(cleaned);
  const slugRicher = slugCompact.length >= modelCompact.length + 3;

  if (!cleaned || lineOnly || slugRicher) {
    return fromSlug || cleaned || slug;
  }
  return cleaned;
}

function yearOf(r: RacqixRow): number {
  try {
    return parseInt(String(r.year).slice(0, 4), 10) || 0;
  } catch {
    return 0;
  }
}

function clamp(v: number, a = 5, b = 98): number {
  return Math.max(a, Math.min(b, Math.round(v)));
}

const SCORE_RE = /(\d+)\/100 for (power|spin|control)/gi;
const JUNIOR_RE = /\b(jr|junior|kids?)\b|-(19|21|23|25|26)(-|$)/i;

export function enrichRacket(r: RacqixRow): RacketProfile | null {
  const year = yearOf(r);
  if (year < 2019 || !r.weight || r.weight < 255) return null;
  const name = `${r.model} ${r.slug}`;
  if (JUNIOR_RE.test(name)) return null;

  const scores: { power: number | null; spin: number | null; control: number | null } = {
    power: null,
    spin: null,
    control: null,
  };
  const summary = r.summaries_expert_en || "";
  for (const m of summary.matchAll(SCORE_RE)) {
    scores[m[2].toLowerCase() as "power" | "spin" | "control"] = parseInt(m[1], 10);
  }

  const weight = r.weight;
  const sw = r.swingweight ?? 315;
  const ra = r.ra ?? 65;
  const hs = r.head_size ?? 100;
  const bal = r.balance_mm ?? 320;
  const pattern = r.string_pattern || "16x19";
  let mains = 16;
  let crosses = 19;
  try {
    const parts = pattern.toLowerCase().replace(/\s/g, "").split("x");
    mains = parseInt(parts[0], 10) || 16;
    crosses = parseInt(parts[1], 10) || 19;
  } catch {
    /* keep defaults */
  }
  const openPat = mains <= 16 && crosses <= 19;
  const densePat = mains >= 18 || crosses >= 20;
  const blob = `${r.model} ${r.slug} ${summary}`.toLowerCase();
  const spinCue = /\b(spin|aero|vcore|boom|extreme|graphene.*extreme|rpm|shape|whip)\b/.test(blob);
  const powerCue = /\b(power|drive|ezone|boom|radical mp|evoke|inspire)\b/.test(blob);
  const controlCue = /\b(control|blade|prestige|pro staff|tfight|gravity|vcore pro|precision|player.?s?)\b/.test(
    blob,
  );

  if (scores.power == null) {
    scores.power = clamp(
      48 +
        (ra - 60) * 1.5 +
        (hs - 98) * 2.0 +
        (305 - weight) * 0.25 +
        (bal - 320) * 0.2 +
        (powerCue ? 10 : 0) -
        (controlCue && !spinCue ? 5 : 0),
    );
  }
  if (scores.spin == null) {
    scores.spin = clamp(
      54 +
        (openPat ? 14 : densePat ? -8 : 0) +
        (hs - 98) * 1.5 +
        (ra - 62) * 0.45 +
        (sw - 310) * 0.06 +
        (spinCue ? 16 : 0) -
        (densePat && controlCue ? 6 : 0),
    );
  }
  if (scores.control == null) {
    scores.control = clamp(
      52 +
        (densePat ? 12 : openPat ? -4 : 0) +
        (weight - 295) * 0.4 +
        (98 - hs) * 1.7 +
        (66 - ra) * 0.7 +
        (320 - bal) * 0.15 +
        (controlCue ? 10 : 0) -
        (powerCue && !controlCue ? 6 : 0),
    );
  }

  const p = clamp(scores.power!);
  const sp = clamp(scores.spin!);
  const c = clamp(scores.control!);
  const launch = 3.8 + (hs - 95) * 0.28 + (p - 50) * 0.045 - (densePat ? 0.35 : 0) + (openPat ? 0.4 : 0);
  const swingPath =
    16 + (sp - 50) * 0.22 + (openPat ? 3.5 : 0) - (densePat ? 2 : 0) - (ra - 65) * 0.12;

  let style: string;
  if (hs >= 104 && p >= 70) style = "Forgiving power frame";
  else if (densePat && c >= 72 && hs <= 98) style = "Precision player's frame";
  else if (sp >= 78 && openPat && p >= 65) style = "Heavy-spin baseliner";
  else if (sp >= 70 && openPat) style = "Modern shape / RPMS";
  else if (c >= 70 && p >= 55 && p <= 72 && hs <= 100) style = "Controlled all-courter";
  else if (p >= 74 && c <= 60) style = "Easy depth & pace";
  else if (Math.abs(p - c) <= 10 && sp >= 55 && sp <= 75) style = "Balanced modern frame";
  else style = "Versatile modern frame";

  const comfort = clamp(100 - (ra - 50) * 1.7 - Math.max(0, sw - 320) * 0.35 + (hs - 98) * 0.8);

  return {
    slug: r.slug,
    brand: r.brand,
    model: resolveDisplayModel(r.slug, r.model),
    year,
    weightG: r.weight,
    swingweight: r.swingweight,
    stiffnessRa: r.ra,
    balanceMm: r.balance_mm,
    headSizeSqIn: r.head_size,
    stringPattern: r.string_pattern,
    summary: summary.slice(0, 480),
    atpPlayers: r.atp_players || [],
    wtaPlayers: r.wta_players || [],
    power: p,
    spin: sp,
    control: c,
    comfort,
    idealLaunchAngleDeg: Math.round(Math.max(2.5, Math.min(12, launch)) * 10) / 10,
    idealSwingPathDeg: Math.round(Math.max(8, Math.min(38, swingPath)) * 10) / 10,
    style,
  };
}

export function snapshotRackets(): { rackets: RacketProfile[]; meta: RacketCatalogMeta } {
  const rackets = (snapshot.rackets as RacketProfile[]).map((r) => ({
    ...r,
    model: resolveDisplayModel(r.slug, r.model),
  }));
  return {
    rackets,
    meta: {
      source: snapshot.source,
      version: snapshot.version,
      updated: snapshot.updated,
      count: snapshot.count,
      live: false,
    },
  };
}

export async function loadRackets(opts?: {
  signal?: AbortSignal;
}): Promise<{ rackets: RacketProfile[]; meta: RacketCatalogMeta }> {
  try {
    const res = await fetch(RACQIX_URL, {
      signal: opts?.signal,
      next: { revalidate: 60 * 60 * 24 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Racqix HTTP ${res.status}`);
    const data = (await res.json()) as {
      dataset_version: string;
      last_updated: string;
      source: string;
      racquets: RacqixRow[];
    };
    const rackets = data.racquets
      .map(enrichRacket)
      .filter((r): r is RacketProfile => r != null)
      .sort((a, b) => b.year - a.year || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));

    if (rackets.length < 100) throw new Error("Racqix payload too small");

    return {
      rackets,
      meta: {
        source: data.source,
        version: data.dataset_version,
        updated: data.last_updated,
        count: rackets.length,
        live: true,
      },
    };
  } catch {
    return snapshotRackets();
  }
}
