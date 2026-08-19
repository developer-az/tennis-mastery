"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAuthStore } from "@/store/authStore";
import { useGearStore } from "@/store/gearStore";
import { usePlayerStore } from "@/store/playerStore";

const SYNC_DEBOUNCE_MS = 2500;

/**
 * Keeps Supabase session fresh and debounces cloud sync when profile/gear change.
 * No-op when Supabase env vars are missing — app stays local-first.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setUser = useAuthStore((s) => s.setUser);
  const runLoginSync = useAuthStore((s) => s.runLoginSync);
  const syncNow = useAuthStore((s) => s.syncNow);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setInitialized(true);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setInitialized(true);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;

      if (event === "INITIAL_SESSION") {
        if (u) await runLoginSync(u);
        else setUser(null, null);
        setInitialized(true);
        return;
      }

      if (event === "SIGNED_IN" && u) {
        await runLoginSync(u);
      } else if (event === "SIGNED_OUT") {
        setUser(null, null);
      } else if (event === "TOKEN_REFRESHED" && u) {
        setUser(u, useAuthStore.getState().account);
      }
    });

    return () => subscription.unsubscribe();
  }, [runLoginSync, setInitialized, setUser]);

  useEffect(() => {
    if (!user) return;

    const scheduleSync = () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        void syncNow();
      }, SYNC_DEBOUNCE_MS);
    };

    const unsubPlayer = usePlayerStore.subscribe(scheduleSync);
    const unsubGear = useGearStore.subscribe(scheduleSync);

    return () => {
      unsubPlayer();
      unsubGear();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [user, syncNow]);

  return children;
}
