import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points as PointsType } from "three";
import { BufferAttribute, BufferGeometry } from "three";

type Props = {
  count?: number;
  bounds?: { x: number; y: number; z: number };
  color?: string;
  size?: number;
  speed?: number;
};

export function Particles({
  count = 200,
  bounds = { x: 18, y: 12, z: 30 },
  color = "#40ffaa",
  size = 0.18,
  speed = 1.2,
}: Props) {
  const ref = useRef<PointsType>(null!);
  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2 * bounds.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * bounds.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * bounds.z;
      vel[i] = 0.3 + Math.random() * 0.9;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: g, velocities: vel };
  }, [count, bounds.x, bounds.y, bounds.z]);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += velocities[i] * speed * dt;
      if (arr[i * 3 + 1] > bounds.y) {
        arr[i * 3 + 1] = -bounds.y;
        arr[i * 3 + 0] = (Math.random() - 0.5) * 2 * bounds.x;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 2 * bounds.z;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}