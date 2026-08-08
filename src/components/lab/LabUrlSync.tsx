"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PLAYERS } from "@/data/players";
import { useCoachStore } from "@/store/coachStore";
import type { StrokeType } from "@/types/biomechanics";

const STROKES = new Set<StrokeType>(["forehand", "backhand", "serve", "slice", "volley"]);

/** Hydrate lab state from URL and keep the query string in sync. */
export function LabUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const playerId = useCoachStore((s) => s.playerId);
  const stroke = useCoachStore((s) => s.stroke);
  const setPlayer = useCoachStore((s) => s.setPlayer);
  const setStroke = useCoachStore((s) => s.setStroke);

  // Hydrate once from URL on mount / when search changes externally
  useEffect(() => {
    const p = searchParams.get("player");
    const s = searchParams.get("stroke") as StrokeType | null;
    if (p && PLAYERS.some((pl) => pl.id === p) && p !== playerId) {
      setPlayer(p);
    }
    if (s && STROKES.has(s) && s !== stroke) {
      setStroke(s);
    }
    // Intentionally only react to searchParams — store writes sync the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Mirror store → URL (shareable deep links)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("player", playerId);
    params.set("stroke", stroke);
    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [playerId, stroke, pathname, router, searchParams]);

  return null;
}
