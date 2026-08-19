import type { SupabaseClient } from "@supabase/supabase-js";
import type { MySetup } from "@/store/gearStore";
import type { PlayerProfile } from "@/types/playerProfile";
import { emptyProfile } from "@/types/playerProfile";

export interface AccountProfile {
  firstName: string;
  lastName: string;
  email: string;
  newsletterOptIn: boolean;
}

export interface CloudSnapshot {
  player_profile: PlayerProfile;
  gear_setup: MySetup;
  onboarding_complete: boolean;
  onboarding_step: number;
  updated_at: string;
}

export interface LocalGameState {
  profile: PlayerProfile;
  setup: MySetup;
  onboardingComplete: boolean;
  onboardingStep: number;
}

export function displayNameFromAccount(profile: AccountProfile): string {
  const full = `${profile.firstName} ${profile.lastName}`.trim();
  return full || profile.email.split("@")[0] || "Player";
}

export async function fetchAccountProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, newsletter_opt_in")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    email: data.email ?? "",
    newsletterOptIn: Boolean(data.newsletter_opt_in),
  };
}

export async function fetchCloudSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<CloudSnapshot | null> {
  const { data, error } = await supabase
    .from("player_snapshots")
    .select("player_profile, gear_setup, onboarding_complete, onboarding_step, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    player_profile: (data.player_profile as PlayerProfile) ?? emptyProfile(),
    gear_setup: data.gear_setup as MySetup,
    onboarding_complete: Boolean(data.onboarding_complete),
    onboarding_step: Number(data.onboarding_step) || 0,
    updated_at: data.updated_at ?? new Date(0).toISOString(),
  };
}

/** Pick the fresher local vs cloud snapshot (by updated_at). */
export function mergeGameState(local: LocalGameState, cloud: CloudSnapshot | null): LocalGameState {
  if (!cloud) return local;

  const localTs = Date.parse(local.profile.updatedAt || "0");
  const cloudTs = Date.parse(cloud.updated_at || "0");

  if (cloudTs > localTs + 500) {
    const cloudProfile = { ...emptyProfile(), ...cloud.player_profile };
    const hasCloudGear =
      cloud.gear_setup &&
      typeof cloud.gear_setup === "object" &&
      (cloud.gear_setup as MySetup).racketSlug != null;

    return {
      profile: {
        ...cloudProfile,
        displayName:
          cloudProfile.displayName?.trim() || local.profile.displayName || "",
      },
      setup: hasCloudGear ? (cloud.gear_setup as MySetup) : local.setup,
      onboardingComplete: cloud.onboarding_complete,
      onboardingStep: cloud.onboarding_step,
    };
  }

  return local;
}

export async function pushCloudSnapshot(
  supabase: SupabaseClient,
  userId: string,
  state: LocalGameState,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updatedAt = new Date().toISOString();
  const profile = { ...state.profile, updatedAt };

  const { error } = await supabase.from("player_snapshots").upsert(
    {
      user_id: userId,
      player_profile: profile,
      gear_setup: state.setup,
      onboarding_complete: state.onboardingComplete,
      onboarding_step: state.onboardingStep,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function syncAfterLogin(
  supabase: SupabaseClient,
  userId: string,
  local: LocalGameState,
): Promise<{ merged: LocalGameState; pushed: boolean }> {
  const cloud = await fetchCloudSnapshot(supabase, userId);
  const merged = mergeGameState(local, cloud);

  const localTs = Date.parse(local.profile.updatedAt || "0");
  const cloudTs = cloud ? Date.parse(cloud.updated_at || "0") : 0;
  const shouldPush = !cloud || localTs >= cloudTs;

  if (shouldPush) {
    await pushCloudSnapshot(supabase, userId, merged);
    return { merged, pushed: true };
  }

  return { merged, pushed: false };
}
