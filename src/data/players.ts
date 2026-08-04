import type { PlayerProfile, StrokeType } from "@/types/biomechanics";
import {
  alcarazVolley,
  cloneStroke,
  djokovicBackhand,
  federerForehand,
  federerSlice,
  nadalForehand,
  serenaServe,
  type StrokeLibrary,
} from "./strokes";

function fillStrokes(partial: Partial<StrokeLibrary>, defaults: StrokeLibrary): StrokeLibrary {
  return {
    forehand: partial.forehand ?? defaults.forehand,
    backhand: partial.backhand ?? defaults.backhand,
    serve: partial.serve ?? defaults.serve,
    slice: partial.slice ?? defaults.slice,
    volley: partial.volley ?? defaults.volley,
  };
}

const federerDefaults: StrokeLibrary = {
  forehand: federerForehand,
  backhand: cloneStroke(djokovicBackhand, {
    type: "backhand",
    label: "One-Handed Backhand",
    oneHanded: true,
    metrics: {
      peakRacketSpeedMs: 24.5,
      avgSpinRpm: 2100,
      grip: "eastern",
      consistency: {
        contactHeightCv: 4.8,
        timingSdMs: 13,
        pathReproducibility: 93,
        signatureQuirk: "Long lever 1HBH with delayed forearm pronation for shape",
      },
      kineticChain: {
        sequence: ["legs", "hips", "trunk", "shoulder", "elbow", "racket"],
        proximalDistalLagMs: 42,
        xFactorDeg: 40,
        peakGrfN: 1250,
      },
      researchNotes: [
        "Classic eastern 1HBH — contact slightly further in front than 2HBH.",
        "Higher variability under pace than Djokovic 2HBH; elite depth when set.",
      ],
      sources: federerForehand.metrics.sources,
      contactHeightM: 1.08,
      contactDepthM: 0.55,
      launchAngleDeg: 6.5,
      swingPathDeg: 18,
      impactDurationMs: 4.1,
    },
  }),
  serve: cloneStroke(serenaServe, {
    label: "First Serve (Sliced/Flat)",
    metrics: {
      peakRacketSpeedMs: 48.0,
      contactHeightM: 2.85,
      avgSpinRpm: 2800,
      consistency: {
        contactHeightCv: 2.5,
        timingSdMs: 11,
        pathReproducibility: 94,
        signatureQuirk: "Effortless trophy-to-pronation timing with pinpoint accuracy to T",
      },
      kineticChain: {
        sequence: ["legs", "trunk", "shoulder", "elbow", "wrist", "racket"],
        proximalDistalLagMs: 30,
        xFactorDeg: 52,
        peakGrfN: 1950,
      },
      researchNotes: [
        "Peak serve speeds historically mid–120s mph; racket speed near 45–50 m/s.",
        "High placement efficiency (first-serve points won) over raw max speed.",
      ],
      sources: serenaServe.metrics.sources,
      contactDepthM: 0.08,
      launchAngleDeg: -4.0,
      swingPathDeg: 8,
      impactDurationMs: 3.6,
      grip: "continental",
    },
  }),
  slice: federerSlice,
  volley: cloneStroke(alcarazVolley, {
    metrics: {
      peakRacketSpeedMs: 13.5,
      consistency: {
        contactHeightCv: 5.0,
        timingSdMs: 7,
        pathReproducibility: 95,
        signatureQuirk: "Soft hands with continental face control — classic serve-and-volley DNA",
      },
      researchNotes: alcarazVolley.metrics.researchNotes,
      sources: alcarazVolley.metrics.sources,
      kineticChain: alcarazVolley.metrics.kineticChain,
      contactHeightM: 1.3,
      contactDepthM: 0.5,
      avgSpinRpm: 350,
      launchAngleDeg: 1.5,
      swingPathDeg: 4,
      impactDurationMs: 3.4,
      grip: "continental",
    },
  }),
};

