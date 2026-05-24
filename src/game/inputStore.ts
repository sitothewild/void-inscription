// Mobile / shared input state. Player and systems read these every frame.

export const mobileAxis = { x: 0, y: 0 };

export type EdgeEvent = "attack" | "action" | "ability1" | "ability2" | "ability3" | "jump";

const listeners = new Map<EdgeEvent, Set<() => void>>();

export function onEdge(e: EdgeEvent, fn: () => void): () => void {
  let s = listeners.get(e);
  if (!s) {
    s = new Set();
    listeners.set(e, s);
  }
  s.add(fn);
  return () => s!.delete(fn);
}

export function emitEdge(e: EdgeEvent) {
  listeners.get(e)?.forEach((fn) => fn());
}