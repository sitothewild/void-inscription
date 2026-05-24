import { create } from "zustand";
import {
  BOSS_HP,
  DAY_DURATION,
  GATE_ANGLES,
  GATE_HP,
  HERO_MAX_HP,
  NIGHT_DURATION,
  SEED_MAX_HP,
  WAVE_BASE_COUNT,
  WAVE_GROWTH,
} from "./constants";
import { generateWorld, type Resource } from "./world";
import type { RemotePlayerState, Snapshot } from "@/lib/net/codec";
import {
  WEAPONS,
  SHAMAN_COSTS,
  canAfford,
  computeLinks,
  type WeaponInventory,
  type WeaponKind,
  type ShamanItem,
} from "./weapons";

export type { Resource };

export type Enemy = {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  target: "hero" | "seed" | "gate";
  attackCd: number;
  kind: "grunt" | "boss";
};

export type Gate = {
  id: string;
  angle: number; // position around village
  hp: number;
  open: boolean;
  broken: boolean;
};

export type Phase = "day" | "night";
export type Status = "playing" | "won" | "lost";

export type Inventory = {
  wood: number;
  stone: number;
  fang: number;
  herb: number;
  mythril: number;
  weapons: WeaponInventory;
  seedWard: number; // bonus seed HP from wards (consumed at night)
};

type GameState = {
  seed: number;
  status: Status;
  phase: Phase;
  phaseTime: number;
  day: number;

  heroX: number;
  heroZ: number;
  heroHp: number;
  heroFacing: number;
  heroAttackCd: number;

  seedHp: number;
  gates: Gate[];

  resources: Resource[];
  enemies: Enemy[];
  inventory: Inventory;

  spawnedThisNight: number;
  toSpawnThisNight: number;
  bossSpawned: boolean;

  // Vendor UI
  openVendor: "smith" | "shaman" | null;

  // Multiplayer
  selfId: string | null;
  isHost: boolean;
  roomCode: string | null;
  selfName: string;
  selfColor: string;
  players: Record<string, RemotePlayerState>;

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
  damageGate: (id: string, n: number) => void;
  setGate: (id: string, patch: Partial<Gate>) => void;
  setGatesOpen: (open: boolean) => void;
  buyWeapon: (kind: WeaponKind, tier: 1 | 2 | 3) => boolean;
  buyShaman: (item: ShamanItem) => boolean;
  setOpenVendor: (v: "smith" | "shaman" | null) => void;
  addInventory: (patch: Partial<Inventory>) => void;
  setBossSpawned: (b: boolean) => void;

  setMultiplayer: (info: { selfId: string; roomCode: string; name: string; color: string }) => void;
  setHost: (isHost: boolean) => void;
  setPlayer: (id: string, p: RemotePlayerState) => void;
  removePlayer: (id: string) => void;
  applySnapshot: (snap: Snapshot) => void;
  leaveRoom: () => void;
};

function freshGates(): Gate[] {
  // Two gates on east/west sides of the hex
  return [
    { id: "g-e", angle: GATE_ANGLES[0], hp: GATE_HP, open: true, broken: false },
    { id: "g-w", angle: GATE_ANGLES[1], hp: GATE_HP, open: true, broken: false },
  ];
}

function freshInventory(): Inventory {
  return {
    wood: 0,
    stone: 0,
    fang: 0,
    herb: 0,
    mythril: 0,
    weapons: { sword: 0, bow: 0, hammer: 0 },
    seedWard: 0,
  };
}

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
    gates: freshGates(),
    resources: generateWorld(seed),
    enemies: [] as Enemy[],
    inventory: freshInventory(),
    spawnedThisNight: 0,
    toSpawnThisNight: 0,
    bossSpawned: false,
    openVendor: null as null | "smith" | "shaman",
  };
}

