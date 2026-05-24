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

export type HutSlot = {
  /** Hut center on the XZ plane. */
  x: number;
  z: number;
  /** Hut Y rotation (radians). */
  rotY: number;
  /** Angle from village center (radians, 0=+X, π/2=+Z). */
  angle: number;
};

/**
 * Canonical village hut layout. Shared by `Village` (to render the huts)
 * and `Vendors` (to anchor NPCs next to their assigned hut). Keep this in
 * one place so vendors never drift away from their owners.
 */
export function computeHutSlots(): HutSlot[] {
  const rng = mulberry32(99);
  const slots: HutSlot[] = [];
  const radius = 10;
  const gateGap = Math.PI * 0.34;
  const usable = Math.PI * 2 - gateGap;
  const count = 6;
  const start = Math.PI / 2 + gateGap / 2;
  for (let i = 0; i < count; i++) {
    const a = start + (i / (count - 1)) * usable + (rng() - 0.5) * 0.12;
    const r = radius + (rng() - 0.5) * 1.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    slots.push({ x, z, rotY: -a + Math.PI / 2, angle: a });
  }
  return slots;
}