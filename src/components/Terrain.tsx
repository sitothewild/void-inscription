import { useMemo } from "react";
import { RigidBody, HeightfieldCollider } from "@react-three/rapier";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
} from "three";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

function colorFor(h: number, out: Color) {
  // h is normalized 0..1
  if (h < 0.18) out.set("#e8d39a"); // beach / sand
  else if (h < 0.42) out.set("#5fa84a"); // plains
  else if (h < 0.7) out.set("#2f6b35"); // forest hills
  else if (h < 0.85) out.set("#7a7a7a"); // rock
  else out.set("#e8eef2"); // snow peaks
  return out;
}

export function Terrain({ data }: { data: TerrainData }) {
  const { geometry, heightArray } = useMemo(() => {
    const { heights, size, worldSize, maxHeight } = data;
    const segments = size - 1;
    const geom = new BufferGeometry();
    const positions = new Float32Array(size * size * 3);
    const colors = new Float32Array(size * size * 3);
    const c = new Color();
    const half = worldSize / 2;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const idx = j * size + i;
        const h = heights[idx];
        positions[idx * 3 + 0] = (i / segments) * worldSize - half;
        positions[idx * 3 + 1] = h * maxHeight;
        positions[idx * 3 + 2] = (j / segments) * worldSize - half;
        colorFor(h, c);
        colors[idx * 3 + 0] = c.r;
        colors[idx * 3 + 1] = c.g;
        colors[idx * 3 + 2] = c.b;
      }
    }
    const indices: number[] = [];
    for (let j = 0; j < segments; j++) {
      for (let i = 0; i < segments; i++) {
        const a = j * size + i;
        const b = a + 1;
        const cI = a + size;
        const d = cI + 1;
        indices.push(a, cI, b, b, cI, d);
      }
    }
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    // Heightfield expects column-major heights at unit scale (multiplied by scale.y).
    const hf: number[] = new Array(size * size);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        hf[i * size + j] = heights[j * size + i];
      }
    }
    return { geometry: geom, heightArray: hf };
  }, [data]);

  const { size, worldSize, maxHeight } = data;
  const segments = size - 1;

  return (
    <>
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial vertexColors flatShading side={DoubleSide} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <HeightfieldCollider
          args={[
            segments,
            segments,
            heightArray,
            { x: worldSize, y: maxHeight, z: worldSize },
          ]}
        />
      </RigidBody>
    </>
  );
}