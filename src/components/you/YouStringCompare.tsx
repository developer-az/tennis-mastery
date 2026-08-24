"use client";

import { useMemo, useState } from "react";
import type { GripProfile, StringProfile } from "@/types/equipment";
import type { MySetup } from "@/store/gearStore";
import { useGearStore } from "@/store/gearStore";
import type { CombinedSetupInsight } from "@/lib/equipment/setupSynthesis";
import { findSimilarStrings, tensionOutcome } from "@/lib/equipment/strings";
import { numericDelta } from "@/components/gear/CompareToSetup";
import { GearPickerSheet } from "@/components/onboarding/GearPickerSheet";

type Candidate = {
  id: string;
  label: string;
  sub: string;
  string: StringProfile;
  isSaved: boolean;
};

function fmtSigned(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  if (Math.abs(r) < 0.05) return "0";
  return `${r > 0 ? "+" : ""}${r}`;
}

/**
 * Mobile-first string carousel on You: tap/prev-next beds and see full-mold
 * deltas (frame + string + grip + lead tape). Parent owns mold recompute.
 */
export function YouStringCompare({
  setup,
  string,
  strings,
  baseline,
  preview,
  previewStringId,
  onSelectPreviewId,
}: {
  setup: MySetup;
  string: StringProfile | null;
  strings: StringProfile[];
  baseline: CombinedSetupInsight;
  /** Insight for the currently selected (possibly preview) bed */
  preview: CombinedSetupInsight;
  previewStringId: string | null;
  onSelectPreviewId: (id: string | null) => void;
}) {
  const setString = useGearStore((s) => s.setString);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [extraId, setExtraId] = useState<string | null>(null);

  const candidates = useMemo((): Candidate[] => {
    const list: Candidate[] = [];
    const seen = new Set<string>();
    const push = (c: Candidate) => {
      if (seen.has(c.id)) return;
      seen.add(c.id);
      list.push(c);
    };

    if (string) {
      push({
        id: string.id,
        label: `${string.brand} ${string.name}`,
        sub: "Saved bed",
        string,
        isSaved: true,
      });
      for (const alt of findSimilarStrings(string, strings, { limit: 5 })) {
        push({
          id: alt.string.id,
          label: `${alt.string.brand} ${alt.string.name}`,
          sub: alt.why,
          string: alt.string,
          isSaved: false,
        });
      }
    } else {
      const picks: StringProfile[] = [];
      for (const s of strings) {
        if (picks.length >= 6) break;
        if (picks.some((p) => p.material === s.material && p.shape === s.shape)) continue;
        picks.push(s);
      }
      for (const s of picks.length ? picks : strings.slice(0, 6)) {
        push({
          id: s.id,
          label: `${s.brand} ${s.name}`,
          sub: s.material,
          string: s,
          isSaved: false,
        });
      }
    }

    if (extraId) {
      const s = strings.find((x) => x.id === extraId);
      if (s) {
        push({
          id: s.id,
          label: `${s.brand} ${s.name}`,
          sub: "From browse",
          string: s,
          isSaved: string?.id === s.id,
        });
      }
    }

    return list;
  }, [string, strings, extraId]);

  const activeId = previewStringId ?? string?.id ?? candidates[0]?.id ?? null;
  const activeIdx = Math.max(0, candidates.findIndex((c) => c.id === activeId));
  const active = candidates[activeIdx] ?? null;
  const isPreviewing = Boolean(active && (!string || active.id !== string.id));

  const go = (dir: -1 | 1) => {
    if (!candidates.length) return;
    const next = (activeIdx + dir + candidates.length) % candidates.length;
    const c = candidates[next];
    onSelectPreviewId(c.isSaved ? null : c.id);
  };

  const saveActive = () => {
    if (!active) return;
    const tension = setup.tensionLbs ?? active.string.recommendedTensionLbs;
    const gauge = setup.gaugeMm ?? active.string.gaugesMm[0];
    const bed = tensionOutcome(active.string, tension, gauge);
    setString(active.string.id, `${active.string.brand} ${active.string.name}`, {
      tensionLbs: tension,
      gaugeMm: gauge,
      power: bed.power,
      spin: bed.spin,
      control: bed.control,
      comfort: bed.comfort,
    });
    onSelectPreviewId(null);
    setExtraId(null);
  };

  if (!candidates.length) {
    return (
      <section className="sf-panel p-4 md:p-5">
        <p className="sf-kicker">String compare</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          No string catalog loaded. Open Gear Lab to browse beds.
        </p>
      </section>
    );
  }

  const deltaRows = buildDeltaRows(baseline, preview);

  return (
    <section className="sf-panel overflow-hidden p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="sf-kicker">String compare</p>
          <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight md:text-xl">
            Swap the bed — keep frame, grip & tape
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Full-mold deltas: leave, path, flight, and scores with your lead tape still applied.
          </p>
        </div>
        {isPreviewing ? (
          <span className="border border-[var(--amber)]/40 bg-[color-mix(in_srgb,var(--amber)_12%,transparent)] px-2 py-1 text-[10px] font-semibold tracking-[0.1em] text-[var(--amber)] uppercase">
            Preview
          </span>
        ) : null}
      </div>

      <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {candidates.map((c) => {
          const on = c.id === active?.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectPreviewId(c.isSaved ? null : c.id)}
              className="max-w-[11.5rem] shrink-0 px-3 py-2 text-left transition"
              style={{
                background: on ? "var(--accent)" : "var(--overlay-hover)",
                color: on ? "var(--accent-fg)" : "var(--foreground)",
                boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)",
              }}
            >
              <p className="truncate text-xs font-semibold">{c.label}</p>
              <p className={`mt-0.5 truncate text-[10px] ${on ? "opacity-75" : "text-[var(--muted)]"}`}>
                {c.sub}
              </p>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 px-3 py-2 text-xs font-semibold text-[var(--accent)]"
          style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
        >
          Browse all…
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          className="sf-btn sf-btn-secondary !min-h-10 px-3 text-xs"
        >
          ← Prev
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">
          {active?.label ?? "—"}
          {active ? (
            <span className="text-[var(--muted)]">
              {" "}
              · {setup.tensionLbs ?? active.string.recommendedTensionLbs} lbs
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          className="sf-btn sf-btn-secondary !min-h-10 px-3 text-xs"
        >
          Next →
        </button>
      </div>

      <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {deltaRows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
            <span className="text-[var(--muted)]">{row.label}</span>
            <span className="flex items-baseline gap-2.5 tabular-nums">
              <span className="font-medium text-[var(--foreground)]">{row.display}</span>
              {row.deltaLabel ? (
                <span className="text-xs font-semibold" style={{ color: row.deltaColor }}>
                  {row.deltaLabel}
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">same</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {(baseline.hasTape || preview.hasTape) && (
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
          Lead tape held constant
          {Math.abs(baseline.deltas.tapeLaunch) >= 0.05 || Math.abs(baseline.deltas.tapePath) >= 0.05
            ? ` (leave ${fmtSigned(baseline.deltas.tapeLaunch)}° · path ${fmtSigned(baseline.deltas.tapePath)}° from tape alone)`
            : ""}
          . Switching beds does not remove hoop mass.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {isPreviewing ? (
          <>
            <button
              type="button"
              onClick={saveActive}
              className="sf-btn sf-btn-primary !min-h-11 flex-1 sm:flex-none"
            >
              Save this bed
            </button>
            {string ? (
              <button
                type="button"
                onClick={() => {
                  onSelectPreviewId(null);
                  setExtraId(null);
                }}
                className="sf-btn sf-btn-ghost !min-h-11"
              >
                Back to saved
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {pickerOpen ? (
        <GearPickerSheet
          kind="string"
          rackets={[]}
          strings={strings}
          grips={[]}
          onClose={() => setPickerOpen(false)}
          onPreviewPick={(id) => {
            setExtraId(id);
            onSelectPreviewId(id);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function buildDeltaRows(
  base: CombinedSetupInsight,
  next: CombinedSetupInsight,
): {
  key: string;
  label: string;
  display: string;
  deltaLabel: string | null;
  deltaColor: string;
}[] {
  const score = (key: "power" | "spin" | "control" | "comfort", label: string) => {
    const v = next.scores[key];
    const d = numericDelta(v, base.scores[key]);
    return {
      key,
      label,
      display: v != null ? String(v) : "—",
      deltaLabel: d != null && d !== 0 ? fmtSigned(d, 0) : null,
      deltaColor: d != null && d > 0 ? "var(--accent)" : "var(--amber)",
    };
  };

  const angle = (
    key: string,
    label: string,
    v: number | null,
    b: number | null,
    unit: string,
    higherBetter: boolean,
  ) => {
    const d = numericDelta(v, b);
    const better = d != null && (higherBetter ? d > 0 : d < 0);
    return {
      key,
      label,
      display: v != null ? `${Number(v).toFixed(1)}${unit}` : "—",
      deltaLabel: d != null && d !== 0 ? `${fmtSigned(d)}${unit}` : null,
      deltaColor: better ? "var(--accent)" : "var(--amber)",
    };
  };

  return [
    angle("leave", "Leave", next.launchAngleDeg, base.launchAngleDeg, "°", false),
    angle("path", "Swing path", next.swingPathDeg, base.swingPathDeg, "°", true),
    {
      key: "net",
      label: "Net clear",
      display: next.flight ? `+${next.flight.netClearIn.toFixed(1)}″` : "—",
      deltaLabel:
        next.flight && base.flight
          ? (() => {
              const d = numericDelta(next.flight!.netClearIn, base.flight!.netClearIn);
              return d != null && d !== 0 ? `${fmtSigned(d)}″` : null;
            })()
          : null,
      deltaColor:
        next.flight && base.flight && next.flight.netClearIn >= base.flight.netClearIn
          ? "var(--accent)"
          : "var(--amber)",
    },
    score("power", "Power"),
    score("spin", "Spin"),
    score("control", "Control"),
    score("comfort", "Comfort"),
    {
      key: "plow",
      label: "Plow (flight)",
      display: next.flight ? String(next.flight.plow) : "—",
      deltaLabel:
        next.flight && base.flight
          ? (() => {
              const d = numericDelta(next.flight!.plow, base.flight!.plow);
              return d != null && d !== 0 ? fmtSigned(d, 0) : null;
            })()
          : null,
      deltaColor: "var(--muted)",
    },
    {
      key: "topspin",
      label: "Topspin (flight)",
      display: next.flight ? String(next.flight.topspin) : "—",
      deltaLabel:
        next.flight && base.flight
          ? (() => {
              const d = numericDelta(next.flight!.topspin, base.flight!.topspin);
              return d != null && d !== 0 ? fmtSigned(d, 0) : null;
            })()
          : null,
      deltaColor: "var(--muted)",
    },
    {
      key: "fly",
      label: "Fly risk",
      display: next.flight ? String(next.flight.flyRisk) : "—",
      deltaLabel:
        next.flight && base.flight
          ? (() => {
              const d = numericDelta(next.flight!.flyRisk, base.flight!.flyRisk);
              return d != null && d !== 0 ? fmtSigned(d, 0) : null;
            })()
          : null,
      deltaColor:
        next.flight && base.flight && next.flight.flyRisk < base.flight.flyRisk
          ? "var(--accent)"
          : "var(--amber)",
    },
  ];
}
