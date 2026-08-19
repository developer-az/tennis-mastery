"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AccountShell,
  CloudUnavailableBanner,
} from "@/components/auth/AccountShell";
import {
  AuthAlert,
  AuthCheckbox,
  AuthField,
  AuthSubmit,
  PasswordField,
} from "@/components/auth/AuthFields";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateEmail } from "@/lib/auth/validation";
import { useAuthStore } from "@/store/authStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("next") ?? "/account";
  const callbackError = searchParams.get("error") === "auth_callback";

  const rememberMe = useAuthStore((s) => s.rememberMe);
  const setRememberMe = useAuthStore((s) => s.setRememberMe);
  const runLoginSync = useAuthStore((s) => s.runLoginSync);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(
    callbackError ? "Sign-in link expired. Try again." : null,
  );
  const [loading, setLoading] = useState(false);

  const cloudReady = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const err = validateEmail(email);
    setEmailError(err);
    if (err || !password) {
      if (!password) setFormError("Password is required.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setFormError("Cloud sign-in is not configured on this deployment.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      setFormError(
        error.message.includes("Invalid login")
          ? "Email or password is incorrect."
          : error.message,
      );
      return;
    }

    if (data.user) {
      await runLoginSync(data.user);
      router.push(redirect);
      router.refresh();
    }
  }

  return (
    <AccountShell
      title="Sign in to your court"
      subtitle="Track your bag, sessions, and one-lever changes — the Tennis Warehouse way: one account, your gear history."
      alternate={{
        prompt: "Don't have an account?",
        href: "/account/create",
        label: "Create one",
      }}
    >
      {!cloudReady ? <CloudUnavailableBanner /> : null}

      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
        Sign in
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Or{" "}
        <Link href="/you" className="sf-text-link">
          continue as guest
        </Link>{" "}
        — your setup stays on this device.
      </p>

      {formError ? <AuthAlert message={formError} /> : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setEmailError(null);
          }}
          error={emailError}
          autoComplete="email"
          required
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <AuthCheckbox
            label="Remember me"
            checked={rememberMe}
            onChange={setRememberMe}
          />
          <Link href="/account/forgot-password" className="sf-text-link text-xs">
            Forgot password?
          </Link>
        </div>

        <AuthSubmit loading={loading}>Sign in</AuthSubmit>
      </form>
    </AccountShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-16 text-sm text-[var(--muted)]">Loading sign in…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
