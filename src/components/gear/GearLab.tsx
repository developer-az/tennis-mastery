"use client";

import { useState } from "react";
import type { EquipmentTab, GripProfile, RacketCatalogMeta, RacketProfile, StringProfile } from "@/types/equipment";
import { RacketExplorer } from "./RacketExplorer";
import { StringExplorer } from "./StringExplorer";
import { GripExplorer } from "./GripExplorer";

const TABS: { id: EquipmentTab; label: string; blurb: string }[] = [
  {
    id: "rackets",
    label: "Rackets",
    blurb: "Launch angle, swing path, and playing style for modern frames.",
  },
  {
    id: "strings",
    label: "Strings",
    blurb: "Spin potential, control, and how tension reshapes the bed.",
  },
  {
    id: "grips",
    label: "Grips",
    blurb: "Overgrips and replacement grips — tack, cushion, and sweat feel.",
  },
];

export function GearLab({
  rackets,
  racketMeta,
  strings,
  grips,
}: {
  rackets: RacketProfile[];
  racketMeta: RacketCatalogMeta;
  strings: StringProfile[];
  grips: GripProfile[];
}) {
  const [tab, setTab] = useState<EquipmentTab>("rackets");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
      <div className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-4 py-2 text-sm transition ${
                active
                  ? "bg-[var(--accent)] font-medium text-[#0b1a14]"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 max-w-2xl text-sm text-[var(--muted)]">
        {TABS.find((t) => t.id === tab)?.blurb}
      </p>

      <div className="mt-8">
        {tab === "rackets" && <RacketExplorer initialRackets={rackets} meta={racketMeta} />}
        {tab === "strings" && <StringExplorer strings={strings} />}
        {tab === "grips" && <GripExplorer grips={grips} />}
      </div>
    </div>
  );
}
