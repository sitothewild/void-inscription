import { useMemo, useRef, useEffect } from "react";
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from "three";
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

type ScatterOpts = {
  seed: number;
  count: number;
  data: TerrainData;
  hMin: number;
  hMax: number;
  villageRadius?: number;
};

function scatter({ seed, count, data, hMin, hMax, villageRadius = 9 }: ScatterOpts) {
  const rng = mulberry32(seed);
  const half = data.worldSize / 2;
  const dummy = new Object3D();
  const matrices: Array<{ pos: [number, number, number]; rotY: number; scale: number }> = [];
  let attempts = 0;
  while (matrices.length < count && attempts < count * 10) {
    attempts++;
    const x = (rng() * 2 - 1) * half * 0.92;
    const z = (rng() * 2 - 1) * half * 0.92;
    if (Math.hypot(x, z) < villageRadius) continue;
    const h = data.sampleAt(x, z);
    if (h < hMin || h > hMax) continue;
    matrices.push({
      pos: [x, h * data.maxHeight, z],
      rotY: rng() * Math.PI * 2,
      scale: 0.8 + rng() * 0.6,
    });
  }
  return { matrices, dummy };
}

function useInstancedFill(
  ref: React.RefObject<InstancedMesh>,
  list: Array<{ pos: [number, number, number]; rotY: number; scale: number }>,
  yOffset = 0,
  colorVary?: { base: string; toward: string; amount?: number; seed?: number },
) {
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const rng = mulberry32(colorVary?.seed ?? 7);
    const base = colorVary ? new Color(colorVary.base) : null;
    const toward = colorVary ? new Color(colorVary.toward) : null;
    const tmp = new Color();
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      dummy.position.set(m.pos[0], m.pos[1] + yOffset, m.pos[2]);
      dummy.rotation.set(0, m.rotY, 0);
      dummy.scale.setScalar(m.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (base && toward) {
        tmp.copy(base).lerp(toward, rng() * (colorVary?.amount ?? 0.5));
        mesh.setColorAt(i, tmp);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [ref, list, yOffset, colorVary]);
}

export function Resources({ data }: { data: TerrainData }) {
  const trees = useMemo(
    () => scatter({ seed: 2001, count: 220, data, hMin: 0.32, hMax: 0.65 }).matrices,
    [data],
  );
  const rocks = useMemo(
    () => scatter({ seed: 3001, count: 90, data, hMin: 0.5, hMax: 0.88 }).matrices,
    [data],
  );
  const herbs = useMemo(
    () => scatter({ seed: 4001, count: 140, data, hMin: 0.2, hMax: 0.42 }).matrices,
    [data],
  );

  const trunkRef = useRef<InstancedMesh>(null!);
  const foliageRef = useRef<InstancedMesh>(null!);
  const rockRef = useRef<InstancedMesh>(null!);
  const herbRef = useRef<InstancedMesh>(null!);

  useInstancedFill(trunkRef, trees, 0.9);
  useInstancedFill(foliageRef, trees, 2.4, {
    base: "#234d22",
    toward: "#3a7d3a",
    amount: 0.8,
    seed: 11,
  });
  useInstancedFill(rockRef, rocks, 0.3, {
    base: "#6a6a6a",
    toward: "#a0a0a0",
    amount: 0.6,
    seed: 23,
  });
  useInstancedFill(herbRef, herbs, 0.15);

  const trunkGeo = useMemo(() => new CylinderGeometry(0.18, 0.25, 1.8, 6), []);
  const foliageGeo = useMemo(() => new ConeGeometry(1.1, 2.2, 7), []);
  const rockGeo = useMemo(() => new DodecahedronGeometry(0.55, 0), []);
  const herbGeo = useMemo(() => new SphereGeometry(0.18, 6, 5), []);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, undefined, trees.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color={"#4a2f17"} roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={foliageRef}
        args={[foliageGeo, undefined, trees.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial vertexColors roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        ref={rockRef}
        args={[rockGeo, undefined, rocks.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial vertexColors roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={herbRef}
        args={[herbGeo, undefined, herbs.length]}
        castShadow={false}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={"#c08aff"}
          emissive={"#7a3ad9"}
          emissiveIntensity={0.6}
          roughness={0.5}
        />
      </instancedMesh>
    </group>
  );
}