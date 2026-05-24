import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

export function Tree({ id, x, z }: { id: string; x: number; z: number }) {
  const plateaus = useGame((s) => s.plateaus);
  const highlight = useGame((s) => s.nearestInteractId === id);
  const y = heightAt(x, z, plateaus);
  const emissive = highlight ? "#a8ff7a" : "#000000";
  const intensity = highlight ? 0.7 : 0;
  const canopyRef = useRef<Group>(null);
  const seed = (x * 13.37 + z * 7.91) % 6.28;
  useFrame(({ clock }) => {
    if (!canopyRef.current) return;
    const t = clock.elapsedTime;
    const gust = Math.sin(t * 0.35 + seed * 0.3) * 0.5 + 0.5;
    const amp = 0.04 + gust * 0.07;
    canopyRef.current.rotation.z = Math.sin(t * 1.4 + seed) * amp;
    canopyRef.current.rotation.x = Math.sin(t * 1.1 + seed * 1.7) * amp * 0.6;
  });
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 6]} />
        <meshStandardMaterial color="#6b3a1f" emissive={emissive} emissiveIntensity={intensity * 0.5} />
      </mesh>
      <group ref={canopyRef} position={[0, 1.2, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <coneGeometry args={[0.9, 1.8, 8]} />
          <meshStandardMaterial color="#2f5a2a" emissive={emissive} emissiveIntensity={intensity} />
        </mesh>
      </group>
      {highlight && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.25, 24]} />
          <meshBasicMaterial color="#a8ff7a" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}