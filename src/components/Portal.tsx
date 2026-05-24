import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, PointLight } from "three";

type Props = {
  position: [number, number, number];
  color?: string;
};

export function Portal({ position, color = "#6040ff" }: Props) {
  const ringRef = useRef<Mesh>(null!);
  const innerRef = useRef<Mesh>(null!);
  const lightRef = useRef<PointLight>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.6;
      ringRef.current.scale.y = 1 + Math.sin(t * 2) * 0.05;
    }
    if (innerRef.current) {
      innerRef.current.rotation.z = -t * 0.4;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 6 + Math.sin(t * 3) * 1.5;
    }
  });

  return (
    <group position={position}>
      {/* Tall oval ring */}
      <mesh ref={ringRef} position={[0, 3, 0]} scale={[1, 1.8, 1]}>
        <ringGeometry args={[1.7, 2, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3}
          toneMapped={false}
          side={2}
        />
      </mesh>
      {/* Inner shimmer */}
      <mesh ref={innerRef} position={[0, 3, 0]} scale={[0.9, 1.6, 1]}>
        <ringGeometry args={[1.1, 1.65, 48]} />
        <meshStandardMaterial
          color={"#b0a0ff"}
          emissive={"#b0a0ff"}
          emissiveIntensity={1.4}
          toneMapped={false}
          transparent
          opacity={0.55}
          side={2}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, 3, 0]} color={color} intensity={6} distance={20} />
    </group>
  );
}