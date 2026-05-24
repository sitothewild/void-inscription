import { useMemo } from "react";
import { createNoise2D } from "simplex-noise";

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

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = (i / segments) * worldSize - half;
        const z = (j / segments) * worldSize - half;

        // Fractal noise
        let h =
          noise(x * 0.025, z * 0.025) * 0.6 +
          noise2(x * 0.06, z * 0.06) * 0.3 +
          noise3(x * 0.15, z * 0.15) * 0.1;
        h = (h + 1) / 2; // 0..1

        // Circular island mask — falls to 0 at edge
        const d = Math.sqrt(x * x + z * z);
        const mask = Math.max(0, 1 - Math.pow(d / islandRadius, 2.2));
        h *= mask;

        // Flatten village center
        if (d < villageRadius) {
          h = 0.35; // plains-level pad
        } else if (d < villageRadius + 2) {
          const t = (d - villageRadius) / 2;
          h = h * t + 0.35 * (1 - t);
        }

        heights[j * n + i] = h;
      }
    }

    const sampleAt = (x: number, z: number) => {
      const fx = ((x + half) / worldSize) * segments;
      const fz = ((z + half) / worldSize) * segments;
      const i = Math.max(0, Math.min(segments, Math.floor(fx)));
      const j = Math.max(0, Math.min(segments, Math.floor(fz)));
      return heights[j * n + i];
    };
    const sampleWorldY = (x: number, z: number) => sampleAt(x, z) * maxHeight;

    return { heights, size: n, worldSize, maxHeight, sampleAt, sampleWorldY };
  }, [seed, segments, worldSize, maxHeight, villageRadius]);
}