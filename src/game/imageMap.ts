/**
 * Loads the painted top-down map and turns it into per-cell biome data the
 * terrain generator can read. Each pixel is classified by nearest reference
 * color so the world layout matches the artwork.
 */

export type MapBiome =
  | "ocean"
  | "beach"
  | "river"
  | "snow"
  | "forest"
  | "meadow"
  | "swamp"
  | "hot_plains";

type RGB = [number, number, number];

const PALETTE: Array<{ biome: MapBiome; rgb: RGB }> = [
  { biome: "ocean",      rgb: [10, 22, 52] },
  { biome: "ocean",      rgb: [4, 16, 48] },
  { biome: "beach",      rgb: [210, 185, 140] },
  { biome: "beach",      rgb: [225, 205, 155] },
  { biome: "river",      rgb: [75, 150, 200] },
  { biome: "river",      rgb: [60, 175, 220] },
  { biome: "snow",       rgb: [230, 230, 225] },
  { biome: "snow",       rgb: [200, 200, 195] },
  { biome: "forest",     rgb: [55, 95, 45] },
  { biome: "forest",     rgb: [70, 110, 55] },
  { biome: "meadow",     rgb: [115, 150, 85] },
  { biome: "meadow",     rgb: [135, 170, 100] },
  { biome: "swamp",      rgb: [140, 110, 145] },
  { biome: "swamp",      rgb: [160, 130, 160] },
  { biome: "hot_plains", rgb: [140, 115, 80] },
  { biome: "hot_plains", rgb: [165, 140, 100] },
];

export type LoadedMap = {
  url: string;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** Sample biome for a normalized UV in [0,1]^2 (origin top-left). */
  sampleBiomeUV: (u: number, v: number) => MapBiome;
  /** Raw RGB sample at UV. */
  sampleRGBUV: (u: number, v: number) => RGB;
};

const cache = new Map<string, LoadedMap>();
const pending = new Map<string, Promise<LoadedMap>>();

function classify(r: number, g: number, b: number): MapBiome {
  let best: MapBiome = "meadow";
  let bestD = Infinity;
  for (const p of PALETTE) {
    const dr = r - p.rgb[0];
    const dg = g - p.rgb[1];
    const db = b - p.rgb[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = p.biome;
    }
  }
  return best;
}

function buildSamplers(loaded: Omit<LoadedMap, "sampleBiomeUV" | "sampleRGBUV">): LoadedMap {
  const { width, height, data } = loaded;
  const sampleRGBUV = (u: number, v: number): RGB => {
    const x = Math.max(0, Math.min(width - 1, Math.floor(u * width)));
    const y = Math.max(0, Math.min(height - 1, Math.floor(v * height)));
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const sampleBiomeUV = (u: number, v: number): MapBiome => {
    const [r, g, b] = sampleRGBUV(u, v);
    return classify(r, g, b);
  };
  return { ...loaded, sampleBiomeUV, sampleRGBUV };
}

/** Suspense-compatible loader: throws a promise until the image is decoded. */
export function loadMapSuspense(url: string): LoadedMap {
  const hit = cache.get(url);
  if (hit) return hit;
  let p = pending.get(url);
  if (!p) {
    p = new Promise<LoadedMap>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // Downsample for fast sampling — the source is 1640x1492 and we
          // only need ~512px of resolution to drive a 400-cell terrain.
          const maxDim = 512;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0, w, h);
          const id = ctx.getImageData(0, 0, w, h);
          const loaded = buildSamplers({
            url,
            width: w,
            height: h,
            data: id.data,
          });
          cache.set(url, loaded);
          resolve(loaded);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load map ${url}`));
      img.src = url;
    });
    pending.set(url, p);
  }
  // Mirror React's Suspense throw-promise pattern.
  const settled = cache.get(url);
  if (settled) return settled;
  throw p;
}

/** Default biome → base terrain height (normalized 0..1, applied before noise). */
export const BIOME_BASE_H: Record<MapBiome, number> = {
  ocean: 0.02,
  beach: 0.08,
  river: 0.10,
  swamp: 0.13,
  hot_plains: 0.20,
  meadow: 0.24,
  forest: 0.30,
  snow: 0.80,
};

/** Per-biome noise amplitude — how rugged that biome is. */
export const BIOME_NOISE_AMP: Record<MapBiome, number> = {
  ocean: 0.00,
  beach: 0.02,
  river: 0.00,
  swamp: 0.04,
  hot_plains: 0.06,
  meadow: 0.06,
  forest: 0.10,
  snow: 0.22,
};