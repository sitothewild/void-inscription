import { mulberry32 } from "./rng";
import { ISLAND_RADIUS, VILLAGE_RADIUS } from "./constants";

export type Plateau = {
  cx: number;
  cz: number;
  radius: number;
  height: number;
  ramp: { angle: number; length: number; width: number };
};

// Deterministic procedural plateaus — second terrain layer.
export function generatePlateaus(seed: number): Plateau[] {
  const rng = mulberry32((seed ^ 0xa5a5) >>> 0);
  const N = 4;
  const out: Plateau[] = [];
  for (let i = 0; i < N; i++) {
    const baseAngle = (i / N) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    const dist = ISLAND_RADIUS * 0.55 + rng() * 5;
    const cx = Math.cos(baseAngle) * dist;
    const cz = Math.sin(baseAngle) * dist;
    const radius = 4.5 + rng() * 2;
    const height = 1.3 + rng() * 0.3;
    // Ramp faces back toward island center so players can ascend from village side.
    const rampAngle = Math.atan2(-cz, -cx);
    out.push({
      cx,
      cz,
      radius,
      height,
      ramp: { angle: rampAngle, length: 4, width: 3 },
    });
  }
  return out;
}

function rampProjection(
  p: Plateau,
  x: number,
  z: number,
): { t: number; perp: number } | null {
  const rdx = Math.cos(p.ramp.angle);
  const rdz = Math.sin(p.ramp.angle);
  // Inner edge midpoint (on plateau perimeter, where ramp meets top)
  const ix = p.cx + rdx * p.radius;
  const iz = p.cz + rdz * p.radius;
  const lx = x - ix;
  const lz = z - iz;
  const t = lx * rdx + lz * rdz; // along outward direction
  if (t < 0 || t > p.ramp.length) return null;
  const perp = Math.abs(-rdz * lx + rdx * lz);
  if (perp > p.ramp.width / 2) return null;
  return { t, perp };
}

export function heightAt(x: number, z: number, plateaus: Plateau[]): number {
  let best = 0;
  for (const p of plateaus) {
    const d = Math.hypot(x - p.cx, z - p.cz);
    if (d < p.radius) {
      if (p.height > best) best = p.height;
      continue;
    }
    const r = rampProjection(p, x, z);
    if (r) {
      const h = p.height * (1 - r.t / p.ramp.length);
      if (h > best) best = h;
    }
  }
  return best;
}

export function isOnRamp(x: number, z: number, plateaus: Plateau[]): boolean {
  for (const p of plateaus) {
    const d = Math.hypot(x - p.cx, z - p.cz);
    if (d < p.radius) continue;
    if (rampProjection(p, x, z)) return true;
  }
  return false;
}

export function isOnPlateau(x: number, z: number, plateaus: Plateau[]): boolean {
  return plateaus.some((p) => Math.hypot(x - p.cx, z - p.cz) < p.radius);
}

// Used by world gen to keep resources off ramp slopes and outside the village.
export function isValidResourceSpot(
  x: number,
  z: number,
  plateaus: Plateau[],
): boolean {
  if (Math.hypot(x, z) < VILLAGE_RADIUS + 1.5) return false;
  if (Math.hypot(x, z) > ISLAND_RADIUS - 2) return false;
  if (isOnRamp(x, z, plateaus)) return false;
  // Keep clear of plateau rims (avoid trees half-clipped on edges)
  for (const p of plateaus) {
    const d = Math.hypot(x - p.cx, z - p.cz);
    if (d > p.radius - 0.6 && d < p.radius + 0.8) return false;
  }
  return true;
}