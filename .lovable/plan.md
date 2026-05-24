
# ToM × BOTW Terrain & Physics Rebuild

A staged rebuild. Each stage leaves the game playable so we can verify before moving on.

## Stage 1 — Modular slab terrain

Replace the cylinder-plateau system with a deterministic grid of square slab tiles at integer Y layers (0, 1, 2). Tiles include flat slabs, ramp slabs, and edge fillers. Procedurally generated from the world seed, but built from a small kit so cliffs stay crisp.

New / changed:
- `src/game/terrain.ts` — rewrite. Generate a `Tile[]` grid: `{ gx, gz, layer, kind: 'slab' | 'ramp', rampDir? }`. Keep deterministic mulberry32 seeding. Export new `heightAt`, `isOnRamp`, `isValidResourceSpot` that read the tile grid instead of cylinder math.
- `src/game/constants.ts` — add `TILE_SIZE` (e.g. 4), `LAYER_HEIGHT` (1.4), `GRID_RADIUS` (in tiles).
- `src/components/game/Plateaus.tsx` → rename to `Terrain.tsx`. Render each tile as a `<RigidBody type="fixed">` with a cuboid (slab) or trimesh (ramp) collider. One instanced mesh per tile kind for perf.
- `src/components/game/Ground.tsx` — keep the ocean plane + sand ring; remove the green disc (slabs cover it now).

## Stage 2 — Triplanar toon material

A single shader material reused by every slab. Top-facing normals sample a stylized grass color ramp; side-facing normals sample a rocky cliff ramp. Adds a cel-shaded step + Fresnel rim light for the BOTW silhouette pop.

New:
- `src/components/game/materials/TriplanarToon.ts` — `ShaderMaterial` factory. Uniforms: `uGrassA/uGrassB`, `uCliffA/uCliffB`, `uRimColor`, `uSunDir`, `uTime` (for subtle grass shimmer). Vertex shader passes world position + world normal. Fragment uses `abs(normal)` weights for triplanar blend, quantized N·L for toon banding, and Fresnel for rim.
- Applied in `Terrain.tsx` for all slab/ramp meshes. Cliff sides automatically look rocky without UV stretching.

## Stage 3 — Grass on flats only

- `src/components/game/WindField.tsx` — scatter from the new tile grid: pick random points on top faces of slabs (skip ramps, skip the village footprint). Reads `tiles` instead of `plateaus`. Same instanced wind shader.

## Stage 4 — Rapier physics

Install `@react-three/rapier` and migrate movement.

- `bun add @react-three/rapier`
- `src/components/game/Scene.tsx` — wrap world in `<Physics>` (gravity y = -22).
- `src/components/game/Terrain.tsx` — each slab/ramp gets a fixed `RigidBody` with the right collider (cuboid for slabs, trimesh for ramps).
- `src/components/game/Hero.tsx` — replace manual `position.set` with a `<RigidBody type="kinematicPosition">` driven by a `KinematicCharacterController` (slope limit ~46°, offset 0.05, autostep 0.4, snap-to-ground 0.5). Input vector from existing keyboard/touch store; controller handles cliff walls and smooth ramp climbs natively.
- `src/components/game/Enemy.tsx` — same kinematic controller pattern, simpler steering toward target.
- `src/game/store.ts` — keep `heroX/heroZ` but write them from the hero's RigidBody translation each frame so the rest of the game (camera, AI, vendors) keeps working unchanged.

## Stage 5 — Camera & upper-slab fade

- `src/components/game/IsoCamera.tsx` — keep ortho iso angle; tighten the lerp now that movement is physics-driven so gravity arcs read smoothly.
- New `src/components/game/CameraFade.tsx` — raycasts from the camera toward the hero each frame; any slab tile intersected has its material `uniforms.uFade` driven toward 0.15 (dithered alpha) so upper layers don't block the view when the hero walks under them.

## Stage 6 — Cleanup / parity

- Remove obsolete cylinder-plateau code paths.
- Update `src/components/game/Tree.tsx`, `Rock.tsx`, `Herb.tsx`, `Vendor.tsx`, `Village.tsx`, `Seed.tsx`, `Enemy.tsx`, `RemotePlayer.tsx` to call the new `heightAt(x, z, tiles)` (signature change is contained — same name, new arg type).
- `src/game/world.ts` — `generateWorld(seed, tiles)` uses the new `isValidResourceSpot`.

## Technical notes

- **Tile kit**: only 2 mesh types are needed (slab box, ramp wedge). All variation comes from layer/rotation. Cliff faces appear automatically wherever a higher slab abuts a lower one — no extra meshes.
- **Determinism**: same seed → same tile layout, so multiplayer rooms stay in sync.
- **Performance**: one instanced mesh per (kind × layer) pair (~6 draw calls for terrain), one Rapier fixed body per tile (~80–150 bodies, well within budget).
- **Risk**: Rapier migration touches hero + enemies + multiplayer position sync. Mitigation: keep `heroX/heroZ` in the zustand store as the source of truth that other systems read; only the *writer* changes from manual math to RigidBody translation.

## Out of scope (ask later if wanted)

- New GLTF terrain assets (Option A from your message) — Stage 1 uses primitive boxes/wedges with the triplanar shader, which gives the same look without external assets.
- Combat / AI overhaul.
- Networked physics — Rapier runs client-side only; multiplayer keeps its current position-broadcast model.
