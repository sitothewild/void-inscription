import { useMemo } from "react";
import { createNoise2D } from "simplex-noise";
import { biomeAt, type Biome } from "@/game/biomes";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TerrainData = {
  /** Normalized heights in [0, 1], row-major, (segments+1) x (segments+1). */
  heights: Float32Array;
  /** Vertices per side (segments + 1). */
  size: number;
  /** World-space side length. */
  worldSize: number;
  /** Max world-space height. */
  maxHeight: number;
  /** Sample normalized height at world (x, z). */
  sampleAt: (x: number, z: number) => number;
  /** Sample world-space y at world (x, z). */
  sampleWorldY: (x: number, z: number) => number;
  /** Sample biome at world (x, z). */
  biomeAt: (x: number, z: number) => Biome;
  seed: number;
  /** Radius of the flattened village pad (world units). */
  villageRadius: number;
};

export function useProceduralTerrain(
  seed: number,
  segments = 100,
  worldSize = 100,
  maxHeight = 12,
  villageRadius = 5,
): TerrainData {
  return useMemo(() => {
    const rng = mulberry32(seed);
    const noise = createNoise2D(rng);
    const noise2 = createNoise2D(rng);
    const noise3 = createNoise2D(rng);
    const n = segments + 1;
    const heights = new Float32Array(n * n);
    const half = worldSize / 2;
    const islandRadius = half * 0.95;

    const smoothstep = (t: number) => {
      const c = Math.max(0, Math.min(1, t));
      return c * c * (3 - 2 * c);
    };
    const PAD_H = 0.32; // plains-level village pad height
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = (i / segments) * worldSize - half;
        const z = (j / segments) * worldSize - half;

        // Fractal noise — gentler, more rolling hills. Big low-freq layer
        // dominates so the terrain reads as a coherent landscape rather
        // than spiky noise. High-freq layer is tiny micro-detail only.
        const biome = biomeAt(seed, x, z);
        const n1 = noise(x * 0.012, z * 0.012);          // continents
        const n2 = noise2(x * 0.035, z * 0.035);         // hills
        const n3 = noise3(x * 0.09, z * 0.09);           // micro
        let h = n1 * 0.7 + n2 * 0.25 + n3 * 0.05;
        h = (h + 1) / 2; // 0..1
        // Soften peaks — bias toward mid-range plains, keep some variance.
        h = Math.pow(h, 1.25);
        h = 0.18 + h * 0.72;
        if (biome === "desert") h = h * 0.6 + 0.12;
        if (biome === "tundra") h = h * 0.78 + 0.08;
        if (biome === "swamp") h = h * 0.5 + 0.05;
        if (biome === "forest") h = h * 0.9 + 0.06;

        // Smooth island falloff — wide flat plateau, soft beach ring.
        const d = Math.sqrt(x * x + z * z);
        const inner = islandRadius * 0.7;
        const mask = 1 - smoothstep((d - inner) / (islandRadius - inner));
        h *= mask;
        // Beach band — pull heights gently toward sea level near the edge
        // so we get a smooth shore instead of a cliff.
        const beach = smoothstep((d - islandRadius * 0.88) / (islandRadius * 0.15));
        h = h * (1 - beach * 0.85);

        // Flatten village center with a wide blend ring.
        const blend = 8;
        if (d < villageRadius) {
          h = PAD_H;
        } else if (d < villageRadius + blend) {
          const s = smoothstep((d - villageRadius) / blend);
          h = h * s + PAD_H * (1 - s);
        }

        heights[j * n + i] = h;
      }
    }

    // Single-pass 3x3 box smoothing to wash out any remaining noise spikes
    // without flattening the silhouette. Preserves the village pad area.
    const smoothed = new Float32Array(heights);
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const idx = j * n + i;
        const sum =
          heights[idx - n - 1] + heights[idx - n] + heights[idx - n + 1] +
          heights[idx - 1]     + heights[idx]     + heights[idx + 1] +
          heights[idx + n - 1] + heights[idx + n] + heights[idx + n + 1];
        smoothed[idx] = sum / 9;
      }
    }
    heights.set(smoothed);

    const sampleAt = (x: number, z: number) => {
      const fx = ((x + half) / worldSize) * segments;
      const fz = ((z + half) / worldSize) * segments;
      const i0 = Math.max(0, Math.min(segments, Math.floor(fx)));
      const j0 = Math.max(0, Math.min(segments, Math.floor(fz)));
      const i1 = Math.max(0, Math.min(segments, i0 + 1));
      const j1 = Math.max(0, Math.min(segments, j0 + 1));
      const tx = Math.max(0, Math.min(1, fx - i0));
      const tz = Math.max(0, Math.min(1, fz - j0));
      const a = heights[j0 * n + i0] * (1 - tx) + heights[j0 * n + i1] * tx;
      const b = heights[j1 * n + i0] * (1 - tx) + heights[j1 * n + i1] * tx;
      return a * (1 - tz) + b * tz;
    };
    const sampleWorldY = (x: number, z: number) => sampleAt(x, z) * maxHeight;
    const sampleBiome = (x: number, z: number) => biomeAt(seed, x, z);

    return {
      heights,
      size: n,
      worldSize,
      maxHeight,
      sampleAt,
      sampleWorldY,
      biomeAt: sampleBiome,
      seed,
      villageRadius,
    };
  }, [seed, segments, worldSize, maxHeight, villageRadius]);
}
