import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

export function Rock({ id, x, z }: { id: string; x: number; z: number }) {
  const plateaus = useGame((s) => s.plateaus);
  const highlight = useGame((s) => s.nearestInteractId === id);
  const y = heightAt(x, z, plateaus);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color="#888888"
          flatShading
          emissive={highlight ? "#cfe8ff" : "#000000"}
          emissiveIntensity={highlight ? 0.7 : 0}
        />
      </mesh>
      {highlight && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.95, 20]} />
          <meshBasicMaterial color="#cfe8ff" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}