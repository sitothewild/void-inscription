import { useMemo } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

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

type Placement = { pos: [number, number, number]; rotY: number; scale: number };

function scatter(
  seed: number,
  count: number,
  data: TerrainData,
  hMin: number,
  hMax: number,
  scaleRange: [number, number] = [0.8, 1.4],
  villageRadius = 11,
): Placement[] {
  const rng = mulberry32(seed);
  const half = data.worldSize / 2;
  const out: Placement[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 25) {
    attempts++;
    const x = (rng() * 2 - 1) * half * 0.92;
    const z = (rng() * 2 - 1) * half * 0.92;
    if (Math.hypot(x, z) < villageRadius) continue;
    const h = data.sampleAt(x, z);
    if (h < hMin || h > hMax) continue;
    out.push({
      pos: [x, h * data.maxHeight, z],
      rotY: rng() * Math.PI * 2,
      scale: scaleRange[0] + rng() * (scaleRange[1] - scaleRange[0]),
    });
  }
  return out;
}

function CloneField({ url, items, baseScale = 1 }: { url: string; items: Placement[]; baseScale?: number }) {
  const { scene } = useGLTF(url);
  return (
    <group>
      {items.map((it, i) => (
        <Clone
          key={i}
          object={scene}
          position={it.pos}
          rotation={[0, it.rotY, 0]}
          scale={it.scale * baseScale}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

export function Resources({ data }: { data: TerrainData }) {
  const pines = useMemo(() => scatter(2001, 50, data, 0.4, 0.7), [data]);
  const trees = useMemo(() => scatter(2101, 40, data, 0.3, 0.55), [data]);
  const rocks = useMemo(() => scatter(3001, 35, data, 0.5, 0.9, [0.6, 1.4]), [data]);
  const bushes = useMemo(() => scatter(3501, 60, data, 0.25, 0.5, [0.6, 1.1]), [data]);
  const mushrooms = useMemo(() => scatter(4001, 80, data, 0.2, 0.45, [0.5, 0.9]), [data]);

  return (
    <group>
      <CloneField url="/models/nature/pine.glb" items={pines} />
      <CloneField url="/models/nature/tree.glb" items={trees} />
      <CloneField url="/models/nature/rock.glb" items={rocks} />
      <CloneField url="/models/nature/bush.glb" items={bushes} />
      <CloneField url="/models/nature/mushroom.glb" items={mushrooms} baseScale={0.8} />
    </group>
  );
}

useGLTF.preload("/models/nature/pine.glb");
useGLTF.preload("/models/nature/tree.glb");
useGLTF.preload("/models/nature/rock.glb");
useGLTF.preload("/models/nature/bush.glb");
useGLTF.preload("/models/nature/mushroom.glb");