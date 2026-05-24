import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { Sparkles } from "@react-three/drei";

export function Seed() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.5;
  });
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[1.6, 1.8, 0.3, 12]} />
        <meshStandardMaterial color="#5a3a22" />
      </mesh>
      <mesh ref={ref} position={[0, 1.2, 0]} castShadow>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial
          color="#9be29b"
          emissive="#5fff7f"
          emissiveIntensity={2.4}
          toneMapped={false}
          flatShading
        />
      </mesh>
      <Sparkles
        count={40}
        scale={[3, 3, 3]}
        position={[0, 1.4, 0]}
        size={4}
        speed={0.4}
        color="#aaffb0"
      />
    </group>
  );
}