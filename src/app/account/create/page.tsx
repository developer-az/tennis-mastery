"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/auth/validation";
import { useAuthStore } from "@/store/authStore";

export default function CreateAccountPage() {
  const router = useRouter();
  const runLoginSync = useAuthStore((s) => s.runLoginSync);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cloudReady = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const nextErrors = {
      firstName: validateName(firstName, "First name"),
      lastName: validateName(lastName, "Last name"),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordMatch(password, confirm),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const supabase = createClient();
    if (!supabase) {
      setFormError("Cloud accounts are not configured on this deployment.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          newsletter_opt_in: newsletter,
        },
      },
    });
    setLoading(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    if (data.session?.user) {
      await runLoginSync(data.session.user);
      router.push("/account");
      router.refresh();
      return;
    }

    setSuccess("Check your email to confirm your account, then sign in.");
  }

  return (
    <AccountShell
      title="Create your account"
      subtitle="By creating an account you can view and sync your court — faster return visits and your full bag history."
      alternate={{
        prompt: "Already have an account?",
        href: "/account/login",
        label: "Sign in",
      }}
    >
      {!cloudReady ? <CloudUnavailableBanner /> : null}

      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
        Register
      </h2>

      {formError ? <AuthAlert message={formError} /> : null}
      {success ? <AuthAlert message={success} tone="info" /> : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="First name"
            value={firstName}
            onChange={setFirstName}
            error={errors.firstName}
            autoComplete="given-name"
            required
          />
          <AuthField
            label="Last name"
            value={lastName}
            onChange={setLastName}
            error={errors.lastName}
            autoComplete="family-name"
            required
          />
        </div>
        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoComplete="email"
          required
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={errors.password}
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirm}
        />

        <AuthCheckbox
          label="Email me gear tips, lab updates, and Strokeform news (optional)."
          checked={newsletter}
          onChange={setNewsletter}
        />

        <AuthSubmit loading={loading}>Create account</AuthSubmit>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-[var(--muted)]">
        Prefer not to register?{" "}
        <Link href="/you" className="sf-text-link">
          Continue without an account
        </Link>
      </p>
    </AccountShell>
  );
}
