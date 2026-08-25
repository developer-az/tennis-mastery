"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { EquipmentThumb } from "./EquipmentThumb";

/** Horizontal chip rail with touch + drag scroll. */
export function ChipRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    if (d.moved) {
      el.scrollLeft = d.left - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    const d = drag.current;
    drag.current = null;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    // Suppress click on chips after a drag
    if (d?.moved) {
      e.preventDefault();
    }
  }, []);

  return (
    <div className="min-w-0">
      <p className="sf-label mb-2">{label}</p>
      <div
        ref={rowRef}
        className="sf-chip-row"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}

export function AisleChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      className="sf-chip"
      data-active={active ? "true" : "false"}
      onClick={onClick}
      style={
        active && color
          ? { background: color, borderColor: color, color: "var(--accent-fg)" }
          : color && !active
            ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)` }
            : undefined
      }
    >
      {label}
    </button>
  );
}

export function CatalogAisle({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">{title}</h3>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="sf-text-link shrink-0">
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="sf-aisle">{children}</div>
    </section>
  );
}

export function FeelBars({
  scores,
}: {
  scores: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {scores.map((s) => (
        <div key={s.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-1 text-[10px] text-[var(--muted)]">
            <span className="truncate">{s.label}</span>
            <span className="tabular-nums">{s.value}</span>
          </div>
          <div className="sf-feel-track mt-1">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, Math.min(100, s.value))}%`, background: s.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductCard({
  image,
  alt,
  brand,
  name,
  badge,
  meta,
  scores,
  saved,
  selected,
  onSelect,
  onSave,
  saveLabel = "Add to bag",
  savedLabel = "In bag",
  compact = false,
  accent,
}: {
  image: string;
  alt: string;
  brand: string;
  name: string;
  badge?: string;
  meta?: string;
  scores: { label: string; value: number; color: string }[];
  saved?: boolean;
  selected?: boolean;
  onSelect: () => void;
  onSave?: () => void;
  saveLabel?: string;
  savedLabel?: string;
  compact?: boolean;
  /** Optional brand accent for left rail / chip */
  accent?: string;
}) {
  return (
    <article
      className={`sf-product-card ${compact ? "w-[12.5rem] shrink-0 snap-start" : "w-full"}`}
      data-active={selected ? "true" : "false"}
      style={
        accent
          ? { boxShadow: selected ? undefined : `inset 3px 0 0 ${accent}` }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full min-w-0 flex-col text-left"
        aria-pressed={selected}
        aria-label={alt}
      >
        <span
          className={`sf-thumb-well relative flex w-full items-center justify-center ${compact ? "h-28" : "h-36"}`}
          style={
            accent
              ? {
                  background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 18%, var(--bg-scene)) 0%, var(--bg-scene) 70%)`,
                }
              : undefined
          }
        >
          <EquipmentThumb src={image} alt="" size={compact ? "sm" : "md"} />
        </span>
        <span className="flex min-w-0 flex-col gap-1.5 p-3">
          <span
            className="block text-[10px] font-bold tracking-[0.12em] uppercase"
            style={{ color: accent ?? "var(--muted)" }}
          >
            {brand}
          </span>
          <span
            className="block min-h-[2.5rem] font-[family-name:var(--font-display)] text-sm leading-snug tracking-tight text-[var(--foreground)]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={name}
          >
            {name}
          </span>
          {(badge || meta) && (
            <span className="flex flex-wrap items-center gap-1.5">
              {badge ? (
                <span
                  className="w-fit rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{
                    color: accent ?? "var(--accent)",
                    background: accent
                      ? `color-mix(in srgb, ${accent} 18%, transparent)`
                      : "var(--accent-dim)",
                  }}
                >
                  {badge}
                </span>
              ) : null}
              {meta ? (
                <span className="text-[10px] text-[var(--muted)]">{meta}</span>
              ) : null}
            </span>
          )}
          <FeelBars scores={scores} />
        </span>
      </button>
      {onSave ? (
        <div className="border-t border-[var(--line)] px-3 py-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="w-full rounded-full py-2 text-xs font-semibold"
            style={{
              background: saved ? "var(--accent-dim)" : "var(--accent)",
              color: saved ? "var(--accent)" : "var(--accent-ink)",
            }}
          >
            {saved ? savedLabel : saveLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="search"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        className="sf-input"
      />
    </label>
  );
}

/** Active filter chips + Clear — used when filter panels are collapsed on small screens. */
export function ActiveFilterChips({
  chips,
  onClear,
}: {
  chips: { id: string; label: string; onRemove: () => void }[];
  onClear: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 md:hidden">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <span aria-hidden className="text-[var(--muted)]">
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        Clear
      </button>
    </div>
  );
}

/** More-filters panel: open by default from md up. */
export function MoreFilters({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details
      className="text-sm"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-[var(--muted)]">More filters</summary>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
    </details>
  );
}
