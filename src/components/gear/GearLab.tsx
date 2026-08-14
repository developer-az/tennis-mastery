"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EquipmentTab, GripProfile, RacketCatalogMeta, RacketProfile, StringProfile } from "@/types/equipment";
import { useGearStore } from "@/store/gearStore";
import { MySetupBar } from "./MySetupBar";
import { CombinedSetupPanel } from "./CombinedSetupPanel";
import { SetupDials } from "./SetupDials";
import { RacketExplorer } from "./RacketExplorer";
import { StringExplorer } from "./StringExplorer";
import { GripExplorer } from "./GripExplorer";
import { LeadTapeLab } from "./LeadTapeLab";
import { AccountabilityStrip } from "./AccountabilityStrip";

const TABS: { id: EquipmentTab; label: string; blurb: string }[] = [
  {
    id: "overview",
    label: "My setup",
    blurb:
      "Dial tension, gauge, and grip size here. See molded launch, string substitutes you can shop, and honest pros/cons — then jump to lead tape to mold toward a pro frame on a budget.",
  },
  {
    id: "rackets",
    label: "Rackets",
    blurb:
      "Launch angle, swing path, and playing style for modern frames. Filter by brand, style, weight, head size, and pattern — compare to your tested setup, then save your frame.",
  },
  {
    id: "strings",
    label: "Strings",
    blurb:
      "Find poly 1.30 or any material/gauge/shape bucket, learn the category, then compare beds to what you have already hit with. Tension and gauge move the scores.",
  },
  {
    id: "grips",
    label: "Grips",
    blurb:
      "Overgrips and replacement grips — tack, cushion, sweat feel, plus your frame’s L0–L5 grip size. Dial size anytime under My setup.",
  },
  {
    id: "lead-tape",
    label: "Lead tape",
    blurb:
      "Mold your frame toward a pro or target retail setup — calculated tip/handle plans — or place tape by hand and watch SW, balance, launch, and path shift live.",
  },
];

const TAB_IDS = new Set<EquipmentTab>([
  "overview",
  "rackets",
  "strings",
  "grips",
  "lead-tape",
]);

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
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:px-10 md:py-8">
      <MySetupBar onSelectTab={selectTab} />
      <AccountabilityStrip />
      <div className="mb-4">
        <SetupDials strings={strings} compact hideStringDials={tab === "strings"} />
      </div>

      <div
        className="sticky top-0 z-30 -mx-4 border-b border-[var(--line)] bg-[var(--background)]/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
      >
        <div
          className="relative z-20 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-4 [&::-webkit-scrollbar]:hidden"
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
                className={`relative z-20 shrink-0 cursor-pointer rounded-md px-3.5 py-2 text-sm transition sm:px-4 sm:py-2.5 ${
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
      </div>

      <div className="relative z-10 mt-8">
        {tab === "overview" ? (
          <div
            id="gear-panel-overview"
            role="tabpanel"
            aria-labelledby="gear-tab-overview"
          >
            <CombinedSetupPanel rackets={rackets} strings={strings} grips={grips} />
          </div>
        ) : null}
        {tab === "rackets" ? (
          <div id="gear-panel-rackets" role="tabpanel" aria-labelledby="gear-tab-rackets">
            <RacketExplorer initialRackets={rackets} meta={racketMeta} />
          </div>
        ) : null}
        {tab === "strings" ? (
          <div id="gear-panel-strings" role="tabpanel" aria-labelledby="gear-tab-strings">
            <StringExplorer strings={strings} />
          </div>
        ) : null}
        {tab === "grips" ? (
          <div id="gear-panel-grips" role="tabpanel" aria-labelledby="gear-tab-grips">
            <GripExplorer grips={grips} />
          </div>
        ) : null}
        {tab === "lead-tape" ? (
          <div
            id="gear-panel-lead-tape"
            role="tabpanel"
            aria-labelledby="gear-tab-lead-tape"
          >
            <LeadTapeLab rackets={rackets} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
