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

const TABS: { id: EquipmentTab; label: string; short: string; blurb: string }[] = [
  {
    id: "overview",
    label: "Setup",
    short: "Setup",
    blurb:
      "Dial tension, gauge, and grip size here. See molded launch, string substitutes you can shop, and honest pros/cons — then jump to lead tape to mold toward a pro frame on a budget.",
  },
  {
    id: "rackets",
    label: "Rackets",
    short: "Frames",
    blurb:
      "Launch angle, swing path, and playing style for modern frames. Filter by brand, style, weight, head size, and pattern — compare to your tested setup, then save your frame.",
  },
  {
    id: "strings",
    label: "Strings",
    short: "Strings",
    blurb:
      "Find poly 1.30 or any material/gauge/shape bucket, learn the category, then compare beds to what you have already hit with. Tension and gauge move the scores.",
  },
  {
    id: "grips",
    label: "Grips",
    short: "Grips",
    blurb:
      "Overgrips and replacement grips — tack, cushion, sweat feel, plus your frame’s L0–L5 grip size. Dial size anytime under Setup.",
  },
  {
    id: "lead-tape",
    label: "Lead tape",
    short: "Tape",
    blurb:
      "Mold your frame toward a pro or target retail setup — calculated tip/handle plans — or place tape by hand and watch SW, balance, launch, and path shift live.",
  },
];

const TAB_IDS = new Set<EquipmentTab>(TABS.map((t) => t.id));
const SHOW_DIALS = new Set<EquipmentTab>(["overview", "strings"]);

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

  const selectTab = (id: EquipmentTab, extra?: Record<string, string | null>) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v == null) params.delete(k);
        else params.set(k, v);
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeBlurb = TABS.find((t) => t.id === tab)?.blurb;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 md:px-10 md:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5 md:mb-6">
        <div>
          <p className="sf-kicker">Shop the bag</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl">
            Gear
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Browse by brand, type, and feel — like walking a store aisle. Specs stay one tap away.
          </p>
        </div>
        <MySetupBar onSelectTab={selectTab} />
      </header>

      <AccountabilityStrip />

      {SHOW_DIALS.has(tab) ? (
        <div className="mb-3">
          <SetupDials strings={strings} compact hideStringDials={tab === "strings"} />
        </div>
      ) : null}

      <div className="gear-sticky-tabs sticky top-0 z-30 -mx-4 border-b border-[var(--line)] bg-[var(--background)]/95 px-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <div className="sf-tab-track" role="tablist" aria-label="Equipment category">
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
                className="sf-tab"
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
        {activeBlurb ? (
          <p className="max-w-3xl pb-3 pt-1 text-xs leading-relaxed text-[var(--muted)] md:pb-0">
            {activeBlurb}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 mt-4 md:mt-6">
        {tab === "overview" ? (
          <div id="gear-panel-overview" role="tabpanel" aria-labelledby="gear-tab-overview">
            <CombinedSetupPanel
              rackets={rackets}
              strings={strings}
              grips={grips}
              onSelectTab={selectTab}
            />
          </div>
        ) : null}
        {tab === "rackets" ? (
          <div id="gear-panel-rackets" role="tabpanel" aria-labelledby="gear-tab-rackets">
            <RacketExplorer initialRackets={rackets} meta={racketMeta} onSelectTab={selectTab} />
          </div>
        ) : null}
        {tab === "strings" ? (
          <div id="gear-panel-strings" role="tabpanel" aria-labelledby="gear-tab-strings">
            <StringExplorer strings={strings} onSelectTab={selectTab} />
          </div>
        ) : null}
        {tab === "grips" ? (
          <div id="gear-panel-grips" role="tabpanel" aria-labelledby="gear-tab-grips">
            <GripExplorer grips={grips} onSelectTab={selectTab} />
          </div>
        ) : null}
        {tab === "lead-tape" ? (
          <div id="gear-panel-lead-tape" role="tabpanel" aria-labelledby="gear-tab-lead-tape">
            <LeadTapeLab rackets={rackets} strings={strings} grips={grips} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
