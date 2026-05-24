import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  type Points as PointsType,
} from "three";

type Props = {
  position: [number, number, number];
  color?: string;
};

/** Spinning glowing cube with an orbiting particle halo. Replaces the old pylon. */
export function Pylon({ position, color = "#ffb060" }: Props) {
  const groupRef = useRef<Group>(null);
  const cubeRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const pointsRef = useRef<PointsType>(null);

  const count = 220;
  const { geometry, radii, speeds, phases, heights } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const r = new Float32Array(count);
    const s = new Float32Array(count);
    const p = new Float32Array(count);
    const h = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      r[i] = 1.4 + Math.random() * 2.4;
      s[i] = 0.4 + Math.random() * 1.2;
      p[i] = Math.random() * Math.PI * 2;
      h[i] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 0] = Math.cos(p[i]) * r[i];
      positions[i * 3 + 1] = h[i];
      positions[i * 3 + 2] = Math.sin(p[i]) * r[i];
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: g, radii: r, speeds: s, phases: p, heights: h };
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (cubeRef.current) {
      cubeRef.current.rotation.y += dt * 0.8;
      cubeRef.current.rotation.x += dt * 0.4;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= dt * 1.6;
      innerRef.current.rotation.z += dt * 0.6;
      const s = 0.6 + Math.sin(t * 3) * 0.08;
      innerRef.current.scale.setScalar(s);
    }
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.25;
    }
    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.getAttribute("position") as BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const a = phases[i] + t * speeds[i];
        arr[i * 3 + 0] = Math.cos(a) * radii[i];
        arr[i * 3 + 1] = heights[i] + Math.sin(t * 0.8 + i) * 0.4;
        arr[i * 3 + 2] = Math.sin(a) * radii[i];
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Outer wireframe cube */}
      <mesh ref={cubeRef} castShadow>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.2}
          wireframe
          toneMapped={false}
        />
      </mesh>
      {/* Inner solid cube */}
      <mesh ref={innerRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3.5}
          toneMapped={false}
        />
      </mesh>
      {/* Particle halo */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          color={color}
          size={0.12}
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <pointLight color={color} intensity={10} distance={30} />
    </group>
  );
}