"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
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
  const readyToMirror = useRef(false);
  const skipNextHydrate = useRef(false);

  // Synchronously apply window URL before paint / before any mirror write.
  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = useCoachStore.getState();
    const p = params.get("player");
    const s = params.get("stroke") as StrokeType | null;
    if (p && PLAYERS.some((pl) => pl.id === p) && p !== state.playerId) {
      state.setPlayer(p);
    }
    if (s && STROKES.has(s) && s !== state.stroke) {
      state.setStroke(s);
    }
    readyToMirror.current = true;
  }, []);

  // External navigations (back/forward, pasted URL while mounted)
  useEffect(() => {
    if (skipNextHydrate.current) {
      skipNextHydrate.current = false;
      return;
    }
    const state = useCoachStore.getState();
    const p = searchParams.get("player");
    const s = searchParams.get("stroke") as StrokeType | null;
    if (p && PLAYERS.some((pl) => pl.id === p) && p !== state.playerId) {
      state.setPlayer(p);
    }
    if (s && STROKES.has(s) && s !== state.stroke) {
      state.setStroke(s);
    }
  }, [searchParams]);

  // Mirror store → URL only after mount hydrate
  useEffect(() => {
    if (!readyToMirror.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("player") === playerId && params.get("stroke") === stroke) return;
    params.set("player", playerId);
    params.set("stroke", stroke);
    skipNextHydrate.current = true;
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [playerId, stroke, pathname, router]);

  return null;
}
