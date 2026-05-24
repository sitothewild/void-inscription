import { useMemo, useRef } from "react";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { createNoise2D } from "simplex-noise";
import { Player } from "./Player";
import { Portal } from "./Portal";
import { Particles } from "./Particles";
import { usePortalTrigger } from "@/hooks/usePortalTrigger";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Crystal = {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
};

type Props = {
  spawn: [number, number, number];
  onEnterPortal: () => void;
};

const TUNNEL_LENGTH = 60;
const TUNNEL_RADIUS = 9;

export function Level2({ spawn, onEnterPortal }: Props) {
  const playerRef = useRef<RapierRigidBody | null>(null);

  const crystals = useMemo<Crystal[]>(() => {
    const rng = mulberry32(999);
    const noise = createNoise2D(rng);
    const out: Crystal[] = [];
    const count = 220;
    for (let i = 0; i < count; i++) {
      const t = rng();
      const z = -t * TUNNEL_LENGTH + 5;
      const angle = rng() * Math.PI * 2;
      // Distribute around cylindrical walls, biased by noise
      const r = TUNNEL_RADIUS - 0.2 - Math.abs(noise(z * 0.1, angle)) * 0.6;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r + 4; // tunnel center at y=4
      const s = 0.4 + rng() * 1.4;
      // Rotate spike to point inward (towards tunnel center)
      const rotZ = angle + Math.PI / 2;
      out.push({
        pos: [x, y, z],
        rot: [rng() * 0.4, rng() * Math.PI * 2, rotZ],
        scale: s,
      });
    }
    return out;
  }, []);

  const lightPositions: Array<[number, number, number]> = [
    [4, 6, -10],
    [-5, 5, -28],
    [3, 7, -50],
  ];

  const exitPortal = useMemo(
    () => ({ id: "exit", position: [0, 0.5, -TUNNEL_LENGTH + 4] as [number, number, number] }),
    [],
  );

  usePortalTrigger(playerRef, [exitPortal], 3, onEnterPortal);

  return (
    <>
      <color attach="background" args={["#06080f"]} />
      <fog attach="fog" args={["#0a1018", 8, 55]} />

      <ambientLight intensity={0.1} />
      {lightPositions.map((p, i) => (
        <pointLight key={i} position={p} color={"#20ffaa"} intensity={12} distance={22} />
      ))}

      {/* Floor */}
      <RigidBody type="fixed" colliders={false} position={[0, 0, -TUNNEL_LENGTH / 2]}>
        <CuboidCollider args={[TUNNEL_RADIUS, 0.5, TUNNEL_LENGTH / 2 + 6]} />
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[TUNNEL_RADIUS * 2, 1, TUNNEL_LENGTH + 12]} />
          <meshStandardMaterial color={"#0a1018"} roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* Tunnel shell (visual only) */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 4, -TUNNEL_LENGTH / 2 + 5]}
      >
        <cylinderGeometry args={[TUNNEL_RADIUS + 0.5, TUNNEL_RADIUS + 0.5, TUNNEL_LENGTH, 32, 1, true]} />
        <meshStandardMaterial
          color={"#0e1426"}
          emissive={"#10203a"}
          emissiveIntensity={0.4}
          roughness={1}
          side={1}
        />
      </mesh>

      {/* Crystal spikes */}
      {crystals.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={c.rot} scale={c.scale} castShadow>
          <coneGeometry args={[0.35, 1.6, 4]} />
          <meshStandardMaterial
            color={"#204060"}
            emissive={"#3aa0ff"}
            emissiveIntensity={1.4}
            roughness={0.2}
            metalness={0.4}
            flatShading
            toneMapped={false}
          />
        </mesh>
      ))}

      <Particles count={200} bounds={{ x: TUNNEL_RADIUS - 1, y: 6, z: TUNNEL_LENGTH / 2 }} />

      <group position={[0, 0, -TUNNEL_LENGTH / 2]}>
        <Portal position={exitPortal.position} color={"#40ffaa"} />
      </group>

      <Player spawn={spawn} camera="third" onRef={(b) => (playerRef.current = b)} />
    </>
  );
}