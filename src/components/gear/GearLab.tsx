"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EquipmentTab, GripProfile, RacketCatalogMeta, RacketProfile, StringProfile } from "@/types/equipment";
import { useGearStore } from "@/store/gearStore";
import { MySetupBar } from "./MySetupBar";
import { RacketExplorer } from "./RacketExplorer";
import { StringExplorer } from "./StringExplorer";
import { GripExplorer } from "./GripExplorer";

const TABS: { id: EquipmentTab; label: string; blurb: string }[] = [
  {
    id: "rackets",
    label: "Rackets",
    blurb: "Launch angle, swing path, and playing style for modern frames. Filter by brand, style, weight, and head size — then save your frame to My setup.",
  },
  {
    id: "strings",
    label: "Strings",
    blurb: "Spin, control, power, durability, stiffness, and tension maintenance — plus gauge and tension that actually move the scores. Filter by tension band, compare beds, then save to My setup.",
  },
  {
    id: "grips",
    label: "Grips",
    blurb: "Overgrips and replacement grips — tack, cushion, and sweat feel. Check two or three to compare side by side, then save the one that matches how you hold the handle.",
  },
];

const TAB_IDS = new Set<EquipmentTab>(["rackets", "strings", "grips"]);

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
  const tab = useGearStore((s) => s.tab);
  const setTab = useGearStore((s) => s.setTab);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate tab from ?tab=
  useEffect(() => {
    const raw = searchParams.get("tab");
    if (raw && TAB_IDS.has(raw as EquipmentTab) && raw !== tab) {
      setTab(raw as EquipmentTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectTab = (id: EquipmentTab) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
      <MySetupBar />

      <div
        className="relative z-20 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4"
        role="tablist"
        aria-label="Equipment category"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`gear-panel-${t.id}`}
              id={`gear-tab-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => {
                const idx = TABS.findIndex((x) => x.id === t.id);
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  selectTab(TABS[(idx + 1) % TABS.length].id);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  selectTab(TABS[(idx - 1 + TABS.length) % TABS.length].id);
                }
              }}
              className={`relative z-20 cursor-pointer rounded-md px-4 py-2.5 text-sm transition ${
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

      {/* Keep panels mounted so selection + tension state survive tab switches */}
      <div className="relative z-10 mt-8">
        <div
          id="gear-panel-rackets"
          role="tabpanel"
          aria-labelledby="gear-tab-rackets"
          hidden={tab !== "rackets"}
        >
          <RacketExplorer initialRackets={rackets} meta={racketMeta} />
        </div>
        <div
          id="gear-panel-strings"
          role="tabpanel"
          aria-labelledby="gear-tab-strings"
          hidden={tab !== "strings"}
        >
          <StringExplorer strings={strings} />
        </div>
        <div
          id="gear-panel-grips"
          role="tabpanel"
          aria-labelledby="gear-tab-grips"
          hidden={tab !== "grips"}
        >
          <GripExplorer grips={grips} />
        </div>
      </div>
    </div>
  );
}
