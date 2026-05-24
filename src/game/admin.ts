import { useSyncExternalStore } from "react";

/**
 * Admin / debug state. Lives outside React so the player physics loop can
 * read it every frame without re-renders, but exposes a `useAdmin()` hook
 * for the console UI.
 */
export type AdminState = {
  flying: boolean;
  flySpeed: number;
};

const state: AdminState = {
  flying: false,
  flySpeed: 18,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const admin = {
  get(): AdminState {
    return state;
  },
  setFlying(on: boolean) {
    state.flying = on;
    emit();
  },
  toggleFlying() {
    state.flying = !state.flying;
    emit();
  },
  setSpeed(v: number) {
    state.flySpeed = Math.max(2, Math.min(200, v));
    emit();
  },
  bumpSpeed(delta: number) {
    admin.setSpeed(state.flySpeed + delta);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAdmin(): AdminState {
  return useSyncExternalStore(
    (cb) => admin.subscribe(cb),
    () => state,
    () => state,
  );
}