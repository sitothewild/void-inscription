import { useMemo } from "react";
import { createNoise2D } from "simplex-noise";
import type { Biome } from "@/game/biomes";
import {
  BIOME_BASE_H,
  BIOME_NOISE_AMP,
  loadMapSuspense,
  type MapBiome,
} from "@/game/imageMap";
import type { TerrainData } from "./useProceduralTerrain";

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

/** Map our source-image biomes onto the smaller Biome union used by Grass/Resources. */
function toBiome(m: MapBiome): Biome {
  switch (m) {
    case "snow":       return "tundra";
    case "forest":     return "forest";
    case "meadow":     return "plains";
    case "swamp":      return "swamp";
    case "hot_plains": return "desert";
    case "river":      return "swamp";
    case "beach":      return "desert";
    case "ocean":      return "desert";
  }
}

export type ImageTerrainData = TerrainData & {
  /** Lakes detected in the source as flat water disks. */
  lakes: Array<{ x: number; z: number; r: number }>;
  /** Waterfall points where rivers drop off a steep mountain face. */
  waterfalls: Array<{ x: number; y: number; z: number; height: number; dir: number }>;
  /** Per-vertex biome grid for downstream filters (size × size). */
  biomeGrid: MapBiome[];
  /** Convenience: source map URL. */
  mapUrl: string;
};

type Opts = {
  url: string;
  worldSize?: number;
  segments?: number;
  maxHeight?: number;
  seed?: number;
};

/**
 * Builds a TerrainData-compatible heightfield + biome map from a painted
 * top-down image. Suspends until the image has been decoded.
 */
