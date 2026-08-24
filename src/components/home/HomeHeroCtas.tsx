"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { profileLooksStarted } from "@/lib/player/onboarding";

export function HomeHeroCtas() {
  const profile = usePlayerStore((s) => s.profile);
  const hydrated = usePlayerStore((s) => s.hydrated);
  const setHydrated = usePlayerStore((s) => s.setHydrated);

  useEffect(() => {
    if (usePlayerStore.persist.hasHydrated()) setHydrated(true);
  }, [setHydrated]);

  const returning = hydrated && profileLooksStarted(profile);

  return (
    <div className="sf-rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "0.28s" }}>
      <Link href="/gear?tab=rackets" className="sf-btn sf-btn-primary">
        Browse rackets
      </Link>
      <Link href="/you" className="sf-btn sf-btn-secondary">
        {returning ? "Open your court" : "Your court"}
      </Link>
      <Link href="/lab" className="sf-btn sf-btn-ghost">
        Form lab
      </Link>
    </div>
  );
}
