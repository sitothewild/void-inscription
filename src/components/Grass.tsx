import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  FrontSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
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

/** Build one cross-shaped tapered blade (two perpendicular blades sharing a base). */
function makeBladeGeometry() {
  // Per blade: 5 verts (base L/R, mid L/R, tip), 3 triangles.
  // Two blades crossed at 90° → 10 verts, 6 triangles.
  const W = 0.05; // base half-width
  const H = 0.65; // height
  const positions: number[] = [];
  const uvs: number[] = []; // we use v (uv.y) as height ratio for shader bend & color
  const indices: number[] = [];

  const addBlade = (angle: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    // local (x, y, 0) → world (c*x, y, s*x)
    const v = (x: number, y: number) => positions.push(c * x, y, s * x);
    const base = positions.length / 3;
    v(-W, 0); uvs.push(0, 0);              // 0 base L
    v( W, 0); uvs.push(1, 0);              // 1 base R
    v(-W * 0.7, H * 0.55); uvs.push(0, 0.55); // 2 mid L
    v( W * 0.7, H * 0.55); uvs.push(1, 0.55); // 3 mid R
    v(0, H); uvs.push(0.5, 1);             // 4 tip
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
    indices.push(base + 2, base + 3, base + 4);
  };
  addBlade(0);
  addBlade(Math.PI / 2);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  // Up-facing normals so blades catch the sun instead of going black.
  const normals = new Float32Array((positions.length / 3) * 3);
  for (let i = 0; i < positions.length / 3; i++) {
    normals[i * 3 + 0] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
  }
  geo.setAttribute("normal", new BufferAttribute(normals, 3));
  return geo;
}

/** Instanced wind-animated grass blades on plains/forest tiles. */
export function Grass({ data, count = 16000, villageRadius }: Props) {
  const exclusion = villageRadius ?? data.villageRadius + 2;
  const meshRef = useRef<InstancedMesh>(null!);
  const matRef = useRef<MeshStandardMaterial>(null!);
  const timeUniform = useRef({ value: 0 });

  const { geometry, instances } = useMemo(() => {
    const geo = makeBladeGeometry();
    const rng = mulberry32(1337);
    const dummy = new Object3D();
    const matrices: Matrix4[] = [];
    const colors: Color[] = [];
    // Saturated, brighter greens — biome-tinted.
    const plainsA = new Color("#8ed864");
    const plainsB = new Color("#4f9e3c");
    const forestA = new Color("#6cc34a");
    const forestB = new Color("#2f6b35");
    const swampA = new Color("#7fb361");
    const swampB = new Color("#3a6a3a");
    const half = data.worldSize / 2;
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 10) {
      attempts++;
      const x = (rng() * 2 - 1) * half * 0.9;
      const z = (rng() * 2 - 1) * half * 0.9;
      if (Math.hypot(x, z) < exclusion) continue;
      const h = data.sampleAt(x, z);
      // Skip beaches/sand (low), bare mountain rock & snow (high).
      if (h < 0.22 || h > 0.6) continue;
      // Skip biomes that should NOT have grass (desert, tundra, mountains, dirt paths).
      const biome = data.biomeAt(x, z);
      if (biome === "desert" || biome === "tundra" || biome === "mountains") continue;
      const y = h * data.maxHeight;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      const s = 0.85 + rng() * 0.8;
      dummy.scale.set(s, 0.9 + rng() * 0.9, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      const a = biome === "forest" ? forestA : biome === "swamp" ? swampA : plainsA;
      const b = biome === "forest" ? forestB : biome === "swamp" ? swampB : plainsB;
      const c = a.clone().lerp(b, rng() * 0.85);
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
      receiveShadow={false}
      frustumCulled={false}
    >
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        side={FrontSide}
        roughness={0.85}
        metalness={0}
        emissive={"#1a3a1a"}
        emissiveIntensity={0.35}
        onBeforeCompile={(shader) => {
          shader.uniforms.uTime = timeUniform.current;
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>\nuniform float uTime;\nvarying float vBladeHeight;`,
            )
            .replace(
              "#include <begin_vertex>",
              `vec3 transformed = vec3( position );
               float heightRatio = clamp(position.y / 0.65, 0.0, 1.0);
               vBladeHeight = heightRatio;
               float bendStrength = pow(heightRatio, 1.6);
               vec4 wp = modelMatrix * instanceMatrix * vec4(transformed,1.0);
               float w = sin(uTime*1.6 + wp.x*0.35 + wp.z*0.45) * 0.18
                       + sin(uTime*2.3 + wp.x*0.7) * 0.07;
               transformed.x += w * bendStrength;
               transformed.z += w * 0.6 * bendStrength;
               // Slight droop so tip arcs over rather than shearing flat.
               transformed.y -= bendStrength * 0.06;`,
            );
          // Fragment: lighten the tip so blades read as real grass instead
          // of flat dark rectangles.
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>\nvarying float vBladeHeight;`,
            )
            .replace(
              "#include <color_fragment>",
              `#include <color_fragment>
               diffuseColor.rgb = mix(diffuseColor.rgb * 0.55, diffuseColor.rgb * 1.35, vBladeHeight);`,
            );
        }}
      />
    </instancedMesh>
  );
}