import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { type RapierRigidBody } from "@react-three/rapier";
import { onEdge } from "@/game/inputStore";
import { world, type Resource } from "@/game/world";

const INTERACT_RADIUS = 3.5;

type Props = {
  playerRef: React.MutableRefObject<RapierRigidBody | null>;
};

/** Highlights the nearest interactable and consumes it on "action" edge. */
export function InteractionSystem({ playerRef }: Props) {
  const ringRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const [, force] = useState(0);
  const currentTarget = useRef<Resource | null>(null);

  useEffect(() => {
    return onEdge("action", () => {
      const t = currentTarget.current;
      if (!t) return;
      world.remove(t.id);
      currentTarget.current = null;
      force((n) => n + 1);
    });
  }, []);

  useFrame((state) => {
    const b = playerRef.current;
    const g = groupRef.current;
    const ring = ringRef.current;
    if (!b || !g) return;
    const t = b.translation();
    const list = world.list();
    let best: Resource | null = null;
    let bestD = INTERACT_RADIUS * INTERACT_RADIUS;
    for (const r of list) {
      const dx = r.pos[0] - t.x;
      const dz = r.pos[2] - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) {
        bestD = d2;
        best = r;
      }
    }
    currentTarget.current = best;
    if (best) {
      g.visible = true;
      g.position.set(best.pos[0], best.pos[1] + 0.05, best.pos[2]);
      if (ring) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.12;
        ring.scale.setScalar(pulse);
      }
    } else {
      g.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.2, 32]} />
        <meshBasicMaterial
          color={"#7ae0a8"}
          transparent
          opacity={0.85}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={"#7ae0a8"} intensity={2.5} distance={4} />
    </group>
  );
}