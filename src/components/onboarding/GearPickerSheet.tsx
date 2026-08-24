"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { GripProfile, RacketProfile, StringProfile } from "@/types/equipment";
import { matchesEquipmentSearch, searchMatchScore } from "@/lib/equipment/search";
import { gripImageUrl, racketImageUrl, stringImageUrl } from "@/lib/equipment/media/urls";
import { useGearStore } from "@/store/gearStore";
import { AisleChip, ChipRow, ProductCard, SearchField } from "@/components/gear/CatalogShop";
import {
  RACKET_SHOP_TYPES,
  racketShopBadge,
  racketShopType,
  stringMaterialShopLabel,
  uniqueSortedBrands,
  type RacketShopType,
} from "@/lib/equipment/shopAisles";

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

const VISIBLE = 18;

export function GearPickerSheet({
  kind,
  rackets,
  strings,
  grips,
  onClose,
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
  const [brand, setBrand] = useState("all");
  const [shopType, setShopType] = useState<RacketShopType | "all">("all");
  const deferred = useDeferredValue(query);
  const setup = useGearStore((s) => s.setup);

  const catalog = kind === "racket" ? rackets : kind === "string" ? strings : grips;
  const brands = useMemo(() => uniqueSortedBrands(catalog), [catalog]);

  const items = useMemo(() => {
    const q = deferred.trim();
    if (kind === "racket") {
      const list = rackets.filter((r) => {
        if (brand !== "all" && r.brand !== brand) return false;
        if (shopType !== "all" && racketShopType(r) !== shopType) return false;
        if (!q) return true;
        return matchesEquipmentSearch(q, r.brand, r.model, r.slug, r.year, r.summary);
      });
      if (q) {
        list.sort(
          (a, b) =>
            searchMatchScore(q, b.brand, b.model, b.slug) -
            searchMatchScore(q, a.brand, a.model, a.slug),
        );
      }
      return list.slice(0, VISIBLE);
    }
    if (kind === "string") {
      const list = strings.filter((s) => {
        if (brand !== "all" && s.brand !== brand) return false;
        if (!q) return true;
        return matchesEquipmentSearch(q, s.brand, s.name, s.id, s.material, s.gaugesMm.join(" "));
      });
      if (q) {
        list.sort(
          (a, b) =>
            searchMatchScore(q, b.brand, b.name, b.id) -
            searchMatchScore(q, a.brand, a.name, a.id),
        );
      }
      return list.slice(0, VISIBLE);
    }
    const list = grips.filter((g) => {
      if (brand !== "all" && g.brand !== brand) return false;
      if (!q) return true;
      return matchesEquipmentSearch(q, g.brand, g.name, g.id, g.kind);
    });
    return list.slice(0, VISIBLE);
  }, [kind, deferred, brand, shopType, rackets, strings, grips]);

  const title =
    kind === "racket" ? "Browse rackets" : kind === "string" ? "Browse strings" : "Browse grips";

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
        className="relative z-[71] flex max-h-[92vh] w-full max-w-3xl flex-col border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl sm:rounded-[var(--radius)]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="picker-title" className="font-[family-name:var(--font-display)] text-xl">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--muted)]">
            Close
          </button>
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={
            kind === "racket"
              ? "Search Blade, CX 200…"
              : kind === "string"
                ? "Search ALU Power, RPM…"
                : "Search Tourna, Super Grap…"
          }
          label={title}
        />
        <div className="mt-3 space-y-3">
          <ChipRow label="Brand">
            <AisleChip label="All" active={brand === "all"} onClick={() => setBrand("all")} />
            {brands.map((b) => (
              <AisleChip key={b} label={b} active={brand === b} onClick={() => setBrand(b)} />
            ))}
          </ChipRow>
          {kind === "racket" ? (
            <ChipRow label="Type">
              <AisleChip
                label="All types"
                active={shopType === "all"}
                onClick={() => setShopType("all")}
              />
              {RACKET_SHOP_TYPES.map((t) => (
                <AisleChip
                  key={t.id}
                  label={t.label}
                  active={shopType === t.id}
                  onClick={() => setShopType(t.id)}
                />
              ))}
            </ChipRow>
          ) : null}
        </div>
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {kind === "racket" &&
            (items as RacketProfile[]).map((r) => (
              <ProductCard
                key={r.slug}
                image={racketImageUrl(r)}
                alt={`${r.brand} ${r.model}`}
                brand={r.brand}
                name={r.model}
                badge={racketShopBadge(r)}
                scores={[
                  { label: "Spin", value: r.spin, color: "var(--chart-spin)" },
                  { label: "Power", value: r.power, color: "var(--chart-power)" },
                  { label: "Control", value: r.control, color: "var(--chart-control)" },
                ]}
                saved={setup.racketSlug === r.slug}
                onSelect={() => {
                  if (onPreviewPick) onPreviewPick(r.slug);
                  else saveRacketToBag(r);
                  onClose();
                }}
                onSave={() => {
                  if (onPreviewPick) onPreviewPick(r.slug);
                  else saveRacketToBag(r);
                  onClose();
                }}
              />
            ))}
          {kind === "string" &&
            (items as StringProfile[]).map((s) => (
              <ProductCard
                key={s.id}
                image={stringImageUrl(s)}
                alt={`${s.brand} ${s.name}`}
                brand={s.brand}
                name={s.name}
                badge={stringMaterialShopLabel(s.material)}
                scores={[
                  { label: "Spin", value: s.spin, color: "var(--chart-spin)" },
                  { label: "Power", value: s.power, color: "var(--chart-power)" },
                  { label: "Control", value: s.control, color: "var(--chart-control)" },
                ]}
                saved={setup.stringId === s.id}
                onSelect={() => {
                  if (onPreviewPick) onPreviewPick(s.id);
                  else saveStringToBag(s);
                  onClose();
                }}
                onSave={() => {
                  if (onPreviewPick) onPreviewPick(s.id);
                  else saveStringToBag(s);
                  onClose();
                }}
              />
            ))}
          {kind === "grip" &&
            (items as GripProfile[]).map((g) => (
              <ProductCard
                key={g.id}
                image={gripImageUrl(g)}
                alt={`${g.brand} ${g.name}`}
                brand={g.brand}
                name={g.name}
                badge={g.kind === "overgrip" ? "Overgrip" : "Replacement"}
                scores={[
                  { label: "Tack", value: g.tackiness, color: "var(--chart-spin)" },
                  { label: "Cushion", value: g.cushion, color: "var(--chart-comfort)" },
                  { label: "Grip", value: g.absorbency, color: "var(--chart-control)" },
                ]}
                saved={setup.gripId === g.id}
                onSelect={() => {
                  if (onPreviewPick) onPreviewPick(g.id);
                  else saveGripToBag(g);
                  onClose();
                }}
                onSave={() => {
                  if (onPreviewPick) onPreviewPick(g.id);
                  else saveGripToBag(g);
                  onClose();
                }}
              />
            ))}
          {items.length === 0 ? (
            <p className="col-span-full py-8 text-sm text-[var(--muted)]">
              No matches — try another brand or a shorter search.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
