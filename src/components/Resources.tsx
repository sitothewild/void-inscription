import { useEffect, useMemo } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import type { TerrainData } from "@/hooks/useProceduralTerrain";
import { useResources, world, type Resource, type ResourceKind } from "@/game/world";

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

type Bucket = {
  kind: ResourceKind;
  url: string;
  seed: number;
  count: number;
  hMin: number;
  hMax: number;
  scale: [number, number];
  baseScale?: number;
};

const BUCKETS: Bucket[] = [
  { kind: "pine", url: "/models/nature/pine.glb", seed: 2001, count: 50, hMin: 0.4, hMax: 0.7, scale: [0.8, 1.4] },
  { kind: "tree", url: "/models/nature/tree.glb", seed: 2101, count: 40, hMin: 0.3, hMax: 0.55, scale: [0.8, 1.4] },
  { kind: "rock", url: "/models/nature/rock.glb", seed: 3001, count: 35, hMin: 0.5, hMax: 0.9, scale: [0.6, 1.4] },
  { kind: "bush", url: "/models/nature/bush.glb", seed: 3501, count: 60, hMin: 0.25, hMax: 0.5, scale: [0.6, 1.1] },
  { kind: "mushroom", url: "/models/nature/mushroom.glb", seed: 4001, count: 80, hMin: 0.2, hMax: 0.45, scale: [0.5, 0.9], baseScale: 0.8 },
];

export function Resources({ data }: { data: TerrainData }) {
  const items = useMemo(() => {
    const out: Omit<Resource, "id">[] = [];
    const half = data.worldSize / 2;
    const villageRadius = 17;
    for (const b of BUCKETS) {
      const rng = mulberry32(b.seed);
      let attempts = 0;
      let placed = 0;
      while (placed < b.count && attempts < b.count * 25) {
        attempts++;
        const x = (rng() * 2 - 1) * half * 0.92;
        const z = (rng() * 2 - 1) * half * 0.92;
        if (Math.hypot(x, z) < villageRadius) continue;
        const h = data.sampleAt(x, z);
        if (h < b.hMin || h > b.hMax) continue;
        out.push({
          kind: b.kind,
          url: b.url,
          pos: [x, h * data.maxHeight, z],
          rotY: rng() * Math.PI * 2,
          scale: (b.baseScale ?? 1) * (b.scale[0] + rng() * (b.scale[1] - b.scale[0])),
        });
        placed++;
      }
    }
    return out;
  }, [data]);

  useEffect(() => {
    world.setResources(items);
    world.resetCounts();
    return () => world.clear();
  }, [items]);

  const live = useResources();

  // Group live resources by url for shared Clone source
  const byUrl = useMemo(() => {
    const m = new Map<string, Resource[]>();
    for (const r of live) {
      const arr = m.get(r.url) ?? [];
      arr.push(r);
      m.set(r.url, arr);
    }
    return m;
  }, [live]);

  return (
    <group>
      {[...byUrl.entries()].map(([url, list]) => (
        <ResourceField key={url} url={url} items={list} />
      ))}
    </group>
  );
}

function ResourceField({ url, items }: { url: string; items: Resource[] }) {
  const { scene } = useGLTF(url);
  return (
    <>
      {items.map((it) => (
        <Clone
          key={it.id}
          object={scene}
          position={it.pos}
          rotation={[0, it.rotY, 0]}
          scale={it.scale}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

useGLTF.preload("/models/nature/pine.glb");
useGLTF.preload("/models/nature/tree.glb");
useGLTF.preload("/models/nature/rock.glb");
useGLTF.preload("/models/nature/bush.glb");
useGLTF.preload("/models/nature/mushroom.glb");