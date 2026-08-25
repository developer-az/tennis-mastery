"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PLAYERS } from "@/data/players";
import { useCoachStore } from "@/store/coachStore";
import type { StrokeType } from "@/types/biomechanics";

const STROKES = new Set<StrokeType>(["forehand", "backhand", "serve", "slice", "volley"]);

function readParam(searchParams: URLSearchParams, key: string): string | null {
  const fromHook = searchParams.get(key);
  if (fromHook) return fromHook;
  // First client paint can briefly miss the query string — fall back to location.
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

/** Hydrate lab state from URL and keep the query string in sync. */
export function LabUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const playerId = useCoachStore((s) => s.playerId);
  const stroke = useCoachStore((s) => s.stroke);
  const hydrated = useRef(false);

  // Hydrate from URL first — never let the store default overwrite a deep link.
  useEffect(() => {
    const state = useCoachStore.getState();
    const p = readParam(searchParams, "player");
    const s = readParam(searchParams, "stroke") as StrokeType | null;
    if (p && PLAYERS.some((pl) => pl.id === p) && p !== state.playerId) {
      state.setPlayer(p);
    }
    if (s && STROKES.has(s) && s !== state.stroke) {
      state.setStroke(s);
    }
    hydrated.current = true;
  }, [searchParams]);

  // Mirror store → URL only after hydrate (shareable deep links)
  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : searchParams.toString(),
    );
    if (params.get("player") === playerId && params.get("stroke") === stroke) return;
    params.set("player", playerId);
    params.set("stroke", stroke);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [playerId, stroke, pathname, router, searchParams]);

  return null;
}
