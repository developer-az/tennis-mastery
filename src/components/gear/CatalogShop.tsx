"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { EquipmentThumb } from "./EquipmentThumb";

const AXIS_LOCK_PX = 10;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  axis: "undecided" | "x" | "y";
  moved: boolean;
};

/**
 * Horizontal rails that still let the page scroll.
 * Wait until the gesture is clearly sideways before capturing;
 * a downward swipe on a card or chip row scrolls the page.
 */
export function useAxisLockedHScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.scrollLeft,
      axis: "undecided",
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const d = drag.current;
    if (!el || !d || d.pointerId !== e.pointerId) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.axis === "undecided") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null;
        return;
      }
      d.axis = "x";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (d.axis !== "x") return;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.startLeft - dx;
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const d = drag.current;
    drag.current = null;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (d?.moved && d.axis === "x") suppressClick.current = true;
  }, []);

  const onClickCapture = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  };
}

/** Shared horizontal scroller for chip rows and product aisles. */
export function HScroll({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const h = useAxisLockedHScroll();
  return (
    <div className={className} {...rest} {...h}>
      {children}
    </div>
  );
}

export function ChipRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="sf-label mb-2">{label}</p>
      <HScroll className="sf-chip-row">{children}</HScroll>
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
      <HScroll className="sf-aisle">{children}</HScroll>
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
              style={{
                width: `${Math.max(4, Math.min(100, s.value))}%`,
                background: s.color,
                boxShadow: `0 0 8px color-mix(in srgb, ${s.color} 45%, transparent)`,
              }}
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
            className={`sf-btn w-full ${saved ? "sf-btn-secondary" : "sf-btn-primary"}`}
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
          className="sf-chip"
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
        className="sf-btn sf-btn-ghost"
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
      <summary className="sf-label cursor-pointer min-h-11 py-2">More filters</summary>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
    </details>
  );
}
