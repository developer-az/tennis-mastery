import type { MotionClip } from "@/lib/motion/types";
import federerForehand from "./federer/forehand.json";
import federerBackhand from "./federer/backhand.json";
import federerServe from "./federer/serve.json";
import federerSlice from "./federer/slice.json";
import federerVolley from "./federer/volley.json";
import nadalForehand from "./nadal/forehand.json";
import nadalBackhand from "./nadal/backhand.json";
import nadalServe from "./nadal/serve.json";
import nadalSlice from "./nadal/slice.json";
import nadalVolley from "./nadal/volley.json";
import djokovicForehand from "./djokovic/forehand.json";
import djokovicBackhand from "./djokovic/backhand.json";
import djokovicServe from "./djokovic/serve.json";
import djokovicSlice from "./djokovic/slice.json";
import djokovicVolley from "./djokovic/volley.json";
import serenaForehand from "./serena/forehand.json";
import serenaBackhand from "./serena/backhand.json";
import serenaServe from "./serena/serve.json";
import serenaSlice from "./serena/slice.json";
import serenaVolley from "./serena/volley.json";
import alcarazForehand from "./alcaraz/forehand.json";
import alcarazBackhand from "./alcaraz/backhand.json";
import alcarazServe from "./alcaraz/serve.json";
import alcarazSlice from "./alcaraz/slice.json";
import alcarazVolley from "./alcaraz/volley.json";
import sinnerForehand from "./sinner/forehand.json";
import sinnerBackhand from "./sinner/backhand.json";
import sinnerServe from "./sinner/serve.json";
import sinnerSlice from "./sinner/slice.json";
import sinnerVolley from "./sinner/volley.json";

const PACKED = [
  federerForehand,
  federerBackhand,
  federerServe,
  federerSlice,
  federerVolley,
  nadalForehand,
  nadalBackhand,
  nadalServe,
  nadalSlice,
  nadalVolley,
  djokovicForehand,
  djokovicBackhand,
  djokovicServe,
  djokovicSlice,
  djokovicVolley,
  serenaForehand,
  serenaBackhand,
  serenaServe,
  serenaSlice,
  serenaVolley,
  alcarazForehand,
  alcarazBackhand,
  alcarazServe,
  alcarazSlice,
  alcarazVolley,
  sinnerForehand,
  sinnerBackhand,
  sinnerServe,
  sinnerSlice,
  sinnerVolley,
] as MotionClip[];

export const MOTION_CLIPS: MotionClip[] = PACKED;
