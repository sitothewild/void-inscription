import type { Enemy, Gate, Inventory } from "@/game/store";
import type { Resource } from "@/game/world";
import type { ShamanItem, WeaponKind } from "@/game/weapons";

export type RemotePlayerState = {
  x: number;
  z: number;
  facing: number;
  name: string;
  color: string;
  hp: number;
};

export type Snapshot = {
  t: number;
  phase: "day" | "night";
  phaseTime: number;
  day: number;
  seedHp: number;
  status: "playing" | "won" | "lost";
  enemies: Enemy[];
  resources: Resource[];
  gates: Gate[];
  players: Record<string, RemotePlayerState>;
  inventory: Inventory;
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
  | { type: "attack"; x: number; z: number; facing: number; damageMul: number; range: number }
  | { type: "buy-weapon"; kind: WeaponKind; tier: 1 | 2 | 3 }
  | { type: "buy-shaman"; item: ShamanItem }
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
