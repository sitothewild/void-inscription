import { create } from "zustand";
import {
  DAY_DURATION,
  HERO_MAX_HP,
  NIGHT_DURATION,
  SEED_MAX_HP,
  WAVE_BASE_COUNT,
  WAVE_GROWTH,
} from "./constants";
import { generateWorld, type Resource } from "./world";

export type Enemy = {
  id: string;
  x: number;
  z: number;
  hp: number;
  target: "hero" | "seed";
  attackCd: number;
};

export type Phase = "day" | "night";
export type Status = "playing" | "won" | "lost";

export type Inventory = {
  wood: number;
  stone: number;
  axe: boolean;
  sword: boolean;
  palisade: number;
};

type GameState = {
  seed: number;
  status: Status;
  phase: Phase;
  phaseTime: number; // seconds remaining in current phase
  day: number;

  heroX: number;
  heroZ: number;
  heroHp: number;
  heroFacing: number; // radians
  heroAttackCd: number;

  seedHp: number;

  resources: Resource[];
  enemies: Enemy[];
  inventory: Inventory;

  spawnedThisNight: number;
  toSpawnThisNight: number;

  reset: (seed?: number) => void;
  setHero: (x: number, z: number, facing: number) => void;
  damageHero: (n: number) => void;
  damageSeed: (n: number) => void;
  damageResource: (id: string, n: number) => void;
  removeResource: (id: string) => void;
  addEnemy: (e: Enemy) => void;
  damageEnemy: (id: string, n: number) => void;
  updateEnemy: (id: string, patch: Partial<Enemy>) => void;
  removeEnemy: (id: string) => void;
  setHeroAttackCd: (n: number) => void;
  tickPhase: (dt: number) => void;
  setStatus: (s: Status) => void;
  craft: (item: "axe" | "sword" | "palisade") => void;
};

function freshState(seed: number) {
  return {
    seed,
    status: "playing" as Status,
    phase: "day" as Phase,
    phaseTime: DAY_DURATION,
    day: 1,
    heroX: 0,
    heroZ: 4,
    heroHp: HERO_MAX_HP,
    heroFacing: 0,
    heroAttackCd: 0,
    seedHp: SEED_MAX_HP,
    resources: generateWorld(seed),
    enemies: [] as Enemy[],
    inventory: { wood: 0, stone: 0, axe: false, sword: false, palisade: 0 } as Inventory,
    spawnedThisNight: 0,
    toSpawnThisNight: 0,
  };
}

export const useGame = create<GameState>((set, get) => ({
  ...freshState(Math.floor(Math.random() * 1e9)),

  reset: (seed) =>
    set(() => freshState(seed ?? Math.floor(Math.random() * 1e9))),

  setHero: (heroX, heroZ, heroFacing) => set({ heroX, heroZ, heroFacing }),
  setHeroAttackCd: (heroAttackCd) => set({ heroAttackCd }),

  damageHero: (n) =>
    set((s) => {
      const hp = Math.max(0, s.heroHp - n);
      return { heroHp: hp, status: hp <= 0 ? "lost" : s.status };
    }),

  damageSeed: (n) =>
    set((s) => {
      const hp = Math.max(0, s.seedHp - n);
      return { seedHp: hp, status: hp <= 0 ? "lost" : s.status };
    }),

  damageResource: (id, n) =>
    set((s) => ({
      resources: s.resources.map((r) =>
        r.id === id ? { ...r, hp: r.hp - n } : r,
      ),
    })),

  removeResource: (id) =>
    set((s) => {
      const res = s.resources.find((r) => r.id === id);
      if (!res) return {};
      const inv = { ...s.inventory };
      if (res.kind === "tree") inv.wood += 1 + (s.inventory.axe ? 1 : 0);
      else inv.stone += 1;
      return {
        resources: s.resources.filter((r) => r.id !== id),
        inventory: inv,
      };
    }),

  addEnemy: (e) => set((s) => ({ enemies: [...s.enemies, e] })),

  damageEnemy: (id, n) =>
    set((s) => ({
      enemies: s.enemies
        .map((e) => (e.id === id ? { ...e, hp: e.hp - n } : e))
        .filter((e) => e.hp > 0),
    })),

  updateEnemy: (id, patch) =>
    set((s) => ({
      enemies: s.enemies.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  removeEnemy: (id) =>
    set((s) => ({ enemies: s.enemies.filter((e) => e.id !== id) })),

  tickPhase: (dt) =>
    set((s) => {
      if (s.status !== "playing") return {};
      const t = s.phaseTime - dt;
      if (t > 0) return { phaseTime: t };
      // Phase change
      if (s.phase === "day") {
        const toSpawn = WAVE_BASE_COUNT + (s.day - 1) * WAVE_GROWTH;
        return {
          phase: "night" as Phase,
          phaseTime: NIGHT_DURATION,
          spawnedThisNight: 0,
          toSpawnThisNight: toSpawn,
        };
      } else {
        // Survived night
        const nextDay = s.day + 1;
        if (nextDay > 5) {
          return { status: "won" as Status };
        }
        return {
          phase: "day" as Phase,
          phaseTime: DAY_DURATION,
          day: nextDay,
          enemies: [],
        };
      }
    }),

  setStatus: (status) => set({ status }),

  craft: (item) =>
    set((s) => {
      const inv = { ...s.inventory };
      if (item === "axe" && !inv.axe && inv.wood >= 5 && inv.stone >= 2) {
        inv.wood -= 5;
        inv.stone -= 2;
        inv.axe = true;
      } else if (item === "sword" && !inv.sword && inv.wood >= 3 && inv.stone >= 5) {
        inv.wood -= 3;
        inv.stone -= 5;
        inv.sword = true;
      } else if (item === "palisade" && inv.wood >= 4) {
        inv.wood -= 4;
        inv.palisade += 1;
      } else {
        return {};
      }
      return { inventory: inv };
    }),
}));