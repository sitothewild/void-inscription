import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { GltfProp } from "./GltfProp";

type Props = {
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  url?: string;
};

/**
 * Pirate ship that gently bobs and yaws on the waves. Sits on the ocean
 * plane; tweak `position[1]` if your ocean y differs.
 */
export function PirateShip({
  position = [0, 0.4, -120],
  rotation = 0,
  scale = 6,
  url = "/models/pirate/Ship.glb",
}: Props) {
  const ref = useRef<Group>(null);
  const baseY = position[1];
  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    g.position.y = baseY + Math.sin(t * 0.8) * 0.45;
    g.rotation.z = Math.sin(t * 0.6) * 0.04;
    g.rotation.x = Math.cos(t * 0.7) * 0.03;
    g.rotation.y = rotation + Math.sin(t * 0.25) * 0.05;
  });
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <Suspense fallback={null}>
        <GltfProp url={url} scale={scale} />
      </Suspense>
    </group>
  );
}