const nadalDefaults: StrokeLibrary = fillStrokes(
  {
    forehand: nadalForehand,
    backhand: cloneStroke(djokovicBackhand, {
      handedness: "left",
      label: "Two-Handed Backhand (Lefty)",
      metrics: {
        peakRacketSpeedMs: 25.2,
        avgSpinRpm: 2600,
        consistency: {
          contactHeightCv: 4.2,
          timingSdMs: 12,
          pathReproducibility: 92,
          signatureQuirk: "Lefty cross-court BH shape with heavy shape over the high part of the net",
        },
        researchNotes: [
          "2HBH provides stability against high-bouncing clay balls.",
          "Slightly more topspin than average tour BH to match FH pattern.",
        ],
        sources: djokovicBackhand.metrics.sources,
        kineticChain: djokovicBackhand.metrics.kineticChain,
        contactHeightM: 1.1,
        contactDepthM: 0.45,
        launchAngleDeg: 9.0,
        swingPathDeg: 28,
        impactDurationMs: 4.2,
        grip: "twoHanded",
      },
    }),
    serve: cloneStroke(serenaServe, {
      handedness: "left",
      label: "Lefty Serve",
      metrics: {
        peakRacketSpeedMs: 44.0,
        avgSpinRpm: 3200,
        consistency: {
          contactHeightCv: 3.2,
          timingSdMs: 15,
          pathReproducibility: 90,
          signatureQuirk: "Lefty slice wide on ad court — kicks opponents off the court",
        },
        researchNotes: [
          "Left-handed serve geometry creates unique wide angles on ad side.",
          "Kick second serve with high RPM for clay-court margin.",
        ],
        sources: serenaServe.metrics.sources,
        kineticChain: {
          sequence: ["legs", "trunk", "shoulder", "elbow", "wrist", "racket"],
          proximalDistalLagMs: 30,
          xFactorDeg: 50,
          peakGrfN: 1850,
        },
        contactHeightM: 2.7,
        contactDepthM: 0.1,
        launchAngleDeg: -2.5,
        swingPathDeg: 12,
        impactDurationMs: 3.9,
        grip: "continental",
      },
    }),
    slice: cloneStroke(federerSlice, {
      handedness: "left",
      metrics: {
        peakRacketSpeedMs: 17.0,
        avgSpinRpm: -1600,
        consistency: {
          contactHeightCv: 5.5,
          timingSdMs: 14,
          pathReproducibility: 88,
          signatureQuirk: "Used as change-up; less signature than the heavy topspin FH",
        },
        researchNotes: federerSlice.metrics.researchNotes,
        sources: federerSlice.metrics.sources,
        kineticChain: federerSlice.metrics.kineticChain,
        contactHeightM: 0.95,
        contactDepthM: 0.35,
        launchAngleDeg: 5.0,
        swingPathDeg: -22,
        impactDurationMs: 5.2,
        grip: "continental",
      },
    }),
  },
  {
    ...federerDefaults,
    forehand: nadalForehand,
  },
);

const djokovicDefaults: StrokeLibrary = fillStrokes(
  {
    forehand: cloneStroke(federerForehand, {
      label: "Forehand (Flexible)",
      metrics: {
        peakRacketSpeedMs: 27.5,
        avgSpinRpm: 2900,
        contactHeightM: 1.15,
        consistency: {
          contactHeightCv: 3.9,
          timingSdMs: 11,
          pathReproducibility: 95,
          signatureQuirk: "Extreme flexibility allows late contact on defensive balls without breakdown",
        },
        researchNotes: [
          "Semi-western grip; elite on-the-rise FH timing.",
          "Balance and recovery speed amplify consistency of contact point.",
        ],
        sources: federerForehand.metrics.sources,
        kineticChain: {
          sequence: ["legs", "hips", "trunk", "shoulder", "elbow", "wrist", "racket"],
          proximalDistalLagMs: 36,
          xFactorDeg: 44,
          peakGrfN: 1500,
        },
        contactDepthM: 0.4,
        launchAngleDeg: 9.0,
        swingPathDeg: 32,
        impactDurationMs: 4.3,
        grip: "semiWestern",
      },
    }),
    backhand: djokovicBackhand,
    serve: cloneStroke(serenaServe, {
      label: "First Serve",
      metrics: {
        peakRacketSpeedMs: 46.5,
        avgSpinRpm: 2600,
        consistency: {
          contactHeightCv: 2.8,
          timingSdMs: 12,
          pathReproducibility: 93,
          signatureQuirk: "Precise placement down the T under pressure — timing over max velocity",
        },
        researchNotes: [
          "Serve used as setup for +1 FH; accuracy prioritized in clutch moments.",
        ],
        sources: serenaServe.metrics.sources,
        kineticChain: {
          ...serenaServe.metrics.kineticChain,
          peakGrfN: 1900,
        },
        contactHeightM: 2.78,
        contactDepthM: 0.09,
        launchAngleDeg: -3.8,
        swingPathDeg: 6,
        impactDurationMs: 3.7,
        grip: "continental",
      },
    }),
    slice: cloneStroke(federerSlice, {
      label: "Backhand Slice",
      metrics: {
        ...federerSlice.metrics,
        peakRacketSpeedMs: 17.8,
        consistency: {
          contactHeightCv: 4.0,
          timingSdMs: 10,
          pathReproducibility: 94,
          signatureQuirk: "Neutralizing slice used to change rhythm and stay in the point",
        },
      },
    }),
  },
  federerDefaults,
);

