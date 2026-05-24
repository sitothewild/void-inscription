import { ISLAND_RADIUS } from "@/game/constants";
import { RigidBody } from "@react-three/rapier";

export function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#2a4a6b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[ISLAND_RADIUS + 1.5, 96]} />
        <meshStandardMaterial color="#e8cf8a" roughness={1} />
      </mesh>
      {/* Layer-0 grass disc, also the world floor collider for Rapier */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS, 1, 96]} />
          <meshStandardMaterial color="#5b9b46" roughness={0.95} />
        </mesh>
      </RigidBody>
    </>
  );
}