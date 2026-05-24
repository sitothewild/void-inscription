import { useMemo, useRef } from "react";
import { Sky } from "@react-three/drei";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Terrain } from "./Terrain";
import { Portal } from "./Portal";
import { Player } from "./Player";
import { useProceduralTerrain } from "@/hooks/useProceduralTerrain";
import { usePortalTrigger } from "@/hooks/usePortalTrigger";

type Props = {
  spawn: [number, number, number];
  onEnterPortal: () => void;
};

export function Level1({ spawn, onEnterPortal }: Props) {
  const terrain = useProceduralTerrain(42, 100, 100, 12, 6);
  const playerRef = useRef<RapierRigidBody | null>(null);

  const portals = useMemo(() => {
    const r = 42;
    const dirs: Array<[string, number]> = [
      ["N", 0],
      ["NE", Math.PI / 4],
      ["E", Math.PI / 2],
      ["SE", (3 * Math.PI) / 4],
      ["SW", (5 * Math.PI) / 4],
    ];
    return dirs.map(([id, a]) => {
      const x = Math.sin(a) * r;
      const z = -Math.cos(a) * r;
      const y = terrain.sampleWorldY(x, z);
      return { id, position: [x, y, z] as [number, number, number] };
    });
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

      {/* Ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={"#1e5d8a"} metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Village Anchor Pylon */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, terrain.sampleWorldY(0, 0) + 4, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.5, 8, 16]} />
          <meshStandardMaterial
            color={"#ffb84a"}
            emissive={"#ff8a00"}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
        <pointLight color={"#ffb060"} intensity={8} distance={30} />
      </RigidBody>

      {/* Portals */}
      {portals.map((p) => (
        <Portal key={p.id} position={p.position} color={"#6040ff"} />
      ))}

      <Player spawn={spawn} camera="iso" onRef={(b) => (playerRef.current = b)} />
    </>
  );
}