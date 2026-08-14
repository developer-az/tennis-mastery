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
    <div
      className="mt-8 flex flex-wrap gap-3"
      style={{ animation: "rise 0.9s ease-out 0.32s both" }}
    >
      <Link
        href="/you"
        className="rounded-md bg-[var(--accent)] px-6 py-3 font-medium text-[#0b1a14] transition hover:brightness-110"
      >
        {returning ? "Your court" : "Set up your game"}
      </Link>
      <Link
        href="/lab"
        className="rounded-md px-6 py-3 text-[var(--foreground)] transition hover:bg-white/5"
        style={{ boxShadow: "0 0 0 1px var(--line)" }}
      >
        Open lab
      </Link>
    </div>
  );
}
