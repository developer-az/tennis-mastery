"use client";

import { useAuthStore } from "@/store/authStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function SyncStatusPill({ compact }: { compact?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const syncError = useAuthStore((s) => s.syncError);

  if (!isSupabaseConfigured()) {
    if (compact) return null;
    return (
      <span className="text-[11px] tracking-[0.06em] text-[var(--muted)] uppercase">Local only</span>
    );
  }

  if (!user) return null;

  const label =
    syncStatus === "syncing"
      ? "Syncing…"
      : syncStatus === "error"
        ? "Sync issue"
        : syncStatus === "synced"
          ? compact
            ? "Synced"
            : `Synced ${formatWhen(lastSyncedAt)}`
          : "Signed in";

  const tone =
    syncStatus === "error"
      ? "text-[var(--danger)]"
      : syncStatus === "syncing"
        ? "text-[var(--sky)]"
        : "text-[var(--muted)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.04em] uppercase ${tone}`}
      title={syncError ?? undefined}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          syncStatus === "error"
            ? "bg-[var(--danger)]"
            : syncStatus === "syncing"
              ? "animate-pulse bg-[var(--sky)]"
              : "bg-[var(--accent)]"
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}
