"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { GripProfile } from "@/types/equipment";
import { GripFeelVisual } from "./GripVisuals";

export function GripExplorer({ grips }: { grips: GripProfile[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "overgrip" | "replacement">("all");
  const [selectedId, setSelectedId] = useState(grips[0]?.id ?? "");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return grips.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
      if (!q) return true;
      return `${g.brand} ${g.name} ${g.texture} ${g.bestFor} ${g.uniqueTrait}`
        .toLowerCase()
        .includes(q);
    });
  }, [grips, deferredQuery, kind]);

  useEffect(() => {
    if (!filtered.some((g) => g.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? "");
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((g) => g.id === selectedId) ?? filtered[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tourna, Super Grap, leather…"
            className="w-full flex-1 rounded-md border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="all">All grips</option>
            <option value="overgrip">Overgrips</option>
            <option value="replacement">Replacement grips</option>
          </select>
        </div>

        <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
          {filtered.map((g) => {
            const active = g.id === selected?.id;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={`flex w-full flex-col gap-0.5 px-2 py-3 text-left transition ${
                    active ? "bg-[var(--accent-dim)]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="font-[family-name:var(--font-display)] text-sm tracking-tight">
                    {g.brand} {g.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {g.kind === "overgrip" ? "Overgrip" : "Replacement"} · {g.texture} ·{" "}
                    {g.thicknessMm} mm
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && (
        <div className="space-y-6" key={selected.id} style={{ animation: "rise 0.45s ease-out both" }}>
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">
              {selected.kind === "overgrip" ? "Overgrip" : "Replacement grip"}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
              {selected.brand} {selected.name}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Best for: {selected.bestFor}</p>
          </header>

          <GripFeelVisual grip={selected} />

          <p className="text-sm leading-relaxed text-[var(--muted)]">{selected.notes}</p>
        </div>
      )}
    </div>
  );
}