export const useGame = create<GameState>((set, get) => ({
  ...freshState(Math.floor(Math.random() * 1e9)),

  selfId: null,
  isHost: false,
  roomCode: null,
  selfName: "Viking",
  selfColor: "#3a6ea8",
  players: {},

  reset: (seed) =>
    set((s) => ({
      ...freshState(seed ?? Math.floor(Math.random() * 1e9)),
      selfId: s.selfId,
      isHost: s.isHost,
      roomCode: s.roomCode,
      selfName: s.selfName,
      selfColor: s.selfColor,
      players: {},
    })),

  setHero: (heroX, heroZ, heroFacing) => set({ heroX, heroZ, heroFacing }),
  setHeroAttackCd: (heroAttackCd) => set({ heroAttackCd }),

  damageHero: (n) =>
    set((s) => {
      const hp = Math.max(0, s.heroHp - n);
      return { heroHp: hp, status: hp <= 0 ? "lost" : s.status };
    }),

  damageSeed: (n) =>
    set((s) => {
      // Consume ward first
      let remaining = n;
      let ward = s.inventory.seedWard;
      const wardAbsorb = Math.min(ward, remaining);
      ward -= wardAbsorb;
      remaining -= wardAbsorb;
      const hp = Math.max(0, s.seedHp - remaining);
      return {
        seedHp: hp,
        inventory: { ...s.inventory, seedWard: ward },
        status: hp <= 0 ? "lost" : s.status,
      };
    }),

  damageResource: (id, n) =>
    set((s) => ({
      resources: s.resources.map((r) => (r.id === id ? { ...r, hp: r.hp - n } : r)),
    })),

  removeResource: (id) =>
    set((s) => {
      const res = s.resources.find((r) => r.id === id);
      if (!res) return {};
      const inv = { ...s.inventory };
      if (res.kind === "tree") inv.wood += 1;
      else if (res.kind === "rock") inv.stone += 1;
      else if (res.kind === "herb") inv.herb += 1;
      return {
        resources: s.resources.filter((r) => r.id !== id),
        inventory: inv,
      };
    }),

  addEnemy: (e) => set((s) => ({ enemies: [...s.enemies, e] })),

  damageEnemy: (id, n) =>
    set((s) => {
      const e = s.enemies.find((x) => x.id === id);
      if (!e) return {};
      const newHp = e.hp - n;
      if (newHp > 0) {
        return { enemies: s.enemies.map((x) => (x.id === id ? { ...x, hp: newHp } : x)) };
      }
      // Death drops
      const inv = { ...s.inventory };
      // Fang chance
      if (Math.random() < 0.25) inv.fang += 1;
      // Boss drops mythril guaranteed
      if (e.kind === "boss") inv.mythril += 1;
      return {
        enemies: s.enemies.filter((x) => x.id !== id),
        inventory: inv,
      };
    }),

  updateEnemy: (id, patch) =>
    set((s) => ({
      enemies: s.enemies.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  removeEnemy: (id) => set((s) => ({ enemies: s.enemies.filter((e) => e.id !== id) })),

  tickPhase: (dt) =>
    set((s) => {
      if (s.status !== "playing") return {};
      const t = s.phaseTime - dt;
      if (t > 0) return { phaseTime: t };
      if (s.phase === "day") {
        const toSpawn = WAVE_BASE_COUNT + (s.day - 1) * WAVE_GROWTH;
        return {
          phase: "night" as Phase,
          phaseTime: NIGHT_DURATION,
          spawnedThisNight: 0,
          toSpawnThisNight: toSpawn,
          bossSpawned: false,
        };
      } else {
        const nextDay = s.day + 1;
        if (nextDay > 5) {
          return { status: "won" as Status };
        }
        // Reopen and repair gates a bit at dawn
        const gates = s.gates.map((g) => ({
          ...g,
          open: !g.broken,
          hp: g.broken ? 0 : Math.min(GATE_HP, g.hp + 50),
        }));
        return {
          phase: "day" as Phase,
          phaseTime: DAY_DURATION,
          day: nextDay,
          enemies: [],
          gates,
          inventory: { ...s.inventory, seedWard: 0 }, // ward only lasts a night
        };
      }
    }),

  setStatus: (status) => set({ status }),

  damageGate: (id, n) =>
    set((s) => ({
      gates: s.gates.map((g) =>
        g.id === id
          ? {
              ...g,
              hp: Math.max(0, g.hp - n),
              broken: g.hp - n <= 0 ? true : g.broken,
              open: g.hp - n <= 0 ? true : g.open,
            }
          : g,
      ),
    })),

  setGate: (id, patch) =>
    set((s) => ({ gates: s.gates.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

  setGatesOpen: (open) =>
    set((s) => ({
      gates: s.gates.map((g) => (g.broken ? g : { ...g, open })),
    })),

  buyWeapon: (kind, tier) => {
    const s = get();
    const def = WEAPONS[kind][tier - 1];
    const cur = s.inventory.weapons[kind];
    if (cur >= tier) return false;
    if (cur !== tier - 1) return false; // must own previous tier
    if (s.day < def.minDay) return false;
    if (!canAfford(def.cost, s.inventory)) return false;
    const inv = { ...s.inventory };
    inv.wood -= def.cost.wood ?? 0;
    inv.stone -= def.cost.stone ?? 0;
    inv.fang -= def.cost.fang ?? 0;
    inv.herb -= def.cost.herb ?? 0;
    inv.mythril -= def.cost.mythril ?? 0;
    inv.weapons = { ...inv.weapons, [kind]: tier as 1 | 2 | 3 };
    set({ inventory: inv });
    return true;
  },

  buyShaman: (item) => {
    const s = get();
    const c = SHAMAN_COSTS[item];
    if (!canAfford(c, s.inventory)) return false;
    const inv = { ...s.inventory };
    inv.wood -= c.wood ?? 0;
    inv.stone -= c.stone ?? 0;
    inv.fang -= c.fang ?? 0;
    inv.herb -= c.herb ?? 0;
    inv.mythril -= c.mythril ?? 0;
    if (item === "mead") {
      set({ inventory: inv, heroHp: Math.min(HERO_MAX_HP, s.heroHp + 30) });
    } else if (item === "ward") {
      inv.seedWard += 50;
      set({ inventory: inv });
    }
    return true;
  },

  setOpenVendor: (openVendor) => set({ openVendor }),

  addInventory: (patch) =>
    set((s) => ({ inventory: { ...s.inventory, ...patch } })),

  setBossSpawned: (bossSpawned) => set({ bossSpawned }),

  setMultiplayer: ({ selfId, roomCode, name, color }) =>
    set({ selfId, roomCode, selfName: name, selfColor: color }),

  setHost: (isHost) => set({ isHost }),

  setPlayer: (id, p) => set((s) => ({ players: { ...s.players, [id]: p } })),

  removePlayer: (id) =>
    set((s) => {
      const next = { ...s.players };
      delete next[id];
      return { players: next };
    }),

  applySnapshot: (snap) =>
    set((s) => {
      const selfId = s.selfId;
      const players: Record<string, RemotePlayerState> = {};
      for (const [id, p] of Object.entries(snap.players)) {
        if (id !== selfId) players[id] = p;
      }
      let heroHp = s.heroHp;
      if (selfId && snap.players[selfId]) {
        heroHp = snap.players[selfId].hp;
      }
      return {
        phase: snap.phase,
        phaseTime: snap.phaseTime,
        day: snap.day,
        seedHp: snap.seedHp,
        status: snap.status,
        enemies: snap.enemies,
        resources: snap.resources,
        inventory: snap.inventory,
        gates: snap.gates,
        seed: snap.seed,
        players,
        heroHp,
      };
    }),

  leaveRoom: () =>
    set({
      selfId: null,
      isHost: false,
      roomCode: null,
      players: {},
    }),
}));

// Derived helpers
export function useLinks() {
  return computeLinks(useGame((s) => s.inventory.weapons));
}
