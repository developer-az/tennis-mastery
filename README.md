# Strokeform

Scientific tennis form coaching — elite biomechanics visualized in interactive 3D.

## What it is

Strokeform maps published tennis biomechanics (joint angles, kinetic-chain timing, racket speed, spin, consistency metrics) onto real-scale 3D skeletal models of elite players. Scrub every phase of a groundstroke, serve, slice, or volley and orbit the court to understand form.

## Athletes

- Roger Federer
- Rafael Nadal
- Novak Djokovic
- Serena Williams
- Carlos Alcaraz

## Stack

- **Next.js** (App Router) + TypeScript
- **React Three Fiber** + Drei for the 3D viewport
- **Zustand** for lab state
- Keyframed joint kinematics interpolated with smoothstep

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the form lab lives at `/lab`, gear lab at `/gear`.

## Gear lab

- **Rackets** — modern frames (2019+) via the [Racqix Tennis Racquet Dataset](https://www.racqix.com/en/tennis-racquet-dataset) API, with offline snapshot fallback. Visualizes ideal launch angle, swing path, and style.
- **Strings** — curated catalog with spin potential, control comparison, and tension-response modeling.
- **Grips** — overgrips and replacement grips with tack / cushion / absorbency feel breakdowns.

## Data notes

Phase timings, racket speeds, spin rates, X-factor, and GRF estimates are synthesized from peer-reviewed tennis biomechanics literature (Elliott, Reid, Fleisig, Bahamonde, ITF coaching resources) and public match-tracking ranges. They are coaching-grade reconstructions for learning, not a claim of single-session mocap ownership. Gear scores are similarly coaching-grade models, not lab certificates.
