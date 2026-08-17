"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { LeadTapePiece } from "@/types/equipment";
import type { FlightMetrics } from "@/lib/equipment/setupSynthesis";
import type { ForehandMoldAdvice } from "@/lib/equipment/forehandMold";
import { formatFt } from "@/lib/equipment/ballFlight";
import {
  FaceAngleAtContactVisual,
  LaunchAngleVisual,
  SwingPathVisual,
  type StrikeZoneHint,
} from "@/components/gear/RacketVisuals";
import { LeadTapeRacketDiagram } from "@/components/gear/LeadTapeRacketDiagram";
import { SetupStatsChart } from "./SetupStatsChart";

const SetupFlightCanvas = dynamic(
  () => import("./SetupFlightCanvas").then((m) => m.SetupFlightCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center rounded-md bg-[var(--bg-scene)] text-xs text-[var(--muted)] md:h-[320px]">
        Loading flight…
      </div>
    ),
  },
);

type ScoreBag = Record<"power" | "spin" | "control" | "comfort", number | null>;

/**
 * One coherent story for You → Today:
 * readout → scores → contact (where + face) → flight (3D + side) → tape.
 * Each block has one job; numbers appear once up top.
 */
export function SetupVisualStory({
  scores,
  stock,
  role,
  flight,
  launchDeg,
  pathDeg,
  zone,
  forehand,
  pieces,
  hasRacket,
}: {
  scores: ScoreBag;
  stock: ScoreBag;
  role: string;
  flight: FlightMetrics | null;
  launchDeg: number | null;
  pathDeg: number | null;
  zone: StrikeZoneHint;
  forehand: ForehandMoldAdvice | null;
  pieces: LeadTapePiece[];
  hasRacket: boolean;
}) {
  const closed = forehand?.face.closedDeg ?? 8;
  const hasFlight = launchDeg != null && flight != null;
  const tapeG = pieces.reduce((n, p) => n + p.massG, 0);

  return (
    <div className="space-y-6">
      {/* 0 — one readout for the whole story */}
      <section className="sf-panel p-4 md:p-5">
        <p className="sf-kicker">This mold at a glance</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Readout
            label="Leave"
            value={launchDeg != null ? `${launchDeg.toFixed(1)}°` : "—"}
            hint="off the strings"
          />
          <Readout
            label="Path"
            value={pathDeg != null ? `${pathDeg.toFixed(0)}°` : "—"}
            hint="low → high"
          />
          <Readout
            label="Net clear"
            value={flight ? `+${flight.netClearIn.toFixed(1)}″` : "—"}
            hint="over 3.0 ft tape"
          />
          <Readout label="Face" value={`${closed.toFixed(1)}°`} hint="closed at contact" />
          <Readout label="Height" value={formatFt(zone.heightM)} hint={zone.primary} />
          <Readout label="Out front" value={formatFt(zone.outFrontM)} hint="from torso" />
        </div>
        {forehand ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            <span className="text-[var(--foreground)]/90">{forehand.gripLabel}</span>
            {" · "}
            {forehand.face.label.toLowerCase()} · prefer {forehand.prefersHeight}-high balls
          </p>
        ) : null}
      </section>

      {/* 1 — scores */}
      <SetupStatsChart scores={scores} stock={stock} role={role} flight={null} />

      {/* 2 — contact */}
      {(pathDeg != null || forehand) && (
        <section className="sf-panel p-4 md:p-5">
          <SectionHead
            step="01"
            title="Contact"
            blurb="Where the ball meets the bed, and how closed the face should be."
          />
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {pathDeg != null ? (
              <SwingPathVisual
                degrees={pathDeg}
                zone={zone}
                faceClosedDeg={closed}
                label="Where to strike"
                compact
              />
            ) : null}
            {forehand ? (
              <FaceAngleAtContactVisual advice={forehand} compact />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Save a frame to unlock face-angle coaching for this mold.
              </p>
            )}
          </div>
        </section>
      )}

      {/* 3 — flight */}
      {hasFlight ? (
        <section className="sf-panel p-4 md:p-5">
          <SectionHead
            step="02"
            title="Flight"
            blurb="Same numbers as above: leave angle from the strings, clearance over a 3.0 ft net."
          />
          <div className="mt-4 space-y-4">
            <SetupFlightCanvas
              launchDeg={launchDeg}
              pathDeg={pathDeg ?? 22}
              flight={flight}
              contactHeightM={zone.heightM}
              outFrontM={zone.outFrontM}
              faceClosedDeg={closed}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricChip label="Plow" value={flight.plow} color="var(--chart-comfort)" />
              <MetricChip label="Topspin" value={flight.topspin} color="var(--chart-spin)" />
              <MetricChip label="Depth" value={flight.depth} color="var(--chart-power)" />
              <MetricChip label="Fly risk" value={flight.flyRisk} color="var(--foreground)" />
            </div>
            <LaunchAngleVisual
              degrees={launchDeg}
              pathDeg={pathDeg ?? undefined}
              flight={flight}
              zone={zone}
              faceClosedDeg={closed}
              label="Side view — physics path"
              compact
            />
          </div>
        </section>
      ) : null}

      {/* 4 — tape map (only when relevant) */}
      {hasRacket ? (
        <section className="sf-panel p-4 md:p-5">
          <SectionHead
            step="03"
            title="Lead tape"
            blurb={
              tapeG > 0
                ? `${tapeG.toFixed(1)} g on the hoop — mass that shifts the mold above.`
                : "No tape yet. Tip/12 adds plow; 3/9 stabilizes; handle whips the path steeper."
            }
          />
          <div className="mt-4 mx-auto max-w-xs">
            <LeadTapeRacketDiagram pieces={pieces} interactive={false} />
            <Link href="/gear?tab=lead-tape" className="mt-2 inline-block text-xs text-[var(--accent)]">
              Customize tape →
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHead({
  step,
  title,
  blurb,
}: {
  step: string;
  title: string;
  blurb: string;
}) {
  return (
    <div>
      <p className="sf-kicker !text-[var(--muted)]">
        {step} · {title}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{blurb}</p>
    </div>
  );
}

function Readout({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight">
        {value}
      </p>
      <p className="text-[10px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function MetricChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-md px-2.5 py-2" style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color }}>
        {label}
      </p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
