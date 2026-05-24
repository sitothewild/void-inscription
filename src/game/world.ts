import { mulberry32 } from "./rng";
import { isValidResourceSpot, type Tile } from "./terrain";
import { ISLAND_RADIUS, VILLAGE_RADIUS } from "./constants";

export type Resource = {
  id: string;
  kind: "tree" | "rock" | "herb";
  x: number;
  z: number;
  hp: number;
};

export function generateWorld(seed: number, tiles: Tile[] = []) {
  const rng = mulberry32(seed);
  const resources: Resource[] = [];
  const spawn = (kind: Resource["kind"], count: number, hp: number, prefix: string) => {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 12) {
      attempts++;
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (!isValidResourceSpot(x, z, tiles)) continue;
      resources.push({ id: `${prefix}${placed}`, kind, x, z, hp });
      placed++;
    }
  };
  spawn("tree", 180, 3, "t");
  spawn("rock", 70, 4, "r");
  spawn("herb", 40, 1, "h");
  return resources;
}

export function isInsideIsland(x: number, z: number) {
  return Math.hypot(x, z) < ISLAND_RADIUS - 0.5;
}

export function isInsideVillage(x: number, z: number) {
  return Math.hypot(x, z) < VILLAGE_RADIUS;
}
