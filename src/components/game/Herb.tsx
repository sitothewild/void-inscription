import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

export function Herb({ id, x, z }: { id: string; x: number; z: number }) {
  const tiles = useGame((s) => s.tiles);
  const highlight = useGame((s) => s.nearestInteractId === id);
  const y = heightAt(x, z, tiles);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#5fae4a" emissive={highlight ? "#d6ff7a" : "#000"} emissiveIntensity={highlight ? 0.7 : 0} />
      </mesh>
      <mesh position={[0.15, 0.4, 0.1]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#7ac46a" emissive={highlight ? "#d6ff7a" : "#000"} emissiveIntensity={highlight ? 0.7 : 0} />
      </mesh>
      {highlight && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.6, 18]} />
          <meshBasicMaterial color="#d6ff7a" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}
