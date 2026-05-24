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
 * Canonical gate angles around the village fence (radians; 0=+X east, π/2=+Z south).
 * Shared by `Village` (to render gates + cut the fence) and `computeHutSlots`
 * (to keep huts from blocking gate approach paths).
 */
export const VILLAGE_GATE_ANGLES = [
  0,                     // East  (+X)
  Math.PI / 2,           // South (+Z)
  Math.PI,               // West  (-X)
  (3 * Math.PI) / 2,     // North (-Z)
];

/**
 * Canonical village hut layout. Shared by `Village` (to render the huts)
 * and `Vendors` (to anchor NPCs next to their assigned hut). Keep this in
 * one place so vendors never drift away from their owners.
 */
export function computeHutSlots(gateAngles: number[] = VILLAGE_GATE_ANGLES): HutSlot[] {
  const rng = mulberry32(99);
  const slots: HutSlot[] = [];
  const radius = 10;
  // Keep huts out of every gate's approach corridor (slightly wider than the
  // gate opening so the path stays clear).
  const gateHalf = Math.PI * 0.18;
  const TAU = Math.PI * 2;
  const gates = [...gateAngles]
    .map((a) => ((a % TAU) + TAU) % TAU)
    .sort((a, b) => a - b);
  // Allowed arcs sit between consecutive gates (wrapping around).
  const arcs: Array<{ start: number; len: number }> = [];
  for (let i = 0; i < gates.length; i++) {
    const start = gates[i] + gateHalf;
    const nextRaw = gates[(i + 1) % gates.length];
    const next = i + 1 >= gates.length ? nextRaw + TAU : nextRaw;
    const end = next - gateHalf;
    const len = end - start;
    if (len > 0.2) arcs.push({ start, len });
  }
  const totalLen = arcs.reduce((s, a) => s + a.len, 0) || 1;
  const totalCount = 6;
  for (const arc of arcs) {
    const n = Math.max(1, Math.round((totalCount * arc.len) / totalLen));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const a = arc.start + t * arc.len + (rng() - 0.5) * 0.08;
      const r = radius + (rng() - 0.5) * 1.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // Door (hut local +Z) faces the village seed/pylon at the center.
      slots.push({ x, z, rotY: -a + Math.PI / 2 + Math.PI, angle: a });
    }
  }
  return slots;
}