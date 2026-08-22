import { NextResponse } from "next/server";
import { loadRackets } from "@/lib/equipment/rackets";
import { STRINGS } from "@/data/equipment/strings";
import { analyzeFrame, analyzeString } from "@/lib/equipment/strokeformIntel";

/**
 * Public intelligence index — documents Strokeform's multi-source analysis
 * and returns sample frame/string intel for transparency.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("racket");
  const stringId = searchParams.get("string");

  const { rackets, meta } = await loadRackets();

  const payload: Record<string, unknown> = {
    product: "Strokeform Intelligence",
    version: "2026.1",
    method:
      "Aggregates Racqix specs (+ expert scores when present), tour usage lists, Tennis Warehouse media matches, and Strokeform physics / quirk engines. Archetypes and skill spans are Strokeform-specific — not retailer blurbs.",
    sources: [
      "racqix-specs",
      "racqix-expert",
      "tour-usage",
      "strokeform-physics",
      "strokeform-quirks",
      "strokeform-string-lab",
      "tennis-warehouse-media",
    ],
    catalog: {
      rackets: meta.count,
      live: meta.live,
      racketSource: meta.source,
      strings: STRINGS.length,
    },
  };

  if (slug) {
    const racket = rackets.find((r) => r.slug === slug);
    if (racket) payload.frame = analyzeFrame(racket, { liveCatalog: meta.live });
  }

  if (stringId) {
    const str = STRINGS.find((s) => s.id === stringId);
    if (str) payload.string = analyzeString(str);
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
