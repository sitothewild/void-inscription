import { useMemo } from "react";
import { RigidBody, HeightfieldCollider, CuboidCollider } from "@react-three/rapier";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
} from "three";
import type { TerrainData } from "@/hooks/useProceduralTerrain";
import { biomeColor } from "@/game/biomes";

function colorFor(data: TerrainData, x: number, z: number, h: number, out: Color) {
  // h is normalized 0..1
  return biomeColor(data.biomeAt(x, z), h, out);
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
        const x = (i / segments) * worldSize - half;
        const z = (j / segments) * worldSize - half;
        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = h * maxHeight;
        positions[idx * 3 + 2] = z;
        colorFor(data, x, z, h, c);
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

    // Rapier heightfield: heights[i + j*nrows] at (i*sx/(nrows-1), j*sz/(ncols-1)).
    // Our mesh stores heights[j*size + i] (z-outer, x-inner) — same layout as Rapier expects.
    const hf: number[] = Array.from(heights);
    return { geometry: geom, heightArray: hf };
  }, [data]);

  const { size, worldSize, maxHeight } = data;
  const segments = size - 1;
  const half = worldSize / 2;
  const wallH = maxHeight + 8;

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
          friction={1.2}
        />
      </RigidBody>
      {/* Invisible world-border walls so you can't fall off the edge */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[half, wallH, 1]} position={[0, wallH, -half - 1]} />
        <CuboidCollider args={[half, wallH, 1]} position={[0, wallH, half + 1]} />
        <CuboidCollider args={[1, wallH, half]} position={[-half - 1, wallH, 0]} />
        <CuboidCollider args={[1, wallH, half]} position={[half + 1, wallH, 0]} />
        {/* Kill-floor catcher far below */}
        <CuboidCollider args={[half + 4, 0.5, half + 4]} position={[0, -8, 0]} />
      </RigidBody>
    </>
  );
}