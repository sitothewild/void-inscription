import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useGame } from "@/game/store";

export function Hero() {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const { heroX, heroZ, heroFacing } = useGame.getState();
    ref.current.position.set(heroX, 0, heroZ);
    ref.current.rotation.y = heroFacing;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.6, 0.9, 0.4]} />
        <meshStandardMaterial color="#3a6ea8" />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#e8c69a" />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[0.3, 0.3, 6]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 0.75, 0]} castShadow>
        <boxGeometry args={[0.7, 0.12, 0.12]} />
        <meshStandardMaterial color="#dddddd" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}