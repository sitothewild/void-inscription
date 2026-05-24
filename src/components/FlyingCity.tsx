import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { GltfProp } from "./GltfProp";

type Props = {
  /** World position of the city cluster's anchor. */
  position?: [number, number, number];
  /** Overall scale of the cluster. */
  scale?: number;
  /** Seed for deterministic island layout. */
  seed?: number;
};

type Piece = {
  url: string;
  pos: [number, number, number];
  rot: number;
  scale: number;
  bobAmp: number;
  bobSpeed: number;
  bobPhase: number;
};

const ISLAND_URLS = [
  "/models/platformer/Large%20Island.glb",
  "/models/platformer/Medium%20Island.glb",
  "/models/platformer/Island.glb",
  "/models/platformer/Grass%20Platform.glb",
  "/models/platformer/Stone%20Platform.glb",
];

const DECOR_URLS = [
  "/models/platformer/Tree.glb",
  "/models/platformer/Large%20Rock.glb",
  "/models/platformer/Small%20Rock.glb",
  "/models/platformer/Coin.glb",
  "/models/platformer/Coin%20Dollar%20Sign.glb",
  "/models/platformer/Flag.glb",
];

function makeRand(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Visual-only floating city built from the platformer kit. A handful of
 * islands clustered in the sky with trees, rocks, coins and a flag on top.
 * The whole cluster slowly drifts and each piece bobs independently to sell
 * the "floating" feel. Non-interactive — no colliders.
 */
export function FlyingCity({ position = [0, 60, 0], scale = 6, seed = 1337 }: Props) {
  const groupRef = useRef<Group>(null);

  const pieces = useMemo<Piece[]>(() => {
    const rand = makeRand(seed);
    const out: Piece[] = [];
    // Cluster of islands around the anchor.
    const islandCount = 7;
    for (let i = 0; i < islandCount; i++) {
      const ang = (i / islandCount) * Math.PI * 2 + rand() * 0.6;
      const r = i === 0 ? 0 : 6 + rand() * 10;
      const x = Math.sin(ang) * r;
      const z = Math.cos(ang) * r;
      const y = (rand() - 0.5) * 4;
      out.push({
        url: ISLAND_URLS[Math.floor(rand() * ISLAND_URLS.length)],
        pos: [x, y, z],
        rot: rand() * Math.PI * 2,
        scale: 0.9 + rand() * 0.8,
        bobAmp: 0.3 + rand() * 0.5,
        bobSpeed: 0.2 + rand() * 0.3,
        bobPhase: rand() * Math.PI * 2,
      });
    }
    // Decor scattered above the islands.
    const decorCount = 18;
    for (let i = 0; i < decorCount; i++) {
      const base = out[1 + Math.floor(rand() * (out.length - 1))];
      const ox = (rand() - 0.5) * 4;
      const oz = (rand() - 0.5) * 4;
      out.push({
        url: DECOR_URLS[Math.floor(rand() * DECOR_URLS.length)],
        pos: [base.pos[0] + ox, base.pos[1] + 1.2 + rand() * 0.8, base.pos[2] + oz],
        rot: rand() * Math.PI * 2,
        scale: 0.5 + rand() * 0.6,
        bobAmp: 0.15 + rand() * 0.25,
        bobSpeed: 0.4 + rand() * 0.5,
        bobPhase: rand() * Math.PI * 2,
      });
    }
    return out;
  }, [seed]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // Whole-cluster drift + slow yaw.
    g.position.set(position[0], position[1] + Math.sin(t * 0.15) * 1.2, position[2]);
    g.rotation.y = t * 0.02;
    // Individual piece bob.
    for (let i = 0; i < g.children.length && i < pieces.length; i++) {
      const p = pieces[i];
      const child = g.children[i];
      child.position.y = p.pos[1] + Math.sin(t * p.bobSpeed + p.bobPhase) * p.bobAmp;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <Suspense fallback={null}>
        {pieces.map((p, i) => (
          <GltfProp
            key={i}
            url={p.url}
            position={p.pos}
            rotation={[0, p.rot, 0]}
            scale={p.scale}
            castShadow={false}
            receiveShadow={false}
          />
        ))}
      </Suspense>
    </group>
  );
}