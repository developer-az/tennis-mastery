import { create } from "zustand";
import type { StrokeType } from "@/types/biomechanics";
import { PLAYERS } from "@/data/players";

interface CoachState {
  playerId: string;
  stroke: StrokeType;
  /** Normalized playback 0–1 */
  t: number;
  playing: boolean;
  speed: number;
  showAngles: boolean;
  showRacketPath: boolean;
  showGroundForce: boolean;
  cameraMode: "orbit" | "side" | "behind" | "front";
  setPlayer: (id: string) => void;
  setStroke: (s: StrokeType) => void;
  setT: (t: number) => void;
  setPlaying: (p: boolean) => void;
  togglePlaying: () => void;
  setSpeed: (s: number) => void;
  setShowAngles: (v: boolean) => void;
  setShowRacketPath: (v: boolean) => void;
  setShowGroundForce: (v: boolean) => void;
  setCameraMode: (m: CoachState["cameraMode"]) => void;
}

export const useCoachStore = create<CoachState>((set) => ({
  playerId: PLAYERS[0].id,
  stroke: "forehand",
  t: 0,
  playing: true,
  speed: 0.35,
  showAngles: false,
  showRacketPath: true,
  showGroundForce: false,
  cameraMode: "orbit",
  setPlayer: (id) => set({ playerId: id, t: 0 }),
  setStroke: (s) => set({ stroke: s, t: 0 }),
  setT: (t) => set({ t }),
  setPlaying: (p) => set({ playing: p }),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  setShowAngles: (showAngles) => set({ showAngles }),
  setShowRacketPath: (showRacketPath) => set({ showRacketPath }),
  setShowGroundForce: (showGroundForce) => set({ showGroundForce }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
}));
