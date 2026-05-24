import { mulberry32 } from "./rng";
import {
  GRID_RADIUS,
  ISLAND_RADIUS,
  LAYER_HEIGHT,
  TILE_SIZE,
  VILLAGE_RADIUS,
} from "./constants";

export type RampDir = { dx: -1 | 0 | 1; dz: -1 | 0 | 1 };

export type Tile = {
  gx: number;
  gz: number;
  layer: number; // height in layers (1+ for raised; ramps record their high-side layer)
  kind: "slab" | "ramp";
  rampDir?: RampDir; // unit direction from ramp tile centre toward its HIGH edge
};

/** Convert grid cell coords to world center. */
export function tileWorld(gx: number, gz: number) {
  return { x: gx * TILE_SIZE, z: gz * TILE_SIZE };
}

function key(gx: number, gz: number) {
  return `${gx},${gz}`;
}

function insideIsland(gx: number, gz: number) {
  const { x, z } = tileWorld(gx, gz);
  // tile centre must comfortably be inside island; allow village
  return Math.hypot(x, z) < ISLAND_RADIUS - 1.5;
}

function insideVillage(gx: number, gz: number) {
  const { x, z } = tileWorld(gx, gz);
  // exclude tiles whose centre is anywhere near the village footprint
  return Math.hypot(x, z) < VILLAGE_RADIUS + TILE_SIZE * 0.6;
}

/** Deterministic two-layer slab world. */
export function generateTiles(seed: number): Tile[] {
  const rng = mulberry32((seed ^ 0xa5a5) >>> 0);
  const layer = new Map<string, number>();

  // 4-6 raised plateau clusters
  const clusters = 5;
  for (let i = 0; i < clusters; i++) {
    const ang = (i / clusters) * Math.PI * 2 + (rng() - 0.5) * 0.7;
    const dist = GRID_RADIUS * (0.45 + rng() * 0.35);
    const ccx = Math.round(Math.cos(ang) * dist);
    const ccz = Math.round(Math.sin(ang) * dist);
    const radius = 1 + Math.floor(rng() * 2); // 1 or 2 tiles
    const height = rng() < 0.3 ? 2 : 1;
    for (let gx = -radius; gx <= radius; gx++) {
      for (let gz = -radius; gz <= radius; gz++) {
        // soft circular mask + jitter
        if (gx * gx + gz * gz > radius * radius + rng() * 0.6) continue;
        const x = ccx + gx;
        const z = ccz + gz;
        if (!insideIsland(x, z) || insideVillage(x, z)) continue;
        const cur = layer.get(key(x, z)) ?? 0;
        if (height > cur) layer.set(key(x, z), height);
      }
    }
  }

  const tiles: Tile[] = [];
  for (const [k, L] of layer) {
    if (L <= 0) continue;
    const [gx, gz] = k.split(",").map(Number);
    tiles.push({ gx, gz, layer: L, kind: "slab" });
  }

  // Place ramps: for each raised slab, look for a CARDINAL lower-neighbor (layer 0)
  // and put a ramp tile on that neighbour sloping up toward the slab.
  const dirs: RampDir[] = [
    { dx: 1, dz: 0 },
    { dx: -1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: 0, dz: -1 },
  ];
  const ramped = new Set<string>();
  for (const t of tiles.slice()) {
    if (t.kind !== "slab") continue;
    for (const d of dirs) {
      const nx = t.gx + d.dx;
      const nz = t.gz + d.dz;
      if (!insideIsland(nx, nz) || insideVillage(nx, nz)) continue;
      const nl = layer.get(key(nx, nz)) ?? 0;
      if (nl >= t.layer) continue;
      if (ramped.has(key(nx, nz))) continue;
      // ramp's HIGH edge faces back toward the slab → rampDir = (-d.dx, -d.dz)
      tiles.push({
        gx: nx,
        gz: nz,
        layer: t.layer,
        kind: "ramp",
        rampDir: { dx: (-d.dx) as -1 | 0 | 1, dz: (-d.dz) as -1 | 0 | 1 },
      });
      ramped.add(key(nx, nz));
      break;
    }
  }

  return tiles;
}

// ---- Lookup table for fast queries ----
function buildLookup(tiles: Tile[]): Map<string, Tile> {
  const m = new Map<string, Tile>();
  for (const t of tiles) m.set(key(t.gx, t.gz), t);
  return m;
}
const lookupCache = new WeakMap<Tile[], Map<string, Tile>>();
function getLookup(tiles: Tile[]) {
  let m = lookupCache.get(tiles);
  if (!m) {
    m = buildLookup(tiles);
    lookupCache.set(tiles, m);
  }
  return m;
}

/** World height at (x,z). Returns 0 on flat ground / outside any raised tile. */
export function heightAt(x: number, z: number, tiles: Tile[]): number {
  const gx = Math.round(x / TILE_SIZE);
  const gz = Math.round(z / TILE_SIZE);
  const t = getLookup(tiles).get(key(gx, gz));
  if (!t) return 0;
  if (t.kind === "slab") return t.layer * LAYER_HEIGHT;
  // ramp: linear interp along rampDir, low edge at opposite side
  const lx = x - gx * TILE_SIZE;
  const lz = z - gz * TILE_SIZE;
  const d = t.rampDir!;
  // tParam in 0..1, 1 at the HIGH edge
  const tParam = Math.max(
    0,
    Math.min(1, (lx * d.dx + lz * d.dz) / TILE_SIZE + 0.5),
  );
  return tParam * t.layer * LAYER_HEIGHT;
}

export function isOnRamp(x: number, z: number, tiles: Tile[]): boolean {
  const gx = Math.round(x / TILE_SIZE);
  const gz = Math.round(z / TILE_SIZE);
  const t = getLookup(tiles).get(key(gx, gz));
  return !!t && t.kind === "ramp";
}

export function isOnSlab(x: number, z: number, tiles: Tile[]): boolean {
  const gx = Math.round(x / TILE_SIZE);
  const gz = Math.round(z / TILE_SIZE);
  const t = getLookup(tiles).get(key(gx, gz));
  return !!t && t.kind === "slab";
}

/** Keep resources off ramps, off cliff rims, and outside the village. */
export function isValidResourceSpot(
  x: number,
  z: number,
  tiles: Tile[],
): boolean {
  if (Math.hypot(x, z) < VILLAGE_RADIUS + 1.5) return false;
  if (Math.hypot(x, z) > ISLAND_RADIUS - 2) return false;
  if (isOnRamp(x, z, tiles)) return false;
  // Keep clear of slab edges (don't half-clip trees on the cliff lip)
  const gx = Math.round(x / TILE_SIZE);
  const gz = Math.round(z / TILE_SIZE);
  const lookup = getLookup(tiles);
  const here = lookup.get(key(gx, gz));
  const myLayer = here?.kind === "slab" ? here.layer : 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      const n = lookup.get(key(gx + dx, gz + dz));
      const nl = n?.kind === "slab" ? n.layer : 0;
      if (nl !== myLayer) {
        // we are within one cell of a height transition; require margin
        const cx = gx * TILE_SIZE;
        const cz = gz * TILE_SIZE;
        const lx = x - cx;
        const lz = z - cz;
        const edgeDist = TILE_SIZE / 2 - Math.max(Math.abs(lx), Math.abs(lz));
        if (edgeDist < 0.6) return false;
      }
    }
  }
  return true;
}