"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { profileLooksStarted } from "@/lib/player/onboarding";

export function HomeHeroCtas() {
  const profile = usePlayerStore((s) => s.profile);
  const hydrated = usePlayerStore((s) => s.hydrated);
  const setHydrated = usePlayerStore((s) => s.setHydrated);
  const onboardingComplete = usePlayerStore((s) => s.onboardingComplete);

  useEffect(() => {
    if (usePlayerStore.persist.hasHydrated()) setHydrated(true);
  }, [setHydrated]);

  const returning = hydrated && (onboardingComplete || profileLooksStarted(profile));

  return (
    <div className="sf-rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "0.28s" }}>
      <Link href="/you" className="sf-btn sf-btn-primary">
        {returning ? "Open your court" : "Start your setup"}
      </Link>
      <Link href="/lab" className="sf-btn sf-btn-secondary">
        Open form lab
      </Link>
      <Link href="/gear" className="sf-btn sf-btn-ghost">
        Gear intelligence
      </Link>
    </div>
  );
}