const serenaDefaults: StrokeLibrary = fillStrokes(
  {
    forehand: cloneStroke(federerForehand, {
      label: "Power Forehand",
      metrics: {
        peakRacketSpeedMs: 30.5,
        avgSpinRpm: 2500,
        contactHeightM: 1.2,
        consistency: {
          contactHeightCv: 4.6,
          timingSdMs: 13,
          pathReproducibility: 91,
          signatureQuirk: "Early unit turn into open-stance power FH with fearless court position",
        },
        researchNotes: [
          "Among highest WTA FH ball speeds historically.",
          "Open stance + strong leg drive transfers mass into racket.",
        ],
        sources: federerForehand.metrics.sources,
        kineticChain: {
          sequence: ["legs", "hips", "trunk", "shoulder", "elbow", "wrist", "racket"],
          proximalDistalLagMs: 34,
          xFactorDeg: 46,
          peakGrfN: 1600,
        },
        contactDepthM: 0.42,
        launchAngleDeg: 7.5,
        swingPathDeg: 26,
        impactDurationMs: 4.0,
        grip: "semiWestern",
      },
    }),
    backhand: cloneStroke(djokovicBackhand, {
      label: "Two-Handed Backhand",
      metrics: {
        ...djokovicBackhand.metrics,
        peakRacketSpeedMs: 25.8,
        consistency: {
          contactHeightCv: 4.0,
          timingSdMs: 12,
          pathReproducibility: 92,
          signatureQuirk: "Aggressive BH flat drive taken early to seize time",
        },
      },
    }),
    serve: serenaServe,
    volley: cloneStroke(alcarazVolley, {
      metrics: {
        ...alcarazVolley.metrics,
        peakRacketSpeedMs: 15.0,
        consistency: {
          contactHeightCv: 5.5,
          timingSdMs: 9,
          pathReproducibility: 90,
          signatureQuirk: "Aggressive first volley after serve — punch through the court",
        },
      },
    }),
  },
  federerDefaults,
);

const alcarazDefaults: StrokeLibrary = fillStrokes(
  {
    forehand: cloneStroke(nadalForehand, {
      handedness: "right",
      label: "Forehand (Explosive)",
      metrics: {
        peakRacketSpeedMs: 30.8,
        avgSpinRpm: 3400,
        contactHeightM: 1.22,
        consistency: {
          contactHeightCv: 5.2,
          timingSdMs: 14,
          pathReproducibility: 89,
          signatureQuirk: "Drop-shot disguise from same unit turn as heavy FH — elite deception",
        },
        researchNotes: [
          "Modern semi-western/western hybrid with extreme athleticism.",
          "High RPM + net clearance creates clay/hard versatility.",
        ],
        sources: nadalForehand.metrics.sources,
        kineticChain: {
          sequence: ["legs", "hips", "trunk", "shoulder", "forearm", "wrist", "racket"],
          proximalDistalLagMs: 30,
          xFactorDeg: 50,
          peakGrfN: 1750,
        },
        contactDepthM: 0.38,
        launchAngleDeg: 12.0,
        swingPathDeg: 42,
        impactDurationMs: 4.5,
        grip: "semiWestern",
      },
    }),
    backhand: cloneStroke(djokovicBackhand, {
      metrics: {
        ...djokovicBackhand.metrics,
        peakRacketSpeedMs: 26.0,
        avgSpinRpm: 2550,
        consistency: {
          contactHeightCv: 4.4,
          timingSdMs: 12,
          pathReproducibility: 91,
          signatureQuirk: "Can flatten or shape BH; rising-ball aggression",
        },
      },
    }),
    serve: cloneStroke(serenaServe, {
      metrics: {
        peakRacketSpeedMs: 47.0,
        avgSpinRpm: 2700,
        contactHeightM: 2.8,
        consistency: {
          contactHeightCv: 3.0,
          timingSdMs: 13,
          pathReproducibility: 91,
          signatureQuirk: "Athletic leg drive with modern trophy — power into the court",
        },
        researchNotes: serenaServe.metrics.researchNotes,
        sources: serenaServe.metrics.sources,
        kineticChain: {
          sequence: ["legs", "trunk", "shoulder", "elbow", "wrist", "racket"],
          proximalDistalLagMs: 28,
          xFactorDeg: 54,
          peakGrfN: 2000,
        },
        contactDepthM: 0.1,
        launchAngleDeg: -3.2,
        swingPathDeg: 7,
        impactDurationMs: 3.7,
        grip: "continental",
      },
    }),
    volley: alcarazVolley,
    slice: cloneStroke(federerSlice, {
      metrics: {
        ...federerSlice.metrics,
        consistency: {
          contactHeightCv: 5.0,
          timingSdMs: 12,
          pathReproducibility: 90,
          signatureQuirk: "Slice used to set up drop-shot / attack patterns",
        },
      },
    }),
  },
  federerDefaults,
);

