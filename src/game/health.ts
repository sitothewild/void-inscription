import { useSyncExternalStore } from "react";

/**
 * Tracks HP for the player, the village seed (pylon), and each gate.
 * Designed to be tiny — anyone with a target id can deal damage; the UI
 * subscribes for bar updates.
 */

export type HealthId = "player" | "seed" | `gate:${number}`;

export type HealthEntry = {
  id: HealthId;
  hp: number;
  max: number;
  /** Last time (ms) damage was applied — useful for hit flash. */
  lastHit: number;
};

type State = Record<HealthId, HealthEntry>;

let state: State = {
  player: { id: "player", hp: 100, max: 100, lastHit: 0 },
  seed: { id: "seed", hp: 500, max: 500, lastHit: 0 },
};

const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export const health = {
  get(): State {
    return state;
  },
  ensure(id: HealthId, max: number) {
    if (state[id]) return;
    state = { ...state, [id]: { id, hp: max, max, lastHit: 0 } };
    emit();
  },
  damage(id: HealthId, amount: number) {
    const e = state[id];
    if (!e || e.hp <= 0) return;
    const next = Math.max(0, e.hp - amount);
    state = { ...state, [id]: { ...e, hp: next, lastHit: performance.now() } };
    emit();
  },
  heal(id: HealthId, amount: number) {
    const e = state[id];
    if (!e) return;
    state = { ...state, [id]: { ...e, hp: Math.min(e.max, e.hp + amount) } };
    emit();
  },
  reset(id: HealthId) {
    const e = state[id];
    if (!e) return;
    state = { ...state, [id]: { ...e, hp: e.max, lastHit: 0 } };
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useHealth(id: HealthId): HealthEntry | undefined {
  return useSyncExternalStore(
    (cb) => health.subscribe(cb),
    () => health.get()[id],
    () => health.get()[id],
  );
}