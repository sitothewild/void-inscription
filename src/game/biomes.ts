import { createNoise2D } from "simplex-noise";
import { Color } from "three";

export type Biome = "plains" | "forest" | "desert" | "tundra" | "mountains" | "swamp";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<
  number,
  {
    heat: ReturnType<typeof createNoise2D>;
    wet: ReturnType<typeof createNoise2D>;
    warp: ReturnType<typeof createNoise2D>;
  }
>();

function noises(seed: number) {
  const existing = cache.get(seed);
  if (existing) return existing;
  const rng = mulberry32(seed);
  const value = {
    heat: createNoise2D(rng),
    wet: createNoise2D(rng),
    warp: createNoise2D(rng),
  };
  cache.set(seed, value);
  return value;
}

export function biomeAt(seed: number, x: number, z: number): Biome {
  const n = noises(seed);
  const wx = x + n.warp(x * 0.008, z * 0.008) * 60;
  const wz = z + n.warp((x + 400) * 0.008, (z - 400) * 0.008) * 60;
  const heat = (n.heat(wx * 0.006, wz * 0.006) + 1) / 2;
  const wet = (n.wet((wx - 200) * 0.007, (wz + 200) * 0.007) + 1) / 2;
  if (heat < 0.25) return "tundra";
  if (heat > 0.72 && wet < 0.35) return "desert";
  if (wet > 0.72 && heat > 0.35) return "swamp";
  if (wet > 0.52) return "forest";
  return "plains";
}

export function biomeColor(biome: Biome, height: number, out = new Color()) {
  if (height < 0.18) return out.set("#e8d39a");
  if (height > 0.82) return out.set(biome === "tundra" ? "#eef6fb" : "#d8dee3");
  if (height > 0.68) return out.set(biome === "desert" ? "#b48a55" : "#76736c");
  if (biome === "forest") return out.set("#2f6b35");
  if (biome === "desert") return out.set("#cda66a");
  if (biome === "tundra") return out.set("#9fb6b5");
  if (biome === "swamp") return out.set("#365f3c");
  return out.set("#5fa84a");
}

export function biomePortalColor(biome: Biome) {
  if (biome === "forest") return "#40ff90";
  if (biome === "desert") return "#ffb347";
  if (biome === "tundra") return "#90d7ff";
  if (biome === "swamp") return "#8cff40";
  if (biome === "mountains") return "#d8e4ff";
  return "#6040ff";
}
