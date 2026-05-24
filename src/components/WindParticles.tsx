import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points } from "three";

type Props = {
  count?: number;
  area?: number;
  height?: number;
};

/** Drifting bright motes blown by the wind across the island. */
export function WindParticles({ count = 350, area = 90, height = 14 }: Props) {
  const pointsRef = useRef<Points>(null!);

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * height + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
      vels[i * 3 + 0] = 1.2 + Math.random() * 0.8;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      vels[i * 3 + 2] = 0.3 + Math.random() * 0.4;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: geom, velocities: vels };
  }, [count, area, height]);

  useFrame((state, dt) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const pos = (pts.geometry.attributes.position as BufferAttribute).array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] += velocities[i * 3 + 0] * dt;
      pos[i * 3 + 1] += Math.sin(t * 0.8 + i) * 0.01;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      if (pos[i * 3 + 0] > area / 2) pos[i * 3 + 0] = -area / 2;
      if (pos[i * 3 + 2] > area / 2) pos[i * 3 + 2] = -area / 2;
    }
    (pts.geometry.attributes.position as BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.18}
        color={"#fff6c2"}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}