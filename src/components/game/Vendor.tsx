import { SHAMAN_POS, SMITH_POS } from "@/game/constants";

function NPC({ x, z, color, label }: { x: number; z: number; color: string; label: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.8, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color="#e0c2a0" />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.25, 0.5, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function Vendors() {
  return (
    <>
      <NPC x={SMITH_POS.x} z={SMITH_POS.z} color="#8a4a2a" label="Smith" />
      <NPC x={SHAMAN_POS.x} z={SHAMAN_POS.z} color="#3a6a8a" label="Shaman" />
    </>
  );
}
