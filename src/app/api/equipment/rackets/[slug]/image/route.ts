import { loadRackets } from "@/lib/equipment/rackets";
import { racketPortraitSvg } from "@/lib/equipment/media/portraits";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const { rackets } = await loadRackets();
  const racket = rackets.find((r) => r.slug === slug);
  if (!racket) {
    return new Response("Not found", { status: 404 });
  }
  const svg = racketPortraitSvg(racket);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
