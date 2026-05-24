import type { Enemy as EnemyT } from "@/game/store";
import { ENEMY_MAX_HP } from "@/game/constants";
import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

export function Enemy({ enemy }: { enemy: EnemyT }) {
  const ratio = Math.max(0, enemy.hp / ENEMY_MAX_HP);
  const tiles = useGame((s) => s.tiles);
  const ey = heightAt(enemy.x, enemy.z, tiles);
  return (
    <group position={[enemy.x, ey, enemy.z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.55, 0.8, 0.4]} />
        <meshStandardMaterial color="#5a2a4a" />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#7a3a5a" />
      </mesh>
      <mesh position={[-0.08, 1.15, 0.18]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshBasicMaterial color="#ff5566" toneMapped={false} />
      </mesh>
      <mesh position={[0.08, 1.15, 0.18]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshBasicMaterial color="#ff5566" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.8, 0.08]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[-(0.4 * (1 - ratio)), 1.6, 0.001]}>
        <planeGeometry args={[0.8 * ratio, 0.08]} />
        <meshBasicMaterial color="#e04040" />
      </mesh>
    </group>
  );
}