"use client";

import { useId } from "react";

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  required,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const errId = `${id}-error`;

  return (
    <div className="sf-field">
      <label htmlFor={id} className="sf-field-label">
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : hint ? `${id}-hint` : undefined}
        className={`sf-input ${error ? "sf-input-error" : ""}`}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="sf-field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="sf-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete = "current-password",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  autoComplete?: string;
}) {
  const id = useId();
  const errId = `${id}-error`;

  return (
    <div className="sf-field">
      <label htmlFor={id} className="sf-field-label">
        {label}
        <span className="text-[var(--danger)]"> *</span>
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
        className={`sf-input ${error ? "sf-input-error" : ""}`}
      />
      {error ? (
        <p id={errId} className="sf-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthCheckbox({
  label,
  checked,
  onChange,
  id: customId,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  const autoId = useId();
  const id = customId ?? autoId;

  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-[var(--muted)]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="leading-relaxed">{label}</span>
    </label>
  );
}

export function AuthSubmit({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full">
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function AuthAlert({ message, tone = "error" }: { message: string; tone?: "error" | "info" }) {
  return (
    <div
      className={`mb-5 px-4 py-3 text-sm ${
        tone === "error"
          ? "border border-[var(--danger)]/35 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--foreground)]"
          : "border border-[var(--line)] bg-[var(--overlay-hover)] text-[var(--muted)]"
      }`}
      role="alert"
    >
      {message}
    </div>
  );
}
