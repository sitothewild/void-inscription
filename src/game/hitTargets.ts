import type { HealthId } from "./health";

/**
 * Registry of damageable world targets keyed by HealthId. Each target is a
 * sphere (center + radius) in world space. Projectiles iterate this list to
 * find hits.
 */

export type HitTarget = {
  id: HealthId;
  x: number;
  y: number;
  z: number;
  /** Hit-sphere radius. */
  radius: number;
};

const targets = new Map<HealthId, HitTarget>();

export const hitTargets = {
  register(t: HitTarget) {
    targets.set(t.id, t);
  },
  unregister(id: HealthId) {
    targets.delete(id);
  },
  list(): HitTarget[] {
    return Array.from(targets.values());
  },
};