"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { matchesEquipmentSearch, searchMatchScore } from "@/lib/equipment/search";
import { useGearStore } from "@/store/gearStore";

export type PickerKind = "racket" | "string" | "grip";

export function saveRacketToBag(r: RacketProfile) {
  useGearStore.getState().setRacket(r.slug, `${r.brand} ${r.model}`, {
    idealLaunchAngleDeg: r.idealLaunchAngleDeg,
    idealSwingPathDeg: r.idealSwingPathDeg,
    power: r.power,
    spin: r.spin,
    control: r.control,
    comfort: r.comfort,
    weightG: r.weightG,
    swingweight: r.swingweight,
    balanceMm: r.balanceMm,
  });
}

export function saveStringToBag(s: StringProfile) {
  useGearStore.getState().setString(s.id, `${s.brand} ${s.name}`, {
    tensionLbs: s.recommendedTensionLbs,
    gaugeMm: s.gaugesMm[0],
    power: s.power,
    spin: s.spin,
    control: s.control,
    comfort: s.comfort,
  });
}

export function saveGripToBag(g: GripProfile) {
  useGearStore.getState().setGrip(g.id, `${g.brand} ${g.name}`, {
    tackiness: g.tackiness,
    cushion: g.cushion,
    absorbency: g.absorbency,
    durability: g.durability,
    kind: g.kind,
  });
}

export function GearPickerSheet({
  kind,
  rackets,
  strings,
  grips,
  onClose,
  /** When set, select calls this with the item id instead of writing My setup. */
  onPreviewPick,
}: {
  kind: PickerKind;
  rackets: RacketProfile[];
  strings: StringProfile[];
  grips: GripProfile[];
  onClose: () => void;
  onPreviewPick?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [kind]);

  const results = useMemo(() => {
    const q = deferred.trim();
    if (kind === "racket") {
      const list = q
        ? rackets
            .filter((r) => matchesEquipmentSearch(q, r.brand, r.model, r.slug, r.year, r.summary))
            .sort(
              (a, b) =>
                searchMatchScore(q, b.brand, b.model, b.slug) -
                searchMatchScore(q, a.brand, a.model, a.slug),
            )
        : rackets.slice(0, 12);
      return list.slice(0, 12).map((r) => ({
        id: r.slug,
        title: `${r.brand} ${r.model}`,
        meta: `${r.year}${r.weightG ? ` · ${r.weightG}g` : ""}`,
        select: () => (onPreviewPick ? onPreviewPick(r.slug) : saveRacketToBag(r)),
      }));
    }
    if (kind === "string") {
      const list = q
        ? strings
            .filter((s) =>
              matchesEquipmentSearch(q, s.brand, s.name, s.id, s.material, s.gaugesMm.join(" ")),
            )
            .sort(
              (a, b) =>
                searchMatchScore(q, b.brand, b.name, b.id) -
                searchMatchScore(q, a.brand, a.name, a.id),
            )
        : strings.slice(0, 12);
      return list.slice(0, 12).map((s) => ({
        id: s.id,
        title: `${s.brand} ${s.name}`,
        meta: `${s.material} · ${s.recommendedTensionLbs} lbs rec`,
        select: () => (onPreviewPick ? onPreviewPick(s.id) : saveStringToBag(s)),
      }));
    }
    const list = q
      ? grips.filter((g) => matchesEquipmentSearch(q, g.brand, g.name, g.id, g.kind))
      : grips.slice(0, 12);
    return list.slice(0, 12).map((g) => ({
      id: g.id,
      title: `${g.brand} ${g.name}`,
      meta: g.kind,
      select: () => (onPreviewPick ? onPreviewPick(g.id) : saveGripToBag(g)),
    }));
  }, [kind, deferred, rackets, strings, grips, onPreviewPick]);

  const placeholder =
    kind === "racket"
      ? "Search CX 200, Blade, Prestige…"
      : kind === "string"
        ? "Search ALU Power, RPM, poly 1.30…"
        : "Search Tourna, Super Grap…";

  const title =
    kind === "racket" ? "Your racket" : kind === "string" ? "Your string" : "Your grip";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close picker"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="picker-title"
        className="relative z-[71] flex max-h-[88vh] w-full max-w-lg flex-col border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl sm:rounded-lg"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="picker-title" className="font-[family-name:var(--font-display)] text-xl">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--muted)]">
            Close
          </button>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              e.preventDefault();
              results[0].select();
              onClose();
            }
            if (e.key === "Escape") onClose();
          }}
          placeholder={placeholder}
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-3 text-base outline-none focus:border-[var(--accent)]"
        />
        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-2 py-6 text-sm text-[var(--muted)]">No matches — try CX 200 or ALU.</li>
          ) : (
            results.map((row, i) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    row.select();
                    onClose();
                  }}
                  className="flex w-full items-baseline justify-between gap-3 rounded-md px-3 py-3 text-left transition hover:bg-white/5"
                  style={i === 0 ? { boxShadow: "inset 0 0 0 1px var(--accent)" } : undefined}
                >
                  <span className="text-sm font-medium">{row.title}</span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{row.meta}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="mt-2 text-xs text-[var(--muted)]">Enter selects the top match.</p>
      </div>
    </div>
  );
}
