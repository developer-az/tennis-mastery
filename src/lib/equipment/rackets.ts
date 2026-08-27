import type { RacketProfile, RacketCatalogMeta } from "@/types/equipment";
import snapshot from "@/data/equipment/rackets.snapshot.json";
import { applySpecPhysics, computeFrameSpecPhysics, parseExpertScores } from "@/lib/equipment/playability";

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

const JUNIOR_RE = /\b(jr|junior|kids?)\b|-(19|21|23|25|26)(-|$)/i;

export function enrichRacket(r: RacqixRow): RacketProfile | null {
  const year = yearOf(r);
  if (year < 2019 || !r.weight || r.weight < 255) return null;
  const name = `${r.model} ${r.slug}`;
  if (JUNIOR_RE.test(name)) return null;

  const summary = r.summaries_expert_en || "";
  const physics = computeFrameSpecPhysics(
    {
      weightG: r.weight,
      swingweight: r.swingweight,
      stiffnessRa: r.ra,
      balanceMm: r.balance_mm,
      headSizeSqIn: r.head_size,
      stringPattern: r.string_pattern,
    },
    parseExpertScores(summary),
  );

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
    power: physics.power,
    spin: physics.spin,
    control: physics.control,
    comfort: physics.comfort,
    idealLaunchAngleDeg: physics.launchDeg,
    idealSwingPathDeg: physics.pathDeg,
    style: physics.style,
  };
}

export function snapshotRackets(): { rackets: RacketProfile[]; meta: RacketCatalogMeta } {
  const rackets = (snapshot.rackets as RacketProfile[]).map((r) =>
    applySpecPhysics({
      ...r,
      model: resolveDisplayModel(r.slug, r.model),
    }),
  );
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
