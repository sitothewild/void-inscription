import { useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
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

function Hut({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={[0, rotation, 0]}>
      {/* Base log walls */}
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[2.4, 1.8, 2.0]} />
        <meshStandardMaterial color={"#6b4a2b"} roughness={0.9} />
      </mesh>
      {/* Thatched roof */}
      <mesh castShadow position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.9, 1.4, 4]} />
        <meshStandardMaterial color={"#8a5a2a"} roughness={1} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.6, 1.01]}>
        <planeGeometry args={[0.7, 1.2]} />
        <meshStandardMaterial color={"#2a1a0e"} />
      </mesh>
    </RigidBody>
  );
}

function FencePost({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 1.1, 0.18]} />
        <meshStandardMaterial color={"#5a3a20"} roughness={1} />
      </mesh>
    </RigidBody>
  );
}

function Campfire({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.15, 12]} />
        <meshStandardMaterial color={"#2a2a2a"} roughness={1} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.35, 0.7, 8]} />
        <meshStandardMaterial
          color={"#ff7a1a"}
          emissive={"#ff5a00"}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={"#ff9050"} intensity={4} distance={10} position={[0, 1, 0]} />
    </group>
  );
}

/** Cluster of huts + a campfire around the central anchor pylon. */
export function Village({ data }: { data: TerrainData }) {
  const baseY = data.sampleWorldY(0, 0);

  const huts = useMemo(() => {
    const rng = mulberry32(99);
    const arr: Array<{ pos: [number, number, number]; rot: number }> = [];
    const radius = 5.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rng() * 0.2;
      const r = radius + rng() * 0.8;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      arr.push({ pos: [x, baseY, z], rot: -a + Math.PI / 2 });
    }
    return arr;
  }, [baseY]);

  const fence = useMemo(() => {
    const posts: Array<[number, number, number]> = [];
    const r = 9;
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // Leave a gap (gate) on +Z side
      if (a > Math.PI * 0.4 && a < Math.PI * 0.6) continue;
      const y = data.sampleWorldY(x, z) + 0.55;
      posts.push([x, y, z]);
    }
    return posts;
  }, [data]);

  return (
    <group>
      {huts.map((h, i) => (
        <Hut key={i} position={h.pos} rotation={h.rot} />
      ))}
      {fence.map((p, i) => (
        <FencePost key={i} position={p} />
      ))}
      <Campfire position={[3, baseY, 2]} />
    </group>
  );
}