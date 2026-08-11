import type { LeadTapeZone } from "@/types/equipment";
import { LEAD_TAPE_MASS_PRESETS, LEAD_TAPE_ZONES } from "@/lib/equipment/leadTape";

export async function GET() {
  return Response.json({
    meta: {
      source: "Strokeform lead-tape coaching model",
      note: "Masses and zone effects are coaching-grade estimates, not lab certificates.",
    },
    massPresetsG: [...LEAD_TAPE_MASS_PRESETS],
    zones: (Object.keys(LEAD_TAPE_ZONES) as LeadTapeZone[]).map((id) => ({
      id,
      ...LEAD_TAPE_ZONES[id],
    })),
  });
}
