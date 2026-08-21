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
- **Supabase** (optional) for accounts + cloud sync
- Keyframed joint kinematics interpolated with smoothstep

## Data & accounts

**Today:** player profile, bag, sessions, and decisions live in **browser localStorage** (`strokeform-player-profile-v1`, `strokeform-my-setup`). No server database is required to use the app.

**Optional cloud:** connect [Supabase](https://supabase.com) to enable Tennis Warehouse–style sign-in and cross-device sync:

1. Create a Supabase project and run `supabase/migrations/001_strokeform_accounts.sql`
2. Copy `.env.example` → `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Enable email auth in Supabase dashboard

Account pages: `/account/login`, `/account/create`, `/account`. Without env vars the UI still works — data stays local and a guest path is offered.

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the form lab lives at `/lab`, gear lab at `/gear`.

## Deploy (Vercel recommended)

Strokeform is a Next.js App Router app with API routes and ISR for the Racqix racket catalog. **Vercel** is the intended host (zero-config Node runtime, live `/api/equipment/*`, and daily revalidation on `/gear`).

```bash
npm run build   # verify locally
npx vercel      # or connect the GitHub repo in the Vercel dashboard
```

GitHub Pages is a poor fit without a static-export rewrite: there is no `output: 'export'`, rackets use ISR, and equipment APIs need a Node server.

## Gear lab

- **Rackets** — modern frames (2019+) via the [Racqix Tennis Racquet Dataset](https://www.racqix.com/en/tennis-racquet-dataset) API, with offline snapshot fallback. Product photos resolve from Tennis Warehouse matches (SVG portrait fallback), filters (including string pattern), and compare-to-my-setup deltas for launch angle and swing path.
- **Strings** — curated catalog with a **poly family** filter (polyester + co-poly), gauge bands (e.g. 1.30 / 16g), shape filters, category learning blurbs, and tension-response modeling.
- **Grips** — overgrips and replacement grips with product photos plus tack / cushion / absorbency comparisons vs your saved grip.
- **Lead tape** — tap zones to place strips; stock-vs-taped table for weight, swingweight, balance, launch, and swing path. Saved with My setup.

Equipment JSON APIs at `/api/equipment/{rackets,strings,grips}` include `imageUrl` fields. Media routes `/api/equipment/.../image` redirect to Tennis Warehouse product photos when matched (`?format=svg` forces the portrait fallback). Zone docs: `/api/equipment/lead-tape/zones`.

## Data notes

Phase timings, racket speeds, spin rates, X-factor, and GRF estimates are synthesized from peer-reviewed tennis biomechanics literature (Elliott, Reid, Fleisig, Bahamonde, ITF coaching resources) and public match-tracking ranges. They are coaching-grade reconstructions for learning, not a claim of single-session mocap ownership. Gear scores are similarly coaching-grade models, not lab certificates.
