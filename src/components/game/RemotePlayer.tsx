import { Billboard, Text } from "@react-three/drei";
import type { RemotePlayerState } from "@/lib/net/codec";
import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

export function RemotePlayer({ p }: { p: RemotePlayerState }) {
  const hpRatio = Math.max(0, Math.min(1, p.hp / 100));
  const tiles = useGame((s) => s.tiles);
  const py = heightAt(p.x, p.z, tiles);
  return (
    <group position={[p.x, py, p.z]} rotation={[0, p.facing, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.6, 0.9, 0.4]} />
        <meshStandardMaterial color={p.color} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#e8c69a" />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[0.3, 0.3, 6]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 0.75, 0]} castShadow>
        <boxGeometry args={[0.7, 0.12, 0.12]} />
        <meshStandardMaterial color="#dddddd" metalness={0.7} roughness={0.3} />
      </mesh>
      <Billboard position={[0, 2.1, 0]}>
        <Text fontSize={0.32} color="white" outlineWidth={0.03} outlineColor="black">
          {p.name}
        </Text>
        <mesh position={[0, -0.35, 0]}>
          <planeGeometry args={[1.0, 0.08]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[-(0.5 * (1 - hpRatio)), -0.35, 0.001]}>
          <planeGeometry args={[1.0 * hpRatio, 0.08]} />
          <meshBasicMaterial color="#e04040" />
        </mesh>
      </Billboard>
    </group>
  );
}