export const PLAYERS: PlayerProfile[] = [
  {
    id: "federer",
    name: "Roger Federer",
    shortName: "Federer",
    nationality: "Switzerland",
    era: "2003–2022",
    playingStyle: "All-court classic — efficiency, timing, disguise",
    dominantHand: "right",
    backhandStyle: "oneHanded",
    color: "#1B4F72",
    accent: "#F4D03F",
    anthropometrics: {
      heightM: 1.85,
      wingspanM: 1.88,
      massKg: 85,
      torsoRatio: 0.3,
      upperArmRatio: 0.186,
      forearmRatio: 0.146,
      thighRatio: 0.245,
      shankRatio: 0.246,
    },
    strokes: federerDefaults,
    biography:
      "Model of kinetic-chain efficiency. Lab and match analyses show high racket-path reproducibility with moderate spin and elite timing windows — form that looks effortless because proximal segments do the work.",
  },
  {
    id: "nadal",
    name: "Rafael Nadal",
    shortName: "Nadal",
    nationality: "Spain",
    era: "2001–2024",
    playingStyle: "Lefty baseliner — extreme topspin, grit, geometry",
    dominantHand: "left",
    backhandStyle: "twoHanded",
    color: "#1D8348",
    accent: "#E74C3C",
    anthropometrics: {
      heightM: 1.85,
      wingspanM: 1.9,
      massKg: 85,
      torsoRatio: 0.3,
      upperArmRatio: 0.186,
      forearmRatio: 0.146,
      thighRatio: 0.245,
      shankRatio: 0.246,
    },
    strokes: nadalDefaults,
    biography:
      "Defines the modern heavy-topspin forehand. Western grip, steep swing plane, and windshield-wiper follow-through produce unmatched RPM and net clearance — quirks that are biomechanically intentional.",
  },
  {
    id: "djokovic",
    name: "Novak Djokovic",
    shortName: "Djokovic",
    nationality: "Serbia",
    era: "2003–present",
    playingStyle: "Defensive-aggressive — flexibility, balance, BH wall",
    dominantHand: "right",
    backhandStyle: "twoHanded",
    color: "#5D6D7E",
    accent: "#5DADE2",
    anthropometrics: {
      heightM: 1.88,
      wingspanM: 1.95,
      massKg: 77,
      torsoRatio: 0.3,
      upperArmRatio: 0.186,
      forearmRatio: 0.146,
      thighRatio: 0.245,
      shankRatio: 0.246,
    },
    strokes: djokovicDefaults,
    biography:
      "Exceptional hip and thoracic ROM expand the viable contact zone. Two-handed backhand kinematics prioritize early preparation and head stability — consistency encoded in joint timing, not just talent.",
  },
  {
    id: "serena",
    name: "Serena Williams",
    shortName: "Serena",
    nationality: "USA",
    era: "1995–2022",
    playingStyle: "First-strike power — serve + FH dominance",
    dominantHand: "right",
    backhandStyle: "twoHanded",
    color: "#6C3483",
    accent: "#F5B041",
    anthropometrics: {
      heightM: 1.75,
      wingspanM: 1.8,
      massKg: 72,
      torsoRatio: 0.3,
      upperArmRatio: 0.186,
      forearmRatio: 0.146,
      thighRatio: 0.245,
      shankRatio: 0.246,
    },
    strokes: serenaDefaults,
    biography:
      "Serve kinetic chain is a textbook of proximal-to-distal sequencing: leg drive, trunk rotation, shoulder internal rotation, and wrist. Power with repeatable contact height under championship pressure.",
  },
  {
    id: "alcaraz",
    name: "Carlos Alcaraz",
    shortName: "Alcaraz",
    nationality: "Spain",
    era: "2021–present",
    playingStyle: "Modern explosive all-courter — RPM, drop shot, athleticism",
    dominantHand: "right",
    backhandStyle: "twoHanded",
    color: "#0E6655",
    accent: "#F39C12",
    anthropometrics: {
      heightM: 1.83,
      wingspanM: 1.88,
      massKg: 74,
      torsoRatio: 0.3,
      upperArmRatio: 0.186,
      forearmRatio: 0.146,
      thighRatio: 0.245,
      shankRatio: 0.246,
    },
    strokes: alcarazDefaults,
    biography:
      "Combines Nadal-like spin geometry with Federer-like all-court creativity. Biomechanically: high peak GRF, short proximal-distal lag, and disguise — same unit turn for FH drive or drop shot.",
  },
];

export function getPlayer(id: string): PlayerProfile | undefined {
  return PLAYERS.find((p) => p.id === id);
}

export function getStroke(playerId: string, stroke: StrokeType) {
  const player = getPlayer(playerId);
  return player?.strokes[stroke];
}

export const STROKE_LABELS: Record<StrokeType, string> = {
  forehand: "Forehand",
  backhand: "Backhand",
  serve: "Serve",
  slice: "Slice",
  volley: "Volley",
};
