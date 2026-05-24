import { ISLAND_RADIUS, VILLAGE_RADIUS } from "./constants";
import { mulberry32 } from "./rng";

export type Resource = {
  id: string;
  kind: "tree" | "rock" | "herb";
  x: number;
  z: number;
  hp: number;
};

export function generateWorld(seed: number) {
  const rng = mulberry32(seed);
  const resources: Resource[] = [];
  const minClear = VILLAGE_RADIUS + 1.5;
  // Trees
  for (let i = 0; i < 90; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.hypot(x, z) < minClear) continue;
    resources.push({ id: `t${i}`, kind: "tree", x, z, hp: 3 });
  }
  // Rocks
  for (let i = 0; i < 35; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.hypot(x, z) < minClear) continue;
    resources.push({ id: `r${i}`, kind: "rock", x, z, hp: 4 });
  }
  // Herb bushes (fewer, only outside village)
  for (let i = 0; i < 20; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.hypot(x, z) < minClear) continue;
    resources.push({ id: `h${i}`, kind: "herb", x, z, hp: 1 });
  }
  return resources;
}

export function isInsideIsland(x: number, z: number) {
  return Math.hypot(x, z) < ISLAND_RADIUS - 0.5;
}

export function isInsideVillage(x: number, z: number) {
  return Math.hypot(x, z) < VILLAGE_RADIUS;
}
