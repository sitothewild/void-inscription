import type { Enemy } from "@/game/store";
import type { Resource } from "@/game/world";

export type RemotePlayerState = {
  x: number;
  z: number;
  facing: number;
  name: string;
  color: string;
  hp: number;
};

export type Snapshot = {
  t: number; // server time
  phase: "day" | "night";
  phaseTime: number;
  day: number;
  seedHp: number;
  status: "playing" | "won" | "lost";
  enemies: Enemy[];
  resources: Resource[];
  players: Record<string, RemotePlayerState>;
  inventory: {
    wood: number;
    stone: number;
    axe: boolean;
    sword: boolean;
    palisade: number;
  };
  seed: number;
};

export type InputMsg = {
  type: "input";
  x: number;
  z: number;
  facing: number;
  name: string;
  color: string;
};

export type ActionMsg =
  | { type: "attack"; x: number; z: number; facing: number; sword: boolean }
  | { type: "craft"; item: "axe" | "sword" | "palisade" }
  | { type: "reset" };

export const PLAYER_COLORS = [
  "#3a6ea8",
  "#e07a3a",
  "#7a3aa8",
  "#3aa874",
  "#a83a6e",
  "#a89c3a",
] as const;

export function genRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}