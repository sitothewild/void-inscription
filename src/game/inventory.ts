import { useSyncExternalStore } from "react";

export type WeaponKind = "bow" | "sword";
export type WeaponTier = 1 | 2;

export type WeaponDef = {
  id: string;
  name: string;
  kind: WeaponKind;
  tier: WeaponTier;
  price: number;
  damage: number;
  vendor: string; // vendor label that sells it
  /** Hex color used for the icon tint so tiers read at a glance. */
  color: string;
  description: string;
};

/**
 * Starter catalog — two tiers per weapon family. We intentionally keep this
 * small until the animation pack bindings are finalized; more weapons get
 * added once aim/swing/cast clips are wired in.
 */
export const WEAPON_CATALOG: WeaponDef[] = [
  {
    id: "bow_t1",
    name: "Hunter's Shortbow",
    kind: "bow",
    tier: 1,
    price: 60,
    damage: 8,
    vendor: "Scout",
    color: "#c4a06b",
    description: "A simple yew bow. Reliable for small game.",
  },
  {
    id: "bow_t2",
    name: "Longbow of the Vale",
    kind: "bow",
    tier: 2,
    price: 220,
    damage: 18,
    vendor: "Scout",
    color: "#7fc7ff",
    description: "Elven longbow with reinforced limbs. Twice the draw.",
  },
  {
    id: "sword_t1",
    name: "Iron Shortsword",
    kind: "sword",
    tier: 1,
    price: 80,
    damage: 10,
    vendor: "Blacksmith",
    color: "#bfc7cc",
    description: "Forged from raw iron. Sturdy and dependable.",
  },
  {
    id: "sword_t2",
    name: "Steel Greatsword",
    kind: "sword",
    tier: 2,
    price: 260,
    damage: 22,
    vendor: "Blacksmith",
    color: "#e0ecff",
    description: "Folded steel blade with a deep blood groove.",
  },
];

export type InventoryState = {
  gold: number;
  owned: string[]; // weapon ids
  equipped: { bow: string | null; sword: string | null };
};

let state: InventoryState = {
  gold: 300,
  owned: [],
  equipped: { bow: null, sword: null },
};

const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export const inventory = {
  get(): InventoryState {
    return state;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  buy(id: string): { ok: boolean; reason?: string } {
    const w = WEAPON_CATALOG.find((x) => x.id === id);
    if (!w) return { ok: false, reason: "Unknown item" };
    if (state.owned.includes(id)) return { ok: false, reason: "Already owned" };
    if (state.gold < w.price) return { ok: false, reason: "Not enough gold" };
    state = {
      ...state,
      gold: state.gold - w.price,
      owned: [...state.owned, id],
      // Auto-equip if no weapon of that kind is currently equipped.
      equipped: {
        ...state.equipped,
        [w.kind]: state.equipped[w.kind] ?? id,
      },
    };
    emit();
    return { ok: true };
  },
  equip(id: string) {
    const w = WEAPON_CATALOG.find((x) => x.id === id);
    if (!w || !state.owned.includes(id)) return;
    state = { ...state, equipped: { ...state.equipped, [w.kind]: id } };
    emit();
  },
  addGold(n: number) {
    state = { ...state, gold: state.gold + n };
    emit();
  },
};

export function useInventory(): InventoryState {
  return useSyncExternalStore(
    (cb) => inventory.subscribe(cb),
    () => inventory.get(),
    () => inventory.get(),
  );
}

// ----- Nearby vendor registry (3D scene → UI bridge) -----

export type NearbyVendor = { label: string; pos: [number, number, number] } | null;
let nearby: NearbyVendor = null;
const nearListeners = new Set<() => void>();

export const vendorProximity = {
  set(v: NearbyVendor) {
    const same =
      (v === null && nearby === null) ||
      (v !== null && nearby !== null && v.label === nearby.label);
    if (same) return;
    nearby = v;
    for (const l of nearListeners) l();
  },
  get(): NearbyVendor {
    return nearby;
  },
  subscribe(l: () => void) {
    nearListeners.add(l);
    return () => nearListeners.delete(l);
  },
};

export function useNearbyVendor(): NearbyVendor {
  return useSyncExternalStore(
    (cb) => vendorProximity.subscribe(cb),
    () => vendorProximity.get(),
    () => vendorProximity.get(),
  );
}