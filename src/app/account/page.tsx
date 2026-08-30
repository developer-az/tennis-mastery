"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SyncStatusPill } from "@/components/auth/SyncStatusPill";
import { CourtLoading } from "@/components/ui/CourtState";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authDisplayLabel, useAuthStore } from "@/store/authStore";
import { usePlayerStore } from "@/store/playerStore";
import { hasAnyGear, setupSummary, useGearStore } from "@/store/gearStore";
import { profileLooksStarted } from "@/lib/player/onboarding";

export default function AccountDashboardPage() {
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const account = useAuthStore((s) => s.account);
  const syncNow = useAuthStore((s) => s.syncNow);
  const signOut = useAuthStore((s) => s.signOut);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);

  const profile = usePlayerStore((s) => s.profile);
  const onboardingComplete = usePlayerStore((s) => s.onboardingComplete);
  const setup = useGearStore((s) => s.setup);

  const cloudReady = isSupabaseConfigured();

  useEffect(() => {
    if (!initialized) return;
    if (cloudReady && !user) {
      router.replace("/account/login?next=/account");
    }
  }, [initialized, cloudReady, user, router]);

  if (!initialized) {
    return (
      <div className="sf-page">
        <CourtLoading label="Loading account…" detail="Checking sign-in and sync status." />
      </div>
    );
  }

  if (cloudReady && !user) {
    return null;
  }

  const label = authDisplayLabel(account, user);
  const started = profileLooksStarted(profile) || onboardingComplete;
  const bagLine = setupSummary(setup);

  return (
    <div className="sf-page max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div>
          <p className="sf-kicker">Your account</p>
          <h1 className="sf-page-title mt-2">
            {user ? `Hi, ${label}` : "Local court"}
          </h1>
          {account?.email || user?.email ? (
            <p className="mt-2 text-sm text-[var(--muted)]">{account?.email ?? user?.email}</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Data on this device — sign in when you want your court synced.
            </p>
          )}
        </div>
        <SyncStatusPill />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="sf-panel p-5">
          <p className="sf-label">Your court</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {profile.displayName.trim() || "Unnamed player"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {started
              ? `${profile.sessions.length} sessions · ${profile.decisions.length} logged changes`
              : "Setup not finished — complete your court on the You tab."}
          </p>
          <Link href="/you" className="sf-text-link mt-4 inline-block text-sm">
            Open You →
          </Link>
        </section>

        <section className="sf-panel p-5">
          <p className="sf-label">My bag</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{bagLine}</p>
          <Link href="/gear" className="sf-text-link mt-4 inline-block text-sm">
            {hasAnyGear(setup) ? "Tune gear →" : "Build bag →"}
          </Link>
        </section>
      </div>

      {user ? (
        <section className="sf-panel mt-4 p-5">
          <p className="sf-label">Cloud sync</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Profile and bag auto-sync when you edit. Last push:{" "}
            {lastSyncedAt
              ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(lastSyncedAt))
              : "not yet"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncStatus === "syncing"}
              className="sf-btn sf-btn-secondary text-sm"
            >
              {syncStatus === "syncing" ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="sf-btn sf-btn-ghost text-sm"
            >
              Sign out
            </button>
          </div>
        </section>
      ) : (
        <section className="sf-panel mt-4 p-5">
          <p className="sf-label">Sign in for sync</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Create an account to carry your bag, sessions, and one-lever history across devices.
            Until then, everything stays on this browser.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/account/login" className="sf-btn sf-btn-primary text-sm">
              Sign in
            </Link>
            <Link href="/account/create" className="sf-btn sf-btn-secondary text-sm">
              Create account
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
