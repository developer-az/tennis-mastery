"use client";

import { useState } from "react";
import Link from "next/link";
import { AccountShell, CloudUnavailableBanner } from "@/components/auth/AccountShell";
import { AuthAlert, AuthField, AuthSubmit } from "@/components/auth/AuthFields";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateEmail } from "@/lib/auth/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    const supabase = createClient();
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/account`,
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("If that email is registered, you'll receive a reset link shortly.");
  }

  return (
    <AccountShell
      title="Reset your password"
      subtitle="We'll email a secure link — same flow you'd expect from a pro shop account."
      alternate={{
        prompt: "Remember your password?",
        href: "/account/login",
        label: "Back to sign in",
      }}
    >
      {!isSupabaseConfigured() ? <CloudUnavailableBanner /> : null}

      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
        Forgot password
      </h2>

      {message ? (
        <AuthAlert message={message} tone={message.includes("receive") ? "info" : "error"} />
      ) : null}

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
        <AuthSubmit loading={loading}>Send reset link</AuthSubmit>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        <Link href="/account/login" className="sf-text-link">
          ← Return to sign in
        </Link>
      </p>
    </AccountShell>
  );
}
