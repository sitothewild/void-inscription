export function Rock({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.3, z]} castShadow>
      <dodecahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial color="#888888" flatShading />
    </mesh>
  );
}