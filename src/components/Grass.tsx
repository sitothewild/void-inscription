import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  DoubleSide,
} from "three";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = {
  data: TerrainData;
  count?: number;
  /** Override the village exclusion radius. Defaults to data.villageRadius + 2. */
  villageRadius?: number;
};

/** Instanced wind-animated grass blades on plains/forest tiles. */
export function Grass({ data, count = 6000, villageRadius }: Props) {
  const exclusion = villageRadius ?? data.villageRadius + 2;
  const meshRef = useRef<InstancedMesh>(null!);
  const matRef = useRef<MeshStandardMaterial>(null!);
  const timeUniform = useRef({ value: 0 });

  const { geometry, instances } = useMemo(() => {
    const geo = new PlaneGeometry(0.18, 0.55, 1, 3);
    geo.translate(0, 0.275, 0);
    // Bend top vertices forward weight via attribute (y position used in shader)

    const rng = mulberry32(1337);
    const dummy = new Object3D();
    const matrices: Matrix4[] = [];
    const colors: Color[] = [];
    const baseA = new Color("#6fbf52");
    const baseB = new Color("#3a7d3a");
    const half = data.worldSize / 2;
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 6) {
      attempts++;
      const x = (rng() * 2 - 1) * half * 0.9;
      const z = (rng() * 2 - 1) * half * 0.9;
      if (Math.hypot(x, z) < exclusion) continue;
      const h = data.sampleAt(x, z);
      if (h < 0.2 || h > 0.65) continue; // plains+forest only
      const y = h * data.maxHeight;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      const s = 0.7 + rng() * 0.8;
      dummy.scale.set(s, 0.8 + rng() * 0.7, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      const c = baseA.clone().lerp(baseB, rng() * 0.7);
      colors.push(c);
      placed++;
    }
    return { geometry: geo, instances: { matrices, colors } };
  }, [data, count, exclusion]);

  // Re-upload instance matrices + colors whenever the placement regenerates
  // (e.g. village radius changes).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < instances.matrices.length; i++) {
      mesh.setMatrixAt(i, instances.matrices[i]);
      mesh.setColorAt(i, instances.colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = instances.matrices.length;
  }, [instances]);

  useFrame((state) => {
    timeUniform.current.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      key={instances.matrices.length}
      ref={meshRef}
      args={[geometry, undefined, instances.matrices.length]}
      castShadow={false}
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        side={DoubleSide}
        roughness={0.95}
        metalness={0}
        onBeforeCompile={(shader) => {
          shader.uniforms.uTime = timeUniform.current;
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>\nuniform float uTime;`,
            )
            .replace(
              "#include <begin_vertex>",
              `vec3 transformed = vec3( position );
               float bendStrength = pow(max(position.y,0.0)/0.55, 1.5);
               vec4 wp = modelMatrix * instanceMatrix * vec4(transformed,1.0);
               float w = sin(uTime*1.6 + wp.x*0.35 + wp.z*0.45) * 0.18
                       + sin(uTime*2.3 + wp.x*0.7) * 0.07;
               transformed.x += w * bendStrength;
               transformed.z += w * 0.6 * bendStrength;`,
            );
        }}
      />
    </instancedMesh>
  );
}