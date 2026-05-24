import { useSyncExternalStore } from "react";
import { mobileAxis } from "./inputStore";

export type ChunkLOD = 0 | 1 | 2;
export type ChunkKey = `${number}:${number}`;
export type ChunkSpec = { key: ChunkKey; cx: number; cz: number; lod: ChunkLOD };

export const CHUNK_SIZE = 64;
const RADIUS = 7;

let playerX = 0;
let playerZ = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const chunkManager = {
  updatePlayer(x: number, z: number) {
    const px = Math.floor(x / CHUNK_SIZE);
    const pz = Math.floor(z / CHUNK_SIZE);
    if (px === playerX && pz === playerZ) return;
    playerX = px;
    playerZ = pz;
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  specs(): ChunkSpec[] {
    const out: ChunkSpec[] = [];
    for (let dz = -RADIUS; dz <= RADIUS; dz++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dz));
        const lod: ChunkLOD = d <= 3 ? 0 : d <= 5 ? 1 : 2;
        const cx = playerX + dx;
        const cz = playerZ + dz;
        out.push({ key: `${cx}:${cz}`, cx, cz, lod });
      }
    }
    return out;
  },
};

export function setPlayerChunkPosition(x: number, z: number) {
  chunkManager.updatePlayer(x + mobileAxis.x * 0.001, z + mobileAxis.y * 0.001);
}

export function useChunkSpecs() {
  return useSyncExternalStore(
    (cb) => chunkManager.subscribe(cb),
    () => chunkManager.specs(),
    () => chunkManager.specs(),
  );
}
