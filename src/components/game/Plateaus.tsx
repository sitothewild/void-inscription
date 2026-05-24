import { useGame } from "@/game/store";
import type { Plateau } from "@/game/terrain";

function PlateauMesh({ p }: { p: Plateau }) {
  // Top slab (cylinder gives a smooth circular plateau)
  // Ramp dimensions
  const rdx = Math.cos(p.ramp.angle);
  const rdz = Math.sin(p.ramp.angle);
  // Ramp midpoint along outward direction
  const mx = p.cx + rdx * (p.radius + p.ramp.length / 2);
  const mz = p.cz + rdz * (p.radius + p.ramp.length / 2);
  // Ramp slope angle (rise over run, tilted around axis perpendicular to ramp direction)
  const slope = Math.atan2(p.height, p.ramp.length);
  return (
    <group>
      {/* Plateau body */}
      <mesh position={[p.cx, p.height / 2, p.cz]} castShadow receiveShadow>
        <cylinderGeometry args={[p.radius, p.radius + 0.2, p.height, 24]} />
        <meshStandardMaterial color="#6b8e4c" roughness={0.95} />
      </mesh>
      {/* Plateau top cap for nicer texture contrast */}
      <mesh
        position={[p.cx, p.height + 0.005, p.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[p.radius, 24]} />
        <meshStandardMaterial color="#7aa356" roughness={0.9} />
      </mesh>
      {/* Ramp — a tilted box bridging plateau top to ground */}
      <group position={[mx, p.height / 2, mz]} rotation={[0, -p.ramp.angle, 0]}>
        <mesh rotation={[0, 0, -slope]} castShadow receiveShadow>
          <boxGeometry args={[p.ramp.length / Math.cos(slope), 0.18, p.ramp.width]} />
          <meshStandardMaterial color="#7a6a4a" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

export function Plateaus() {
  const plateaus = useGame((s) => s.plateaus);
  return (
    <>
      {plateaus.map((p, i) => (
        <PlateauMesh key={i} p={p} />
      ))}
    </>
  );
}