import type { PlayStroke, PlayStruggle } from "@/types/playerProfile";

export type DrillStroke = PlayStroke | "any";

export interface Drill {
  id: string;
  title: string;
  why: string;
  stroke: DrillStroke;
  struggles: PlayStruggle[];
  steps: string[];
  labHref?: string;
  gearHref?: string;
}

export const DRILLS: Drill[] = [
  {
    id: "early-unit-turn",
    title: "Earlier unit turn",
    why: "If you’re late, the racket isn’t back before the bounce.",
    stroke: "forehand",
    struggles: ["framing", "dumping"],
    steps: [
      "Shadow 10 swings: shoulders turn as the ball leaves the opponent’s strings.",
      "Hit 20 crosscourts with the tip already dropping before the bounce.",
      "On wide balls, turn first — then step.",
    ],
    labHref: "/lab?stroke=forehand",
  },
  {
    id: "catch-ball-early",
    title: "Catch the ball earlier",
    why: "Late contact opens the face and the ball sails or frames.",
    stroke: "forehand",
    struggles: ["flying", "framing"],
    steps: [
      "Feed drills: take contact out in front at waist–chest.",
      "Freeze at contact for 3 balls and check the mark on the strings.",
      "Aim a meter inside the line before going for targets.",
    ],
    labHref: "/lab?stroke=forehand",
  },
  {
    id: "bh-window",
    title: "Backhand contact window",
    why: "Framing on the BH is usually the window, not the string.",
    stroke: "backhand",
    struggles: ["framing"],
    steps: [
      "Rehearse the BH in Form Lab with your grip-derived face.",
      "Hit 15 compact backhands — short takeback, meet it in front.",
      "If it still frames, check the grip hasn’t slipped off your FH bevel.",
    ],
    labHref: "/lab?stroke=backhand",
  },
  {
    id: "split-step",
    title: "Split-step + first step",
    why: "A small hoop needs your feet to find the middle of the strings.",
    stroke: "movement",
    struggles: ["framing", "dumping"],
    steps: [
      "Split-step as the opponent hits, then first step toward the bounce.",
      "Arrive balanced at waist height — don’t reach up or stab.",
      "10 shadow recoveries: split, step, recover to the middle.",
    ],
  },
  {
    id: "brush-up",
    title: "Brush up the back of the ball",
    why: "Flat contact underuses a spin frame — you’ll dump or spray.",
    stroke: "forehand",
    struggles: ["no_spin", "dumping"],
    steps: [
      "Low-to-high shadow swings through the chest window.",
      "High FH feeds: brush up, don’t slap.",
      "If balls still dump, the face may be too open — close it a bevel.",
    ],
    labHref: "/lab?stroke=forehand",
  },
  {
    id: "through-contact",
    title: "Accelerate through the middle",
    why: "Pushy balls die when you arm the shot instead of swinging through.",
    stroke: "forehand",
    struggles: ["dumping"],
    steps: [
      "Hit 20 crosscourts focusing on accelerating through the face center.",
      "On short balls, step in and take contact out front — don’t wait.",
      "Finish the swing; don’t steer with the wrist.",
    ],
    labHref: "/lab?stroke=forehand",
  },
  {
    id: "inside-the-line",
    title: "Aim inside the line",
    why: "Easy power becomes long errors when you aim at the tape.",
    stroke: "forehand",
    struggles: ["flying"],
    steps: [
      "10 minutes aiming a meter inside the sideline.",
      "On defense, shorten the backswing — let the frame’s mass work.",
      "If it still flies, catch it earlier rather than swinging bigger.",
    ],
  },
  {
    id: "serve-toss-hold",
    title: "Serve toss you can hit",
    why: "A wandering toss is the fastest way to spray the serve.",
    stroke: "serve",
    struggles: ["flying", "dumping"],
    steps: [
      "Toss 15 balls to the same window — let them drop, don’t hit yet.",
      "Then 10 serves: pause at trophy, then go.",
      "If they fly long, contact a touch further in front.",
    ],
    labHref: "/lab?stroke=serve",
  },
  {
    id: "compact-serve",
    title: "Compact first serve",
    why: "A big loop on a first serve is hard to time when you’re tight.",
    stroke: "serve",
    struggles: ["framing", "flying"],
    steps: [
      "Shadow a shorter takeback — racket up, not around.",
      "8 first serves at 70% into a big target.",
      "Add pace only after 6 in a row land.",
    ],
    labHref: "/lab?stroke=serve",
  },
  {
    id: "volley-punch",
    title: "Volley punch, don’t swing",
    why: "A long swing at net is late before you start.",
    stroke: "volley",
    struggles: ["framing", "dumping"],
    steps: [
      "Catch volleys in front with a firm wrist — no backswing.",
      "Step to the ball; don’t reach.",
      "10 forehand / 10 backhand volleys, punch and recover.",
    ],
    labHref: "/lab?stroke=volley",
  },
  {
    id: "grip-check",
    title: "Fresh grip check",
    why: "A slick handle makes every stroke feel late.",
    stroke: "any",
    struggles: ["grip_slip"],
    steps: [
      "Replace the overgrip on both frames the same way.",
      "Play one session before changing size or stack.",
      "If it still slips, dry-tack or a thinner stack — one change only.",
    ],
    gearHref: "/gear?tab=grips",
  },
  {
    id: "arm-friendly-week",
    title: "Softer week for the arm",
    why: "If the elbow talks, technique still matters — but the bed can wait.",
    stroke: "any",
    struggles: ["arm"],
    steps: [
      "Keep the same frame. Drop tension ~2 lbs or play a softer bed.",
      "Skip the biggest first serves for a few days.",
      "If it still whispers, log it on Play so we stop chasing power frames.",
    ],
    gearHref: "/gear?tab=strings",
  },
];

export function drillById(id: string): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
}
