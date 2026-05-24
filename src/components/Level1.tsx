import { Suspense, useMemo, useRef } from "react";
import { Sky } from "@react-three/drei";
import { type RapierRigidBody } from "@react-three/rapier";
import { Terrain } from "./Terrain";
import { Portal } from "./Portal";
import { Player } from "./Player";
import { Grass } from "./Grass";
import { Village } from "./Village";
import { WindParticles } from "./WindParticles";
import { Resources } from "./Resources";
import { Vendors } from "./Vendors";
import { Animals } from "./Animals";
import { Pylon } from "./Pylon";
import { Projectiles } from "./Projectiles";
import { InteractionSystem } from "./InteractionSystem";
import { Ocean } from "./Ocean";
import { useProceduralTerrain } from "@/hooks/useProceduralTerrain";
import { usePortalTrigger } from "@/hooks/usePortalTrigger";

type Props = {
  spawn: [number, number, number];
  onEnterPortal: () => void;
};

export function Level1({ spawn, onEnterPortal }: Props) {
  // Bigger world: 200m across, more detail, taller peaks
  // villageRadius extends ~8m past the fence (r=15) so the approach to
  // every gate stays flat enough to walk/ride out comfortably.
  const terrain = useProceduralTerrain(42, 200, 200, 18, 23);
  const playerRef = useRef<RapierRigidBody | null>(null);

  const portals = useMemo(() => {
    // Scatter portals across the island at varying distances/angles.
    // Deterministic from seed; skip the village center and the very edge.
    const out: Array<{ id: string; position: [number, number, number] }> = [];
    let a = 0x9e3779b1;
    const rand = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const count = 10;
    const minR = 25;
    const maxR = 88;
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const r = minR + rand() * (maxR - minR);
      const x = Math.sin(ang) * r;
      const z = Math.cos(ang) * r;
      const y = terrain.sampleWorldY(x, z);
      // skip if underwater
      if (y < 0.5) continue;
      out.push({ id: `p${i}`, position: [x, y, z] });
    }
    return out;
  }, [terrain]);

  usePortalTrigger(playerRef, portals, 3, onEnterPortal);

  return (
    <>
      <color attach="background" args={["#87b8e0"]} />
      <fog attach="fog" args={["#9fc2e6", 60, 140]} />
      <Sky distance={450000} sunPosition={[40, 50, 20]} turbidity={4} rayleigh={1.2} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[30, 40, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      <Terrain data={terrain} />
      <Resources data={terrain} />
      <Grass data={terrain} count={6000} />
      <Village data={terrain} />
      <Suspense fallback={null}>
        <Vendors data={terrain} />
        <Animals data={terrain} />
      </Suspense>
      <WindParticles />

      {/* Sand shoreline ring sits low so the water can lap over it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <ringGeometry args={[terrain.worldSize / 2 - 12, terrain.worldSize / 2 + 4, 96]} />
        <meshStandardMaterial color={"#e8d39a"} roughness={1} />
      </mesh>
      {/* Animated ocean — sits just above the sand so waves visibly cover the beach. */}
      <Ocean size={900} y={0.15} shoreRadius={terrain.worldSize / 2 - 6} />

      {/* Village Anchor — spinning cube + particles */}
      <Pylon position={[0, terrain.sampleWorldY(0, 0) + 3, 0]} color={"#ffb060"} />

      <Projectiles />
      <InteractionSystem playerRef={playerRef} />

      {/* Portals */}
      {portals.map((p) => (
        <Portal key={p.id} position={p.position} color={"#6040ff"} />
      ))}

      <Player spawn={spawn} terrain={terrain} camera="iso" onRef={(b) => (playerRef.current = b)} />
    </>
  );
}