export function useImageTerrain({
  url,
  worldSize = 2000,
  segments = 400,
  maxHeight = 80,
  seed = 7,
}: Opts): ImageTerrainData {
  const map = loadMapSuspense(url);

  return useMemo(() => {
    const n = segments + 1;
    const half = worldSize / 2;
    const heights = new Float32Array(n * n);
    const biomeGrid: MapBiome[] = new Array(n * n);

    const rng = mulberry32(seed);
    const nLow = createNoise2D(rng);
    const nMid = createNoise2D(rng);
    const nHi = createNoise2D(rng);

    // Pass 1 — classify biome per vertex from the source image.
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const u = i / segments;
        const v = j / segments;
        biomeGrid[j * n + i] = map.sampleBiomeUV(u, v);
      }
    }

    // Pass 2 — base height per biome + biome-masked fractal noise.
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        const b = biomeGrid[idx];
        const base = BIOME_BASE_H[b];
        const amp = BIOME_NOISE_AMP[b];
        const x = (i / segments) * worldSize - half;
        const z = (j / segments) * worldSize - half;
        const n1 = nLow(x * 0.0012, z * 0.0012);
        const n2 = nMid(x * 0.005, z * 0.005);
        const n3 = nHi(x * 0.02, z * 0.02);
        const detail = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
        heights[idx] = base + detail * amp;
      }
    }

    // Pass 3 — multiple smoothing passes for walkable slopes. Snow stays
    // rugged but everything else gets softened.
    const tmp = new Float32Array(heights);
    for (let pass = 0; pass < 4; pass++) {
      for (let j = 1; j < n - 1; j++) {
        for (let i = 1; i < n - 1; i++) {
          const idx = j * n + i;
          const sum =
            heights[idx - n - 1] + heights[idx - n] + heights[idx - n + 1] +
            heights[idx - 1]     + heights[idx]     + heights[idx + 1] +
            heights[idx + n - 1] + heights[idx + n] + heights[idx + n + 1];
          tmp[idx] = sum / 9;
        }
      }
      heights.set(tmp);
    }

    // Pass 4 — slope cap so the player can climb. Cell size ≈ worldSize/segments
    // (5m at defaults). 0.04 of maxHeight (80m) = ~3.2m per cell ≈ 33°.
    const maxStep = 0.04;
    for (let pass = 0; pass < 5; pass++) {
      let changed = false;
      for (let j = 1; j < n - 1; j++) {
        for (let i = 1; i < n - 1; i++) {
          const idx = j * n + i;
          const h = heights[idx];
          const neigh = [
            heights[idx - 1], heights[idx + 1],
            heights[idx - n], heights[idx + n],
          ];
          for (const nh of neigh) {
            const diff = h - nh;
            if (diff > maxStep) {
              heights[idx] = nh + maxStep;
              changed = true;
            } else if (diff < -maxStep) {
              heights[idx] = nh - maxStep;
              changed = true;
            }
          }
        }
      }
      if (!changed) break;
    }

    // Pass 5 — waterfall detection: rivers adjacent to a sharp downhill
    // gradient (typically where snow drops to forest).
    const waterfalls: Array<{ x: number; y: number; z: number; height: number; dir: number }> = [];
    const cellSize = worldSize / segments;
    for (let j = 2; j < n - 2; j += 2) {
      for (let i = 2; i < n - 2; i += 2) {
        const idx = j * n + i;
        const b = biomeGrid[idx];
        if (b !== "river" && b !== "snow") continue;
        const h = heights[idx];
        // Find steepest downhill neighbor.
        let bestDrop = 0;
        let bestDir = 0;
        const dirs: Array<[number, number, number]> = [
          [1, 0, 0],
          [-1, 0, Math.PI],
          [0, 1, Math.PI / 2],
          [0, -1, -Math.PI / 2],
        ];
        for (const [di, dj, rot] of dirs) {
          const nh = heights[idx + dj * n + di];
          const drop = h - nh;
          if (drop > bestDrop) {
            bestDrop = drop;
            bestDir = rot;
          }
        }
        // Convert to world units. Need > 6m drop within one cell to qualify.
        const dropMeters = bestDrop * maxHeight;
        if (dropMeters > 4 && b === "snow") {
          const x = (i / segments) * worldSize - half;
          const z = (j / segments) * worldSize - half;
          const y = h * maxHeight;
          // Dedupe — skip if within 40m of an existing waterfall.
          const dup = waterfalls.some(
            (w) => Math.hypot(w.x - x, w.z - z) < 40,
          );
          if (!dup) {
            waterfalls.push({ x, y, z, height: Math.min(dropMeters * 1.6, 25), dir: bestDir });
          }
        }
      }
    }

    // Pass 6 — lakes: scan the river/water cells, cluster, treat large blobs
    // as lakes. Keep up to 4 biggest.
    const visited = new Uint8Array(n * n);
    const clusters: Array<{ cx: number; cz: number; count: number }> = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        if (visited[idx]) continue;
        if (biomeGrid[idx] !== "river") continue;
        // Flood-fill
        const stack = [idx];
        let count = 0;
        let sumX = 0;
        let sumZ = 0;
        while (stack.length) {
          const cur = stack.pop()!;
          if (visited[cur]) continue;
          visited[cur] = 1;
          if (biomeGrid[cur] !== "river") continue;
          count++;
          const ci = cur % n;
          const cj = (cur - ci) / n;
          sumX += (ci / segments) * worldSize - half;
          sumZ += (cj / segments) * worldSize - half;
          if (ci > 0) stack.push(cur - 1);
          if (ci < n - 1) stack.push(cur + 1);
          if (cj > 0) stack.push(cur - n);
          if (cj < n - 1) stack.push(cur + n);
        }
        if (count > 40) {
          clusters.push({ cx: sumX / count, cz: sumZ / count, count });
        }
      }
    }
    clusters.sort((a, b) => b.count - a.count);
    const lakes = clusters.slice(0, 4).map((c) => ({
      x: c.cx,
      z: c.cz,
      r: Math.max(18, Math.sqrt(c.count) * cellSize * 0.7),
    }));

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
      const c = heights[j1 * n + i0] * (1 - tx) + heights[j1 * n + i1] * tx;
      return a * (1 - tz) + c * tz;
    };
    const sampleWorldY = (x: number, z: number) => sampleAt(x, z) * maxHeight;
    const sampleBiomeAt = (x: number, z: number): Biome => {
      const fx = ((x + half) / worldSize) * segments;
      const fz = ((z + half) / worldSize) * segments;
      const i = Math.max(0, Math.min(segments, Math.round(fx)));
      const j = Math.max(0, Math.min(segments, Math.round(fz)));
      return toBiome(biomeGrid[j * n + i]);
    };

    return {
      heights,
      size: n,
      worldSize,
      maxHeight,
      sampleAt,
      sampleWorldY,
      biomeAt: sampleBiomeAt,
      seed,
      villageRadius: 0,
      lakes,
      waterfalls,
      biomeGrid,
      mapUrl: url,
    };
  }, [map, worldSize, segments, maxHeight, seed, url]);
}