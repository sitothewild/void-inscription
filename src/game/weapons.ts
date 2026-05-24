export type WeaponKind = "sword" | "bow" | "hammer";
export type Tier = 0 | 1 | 2 | 3;
export type WeaponInventory = Record<WeaponKind, Tier>;
export type ShamanItem = "mead" | "ward";

export const WEAPON_LABELS: Record<WeaponKind, Record<1 | 2 | 3, string>> = {
  sword: { 1: "Iron Sword", 2: "Steel Sword", 3: "Yggdrasil Blade" },
  bow: { 1: "Hunter Bow", 2: "Longbow", 3: "Stormcaller Bow" },
  hammer: { 1: "Stone Hammer", 2: "War Hammer", 3: "Mjolnir" },
};

export const LINK_LABELS: Record<WeaponKind, string> = {
  sword: "Edge",
  bow: "Sight",
  hammer: "Foundation",
};

export type Cost = {
  wood?: number;
  stone?: number;
  fang?: number;
  herb?: number;
  mythril?: number;
};

export type WeaponDef = {
  tier: 1 | 2 | 3;
  minDay: number;
  cost: Cost;
};

export const WEAPONS: Record<WeaponKind, WeaponDef[]> = {
  sword: [
    { tier: 1, minDay: 1, cost: { wood: 5, stone: 3 } },
    { tier: 2, minDay: 3, cost: { stone: 10, fang: 2 } },
    { tier: 3, minDay: 5, cost: { mythril: 1, fang: 5, stone: 15 } },
  ],
  bow: [
    { tier: 1, minDay: 1, cost: { wood: 8, fang: 1 } },
    { tier: 2, minDay: 3, cost: { wood: 15, fang: 3 } },
    { tier: 3, minDay: 5, cost: { mythril: 1, fang: 4, wood: 10 } },
  ],
  hammer: [
    { tier: 1, minDay: 1, cost: { stone: 8, wood: 2 } },
    { tier: 2, minDay: 3, cost: { stone: 18, fang: 1 } },
    { tier: 3, minDay: 5, cost: { mythril: 1, stone: 25, fang: 3 } },
  ],
};

export const SHAMAN_COSTS: Record<ShamanItem, Cost & { label: string; desc: string }> = {
  mead: { herb: 2, label: "Healing Mead", desc: "Restore 30 HP" },
  ward: { stone: 5, label: "Seed Ward", desc: "+50 Seed HP" },
};

// ---- Damage / range computation from weapon tiers ----
export function damageMultiplier(w: WeaponInventory) {
  // sword tier scales damage; hammer adds small bonus
  const swordMul = [1, 1.5, 2, 3][w.sword];
  const hammerBonus = w.hammer * 0.15;
  return swordMul + hammerBonus;
}

export function rangeMultiplier(w: WeaponInventory) {
  // bow tier extends reach
  return 1 + w.bow * 0.5;
}

// ---- Link abilities (active derived state) ----
export type LinkAbilities = {
  edge: boolean; // sword>=1: wider attack arc
  sight: boolean; // bow>=1
  foundation: boolean; // hammer>=1: gates take 50% less dmg
  berserker: boolean; // sword>=1 && hammer>=1: +15% move at night
  warden: boolean; // bow>=2 && hammer>=2: gates self-heal
  allfather: boolean; // all T3
};

export function computeLinks(w: WeaponInventory): LinkAbilities {
  return {
    edge: w.sword >= 1,
    sight: w.bow >= 1,
    foundation: w.hammer >= 1,
    berserker: w.sword >= 1 && w.hammer >= 1,
    warden: w.bow >= 2 && w.hammer >= 2,
    allfather: w.sword === 3 && w.bow === 3 && w.hammer === 3,
  };
}

export function canAfford(cost: Cost, inv: {
  wood: number; stone: number; fang: number; herb: number; mythril: number;
}): boolean {
  return (
    (cost.wood ?? 0) <= inv.wood &&
    (cost.stone ?? 0) <= inv.stone &&
    (cost.fang ?? 0) <= inv.fang &&
    (cost.herb ?? 0) <= inv.herb &&
    (cost.mythril ?? 0) <= inv.mythril
  );
}

export function formatCost(c: Cost): string {
  const parts: string[] = [];
  if (c.wood) parts.push(`${c.wood}W`);
  if (c.stone) parts.push(`${c.stone}S`);
  if (c.fang) parts.push(`${c.fang}F`);
  if (c.herb) parts.push(`${c.herb}H`);
  if (c.mythril) parts.push(`${c.mythril}My`);
  return parts.join(" ");
}
