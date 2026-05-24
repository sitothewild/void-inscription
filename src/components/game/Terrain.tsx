import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import {
  BufferAttribute,
  BufferGeometry,
  type Mesh,
} from "three";
import { useGame } from "@/game/store";
import { LAYER_HEIGHT, TILE_SIZE } from "@/game/constants";
import type { Tile } from "@/game/terrain";
import {
  createTriplanarToon,
  type TriplanarToonMaterial,
} from "./materials/TriplanarToon";

/** Wedge geometry: a tile-sized prism low on -X, high on +X (ramp toward +X). */
function makeRampGeometry(size: number, height: number) {
  const g = new BufferGeometry();
  const h = size / 2;
  // 6 vertices: bottom square + top square pinched on low side
  // We just build a triangular prism: two triangles for top sloped face,
  // sides closing the volume.
  const verts = new Float32Array([
    // bottom (y=0)
    -h, 0, -h,
    h, 0, -h,
    h, 0, h,
    -h, 0, h,
    // top sloped face (low at x=-h, high at x=+h)
    -h, 0, -h,
    h, height, -h,
    h, height, h,
    -h, 0, h,
  ]);
  const idx = [
    // bottom
    0, 2, 1, 0, 3, 2,
    // sloped top
    4, 5, 6, 4, 6, 7,
    // -z side (triangle)
    0, 1, 5, 0, 5, 4,
    // +z side (triangle)
    3, 6, 2, 3, 7, 6,
    // +x face (vertical rectangle)
    1, 2, 6, 1, 6, 5,
    // -x face is a degenerate vertical line — skip
  ];
  g.setAttribute("position", new BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function SlabTile({
  tile,
  material,
}: {
  tile: Tile;
  material: TriplanarToonMaterial;
}) {
  const wx = tile.gx * TILE_SIZE;
  const wz = tile.gz * TILE_SIZE;
  const h = tile.layer * LAYER_HEIGHT;
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[wx, h / 2, wz]}>
      <mesh receiveShadow castShadow material={material}>
        <boxGeometry args={[TILE_SIZE, h, TILE_SIZE]} />
      </mesh>
    </RigidBody>
  );
}

function RampTile({
  tile,
  material,
}: {
  tile: Tile;
  material: TriplanarToonMaterial;
}) {
  const wx = tile.gx * TILE_SIZE;
  const wz = tile.gz * TILE_SIZE;
  const h = tile.layer * LAYER_HEIGHT;
  const geom = useMemo(() => makeRampGeometry(TILE_SIZE, h), [h]);
  // Rotate the geometry so its +X high side faces tile.rampDir
  const d = tile.rampDir!;
  // base ramp wedge: high side at +X. Rotate around Y so +X → (dx,dz)
  const rotY = Math.atan2(d.dx, d.dz) - Math.PI / 2;
  return (
    <RigidBody type="fixed" colliders="trimesh" position={[wx, 0, wz]} rotation={[0, rotY, 0]}>
      <mesh receiveShadow castShadow material={material} geometry={geom} />
    </RigidBody>
  );
}

export function Terrain() {
  const tiles = useGame((s) => s.tiles);
  // One material per layer so CameraFade can dim only upper layers.
  const matsRef = useRef<Map<number, TriplanarToonMaterial> | null>(null);
  if (!matsRef.current) matsRef.current = new Map();
  const getMat = (layer: number) => {
    const cache = matsRef.current!;
    let m = cache.get(layer);
    if (!m) {
      m = createTriplanarToon();
      cache.set(layer, m);
    }
    return m;
  };

  useFrame((_, dt) => {
    matsRef.current!.forEach((m) => {
      m.uniforms.uTime.value += dt;
    });
  });

  return (
    <group>
      {tiles.map((t, i) =>
        t.kind === "slab" ? (
          <SlabTile key={`s${i}`} tile={t} material={getMat(t.layer)} />
        ) : (
          <RampTile key={`r${i}`} tile={t} material={getMat(t.layer)} />
        ),
      )}
    </group>
  );
}

/** Exposed for camera-fade raycasting hooks (not used yet). */
export function useTerrainMeshes(): Mesh[] {
  return [];
}