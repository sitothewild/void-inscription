export function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 6]} />
        <meshStandardMaterial color="#6b3a1f" />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <coneGeometry args={[0.9, 1.8, 8]} />
        <meshStandardMaterial color="#2f5a2a" />
      </mesh>
    </group>
  );
}