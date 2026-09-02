import {
  applySpecPhysics,
  computeFrameSpecPhysics,
  evaluateSetupPlayability,
} from "../src/lib/equipment/playability.ts";
import type { RacketProfile } from "../src/types/equipment.ts";
import type { StringProfile } from "../src/types/equipment.ts";

function fail(msg: string) {
  console.error("FAIL", msg);
  process.exitCode = 1;
}

function ok(msg: string) {
  console.log("ok", msg);
}

const open100: RacketProfile = {
  slug: "spec-open",
  brand: "Spec",
  model: "Open 100",
  year: 2024,
  weightG: 300,
  swingweight: 318,
  stiffnessRa: 68,
  balanceMm: 320,
  headSizeSqIn: 100,
  stringPattern: "16x19",
  summary: "",
  atpPlayers: [],
  wtaPlayers: [],
  power: 0,
  spin: 0,
  control: 0,
  comfort: 0,
  idealLaunchAngleDeg: 8,
  idealSwingPathDeg: 20,
  style: "",
};

const dense98: RacketProfile = {
  ...open100,
  slug: "spec-dense",
  model: "Dense 98",
  weightG: 320,
  swingweight: 328,
  stiffnessRa: 62,
  balanceMm: 310,
  headSizeSqIn: 98,
  stringPattern: "18x20",
};

const namedAero = applySpecPhysics({
  ...open100,
  slug: "babolat-pure-aero",
  brand: "Babolat",
  model: "Pure Aero",
  summary: "A spin machine. 88/100 for spin, 40/100 for control, 70/100 for power.",
});
const namedBlade = applySpecPhysics({
  ...dense98,
  slug: "wilson-blade",
  brand: "Wilson",
  model: "Blade",
  summary: "A control player's frame. 82/100 for control, 45/100 for spin, 48/100 for power.",
});

const openPhys = computeFrameSpecPhysics(open100);
const densePhys = computeFrameSpecPhysics(dense98);

if (openPhys.spin <= densePhys.spin) {
  fail(`open 16x19 should out-spin dense 18x20 (${openPhys.spin} vs ${densePhys.spin})`);
} else ok(`open spin ${openPhys.spin} > dense ${densePhys.spin}`);

if (densePhys.control <= openPhys.control) {
  fail(`dense 18x20 should out-control open 16x19 (${densePhys.control} vs ${openPhys.control})`);
} else ok(`dense control ${densePhys.control} > open ${openPhys.control}`);

if (openPhys.launchDeg <= densePhys.launchDeg) {
  fail(`open bed should launch higher (${openPhys.launchDeg} vs ${densePhys.launchDeg})`);
} else ok(`open leave ${openPhys.launchDeg} > dense ${densePhys.launchDeg}`);

if (openPhys.pathDeg <= densePhys.pathDeg) {
  fail(`open bed should teach a steeper path (${openPhys.pathDeg} vs ${densePhys.pathDeg})`);
} else ok(`open path ${openPhys.pathDeg} > dense ${densePhys.pathDeg}`);

if (densePhys.pathDeg < 14) {
  fail(`dense path too flat to play tennis (${densePhys.pathDeg}°)`);
} else ok(`dense path ${densePhys.pathDeg}° still a tennis swing`);

if (Math.abs(namedAero.spin - openPhys.spin) > 12) {
  fail(`expert tint pulled Aero spin too far from specs (${namedAero.spin} vs ${openPhys.spin})`);
} else ok(`Aero spin ${namedAero.spin} stays near spec ${openPhys.spin}`);

if (/aero|babolat|blade|wilson/i.test(openPhys.howItHits + densePhys.howItHits)) {
  fail("how-it-hits copy mentioned a model name");
} else ok("how-it-hits copy is spec-only");

if (namedBlade.control < namedAero.control) {
  fail(`dense Blade-like specs should still beat Aero-like on control (${namedBlade.control} vs ${namedAero.control})`);
} else ok(`Blade-like control ${namedBlade.control} > Aero-like ${namedAero.control}`);

const poly: StringProfile = {
  id: "poly-test",
  brand: "Spec",
  name: "Poly",
  material: "polyester",
  shape: "hexagonal",
  gaugesMm: [1.25],
  power: 48,
  control: 72,
  spin: 78,
  comfort: 42,
  durability: 80,
  tensionMaintenance: 55,
  tensionRangeLbs: [48, 55],
  recommendedTensionLbs: 52,
  feel: "connected",
  bestFor: "spin",
  notes: "",
};

const stacked = evaluateSetupPlayability({
  racket: { ...open100, ...openPhys, stiffnessRa: 72 },
  string: poly,
  tensionLbs: 58,
  gaugeMm: 1.25,
  hasGrip: true,
  grip: { thicknessMm: 0.6, effectiveSizeIndex: 3, overgripCount: 1, buildNote: "L3" },
  scores: { power: 75, spin: 80, control: 50, comfort: 38 },
  launchAngleDeg: 10.5,
  swingPathDeg: 26,
  completeness: 85,
  player: { armFriendly: true, generatesOwnPower: false, forehandGrip: "western" },
});

if (stacked.band === "court-ready") {
  fail(`stiff + tight poly + western should not be court-ready (${stacked.band} ${stacked.score})`);
} else ok(`stacked setup band ${stacked.band} score ${stacked.score}`);

if (!stacked.flags.some((f) => f.severity === "stop" || f.id === "stiffness-stack")) {
  fail("expected stiffness-stack or stop flag on arm-friendly tight poly");
} else ok("stiffness stack flagged");

const sane = evaluateSetupPlayability({
  racket: applySpecPhysics(open100),
  string: { ...poly, material: "co-poly", shape: "round", comfort: 58 },
  tensionLbs: 52,
  gaugeMm: 1.25,
  hasGrip: true,
  grip: { thicknessMm: 0.55, effectiveSizeIndex: 3.2, overgripCount: 1, buildNote: "L3" },
  scores: { power: 62, spin: 70, control: 64, comfort: 58 },
  launchAngleDeg: 7.4,
  swingPathDeg: 22,
  flight: {
    launchDeg: 7.4,
    pathDeg: 22,
    plow: 58,
    topspin: 62,
    depth: 64,
    netClearIn: 8.2,
    flyRisk: 42,
  },
  completeness: 85,
  player: { generatesOwnPower: true, forehandGrip: "semi-western" },
});

if (sane.score < 70) {
  fail(`coherent mid setup should score well (${sane.band} ${sane.score})`);
} else ok(`coherent setup ${sane.band} ${sane.score}`);

if (process.exitCode) {
  console.error("\nplayability check failed");
} else {
  console.log("\nplayability check passed");
}
