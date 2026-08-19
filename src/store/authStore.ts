"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  type AccountProfile,
  displayNameFromAccount,
  fetchAccountProfile,
  pushCloudSnapshot,
  syncAfterLogin,
} from "@/lib/auth/sync";
import { useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface AuthState {
  initialized: boolean;
  user: User | null;
  account: AccountProfile | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  rememberMe: boolean;
  setInitialized: (v: boolean) => void;
  setUser: (user: User | null, account?: AccountProfile | null) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setRememberMe: (v: boolean) => void;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  runLoginSync: (user: User) => Promise<void>;
}

function readRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem("strokeform-remember-me");
    return v !== "false";
  } catch {
    return true;
  }
}

function writeRememberMe(v: boolean) {
  try {
    localStorage.setItem("strokeform-remember-me", v ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  user: null,
  account: null,
  syncStatus: "idle",
  syncError: null,
  lastSyncedAt: null,
  rememberMe: readRememberMe(),
  setInitialized: (v) => set({ initialized: v }),
  setUser: (user, account = null) => set({ user, account }),
  setSyncStatus: (syncStatus, syncError = null) => set({ syncStatus, syncError }),
  setRememberMe: (v) => {
    writeRememberMe(v);
    set({ rememberMe: v });
  },
  signOut: async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    set({
      user: null,
      account: null,
      syncStatus: "idle",
      syncError: null,
      lastSyncedAt: null,
    });
  },
  syncNow: async () => {
    const { user } = get();
    const supabase = createClient();
    if (!supabase || !user) {
      set({ syncStatus: "offline" });
      return;
    }

    set({ syncStatus: "syncing", syncError: null });

    const player = usePlayerStore.getState();
    const gear = useGearStore.getState();
    const result = await pushCloudSnapshot(supabase, user.id, {
      profile: player.profile,
      setup: gear.setup,
      onboardingComplete: player.onboardingComplete,
      onboardingStep: player.onboardingStep,
    });

    if (!result.ok) {
      set({ syncStatus: "error", syncError: result.error });
      return;
    }

    set({
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
    });
  },
  runLoginSync: async (user) => {
    const supabase = createClient();
    if (!supabase) return;

    set({ syncStatus: "syncing" });

    const account = (await fetchAccountProfile(supabase, user.id)) ?? {
      firstName: (user.user_metadata?.first_name as string) ?? "",
      lastName: (user.user_metadata?.last_name as string) ?? "",
      email: user.email ?? "",
      newsletterOptIn: Boolean(user.user_metadata?.newsletter_opt_in),
    };

    const player = usePlayerStore.getState();
    const gear = useGearStore.getState();

    const { merged } = await syncAfterLogin(supabase, user.id, {
      profile: player.profile,
      setup: gear.setup,
      onboardingComplete: player.onboardingComplete,
      onboardingStep: player.onboardingStep,
    });

    const displayName =
      merged.profile.displayName.trim() || displayNameFromAccount(account);

    usePlayerStore.setState({
      profile: { ...merged.profile, displayName },
      onboardingComplete: merged.onboardingComplete,
      onboardingStep: merged.onboardingStep,
    });
    useGearStore.setState({ setup: merged.setup });

    set({
      user,
      account,
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
    });
  },
}));

export function authDisplayLabel(
  account: AccountProfile | null,
  user: User | null,
): string {
  if (account) {
    const name = `${account.firstName} ${account.lastName}`.trim();
    if (name) return name.split(" ")[0]!;
    return account.email.split("@")[0] ?? "Account";
  }
  if (user?.email) return user.email.split("@")[0] ?? "Account";
  return "Account";
}
