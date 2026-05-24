import { ISLAND_RADIUS } from "@/game/constants";

export function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#2a4a6b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[ISLAND_RADIUS + 1.5, 64]} />
        <meshStandardMaterial color="#d8c089" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[ISLAND_RADIUS, 64]} />
        <meshStandardMaterial color="#4a7a3a" />
      </mesh>
    </>
  );
}