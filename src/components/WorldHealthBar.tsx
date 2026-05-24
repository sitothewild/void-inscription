import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { Billboard, Text } from "@react-three/drei";
import { health, type HealthId } from "@/game/health";

type Props = {
  id: HealthId;
  /** Y offset above the parent object. */
  yOffset?: number;
  /** Bar width in world units. */
  width?: number;
  /** Bar fill color. */
  color?: string;
  /** Optional label rendered above the bar. */
  label?: string;
  /** Hide when full HP (default true). */
  hideWhenFull?: boolean;
};

/**
 * A small floating health bar billboard. Reads the global health store every
 * frame so it never re-renders in React.
 */
export function WorldHealthBar({
  id,
  yOffset = 2,
  width = 1.8,
  color = "#7ae0a8",
  label,
  hideWhenFull = true,
}: Props) {
  const groupRef = useRef<Group>(null);
  const fillRef = useRef<Mesh>(null);
  const bgRef = useRef<Mesh>(null);

  useFrame(() => {
    const e = health.get()[id];
    const g = groupRef.current;
    if (!g) return;
    if (!e) {
      g.visible = false;
      return;
    }
    const ratio = e.hp / e.max;
    const full = ratio >= 0.999;
    const recentHit = performance.now() - e.lastHit < 2500;
    g.visible = !hideWhenFull || !full || recentHit;
    if (!g.visible) return;
    if (fillRef.current) {
      fillRef.current.scale.x = Math.max(0.0001, ratio);
      // Anchor left so it shrinks toward the right.
      fillRef.current.position.x = -(width * (1 - ratio)) / 2;
    }
    void bgRef.current;
  });

  const h = 0.16;
  return (
    <group ref={groupRef} position={[0, yOffset, 0]}>
      <Billboard>
        {label && (
          <Text
            position={[0, h * 1.6, 0.01]}
            fontSize={0.18}
            color="#fff"
            outlineWidth={0.012}
            outlineColor="#000"
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        )}
        <mesh ref={bgRef}>
          <planeGeometry args={[width + 0.06, h + 0.06]} />
          <meshBasicMaterial color={"#000"} transparent opacity={0.65} depthWrite={false} />
        </mesh>
        <mesh ref={fillRef} position={[0, 0, 0.001]}>
          <planeGeometry args={[width, h]} />
          <meshBasicMaterial color={color} toneMapped={false} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}