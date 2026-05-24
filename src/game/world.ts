import { ISLAND_RADIUS } from "./constants";
import { mulberry32 } from "./rng";

export type Resource = {
  id: string;
  kind: "tree" | "rock";
  x: number;
  z: number;
  hp: number;
};

export function generateWorld(seed: number) {
  const rng = mulberry32(seed);
  const resources: Resource[] = [];
  // Trees
  for (let i = 0; i < 90; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.hypot(x, z) < 5) continue; // keep base area clear
    resources.push({ id: `t${i}`, kind: "tree", x, z, hp: 3 });
  }
  // Rocks
  for (let i = 0; i < 35; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.hypot(x, z) < 5) continue;
    resources.push({ id: `r${i}`, kind: "rock", x, z, hp: 4 });
  }
  return resources;
}

export function isInsideIsland(x: number, z: number) {
  return Math.hypot(x, z) < ISLAND_RADIUS - 0.5;
}