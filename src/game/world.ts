import { useSyncExternalStore } from "react";

export type ResourceKind = "tree" | "pine" | "rock" | "bush" | "mushroom";
export type Resource = {
  id: number;
  kind: ResourceKind;
  url: string;
  pos: [number, number, number];
  rotY: number;
  scale: number;
};

type Counts = { wood: number; stone: number; herbs: number };

let resources: Resource[] = [];
let counts: Counts = { wood: 0, stone: 0, herbs: 0 };
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const world = {
  setResources(items: Omit<Resource, "id">[]) {
    resources = items.map((x) => ({ ...x, id: nextId++ }));
    emit();
  },
  clear() {
    resources = [];
    emit();
  },
  resetCounts() {
    counts = { wood: 0, stone: 0, herbs: 0 };
    emit();
  },
  list(): Resource[] {
    return resources;
  },
  counts(): Counts {
    return counts;
  },
  remove(id: number) {
    const r = resources.find((x) => x.id === id);
    if (!r) return;
    if (r.kind === "tree" || r.kind === "pine" || r.kind === "bush") counts = { ...counts, wood: counts.wood + 1 };
    else if (r.kind === "rock") counts = { ...counts, stone: counts.stone + 1 };
    else counts = { ...counts, herbs: counts.herbs + 1 };
    resources = resources.filter((x) => x.id !== id);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useResources(): Resource[] {
  return useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.list(),
    () => world.list(),
  );
}

export function useCounts(): Counts {
  return useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.counts(),
    () => world.counts(),
  );
}