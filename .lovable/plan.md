
# Open-World Overhaul

A big step up from the current single 100×100 island. We rebuild terrain as a streamed chunk system with LOD, give it real biomes and water features, fix the "ghost" character, and scatter portals across the world.

Because this is a large change, I'll ship it in 4 stages and keep the game playable after each one.

## Stage 1 — Fix the character (no more ghost) & polish current terrain

The reason you slip through walls / get stuck:
- The terrain uses a `HeightfieldCollider`, but the visual mesh uses `BufferGeometry` with averaged normals. On steep slopes the collider and the visual diverge → the capsule clips in.
- Player uses a dynamic rigid body with no friction tuning, so it slides on slopes and pops through micro-gaps.

Fixes:
- Replace the player's dynamic body with a **kinematic character controller** (Rapier's `KinematicCharacterController`) — slope limit 50°, autostep 0.4, snap-to-ground 0.5, character offset 0.05. This is what BOTW-style movement needs and removes the "stuck on a pixel" issue.
- Match collider to visual: rebuild the heightfield from the exact same vertex grid the mesh uses, with a tiny `0.02` skin offset so the capsule never sits *inside* a triangle.
- Add invisible **kill-floor & world border walls** so you cannot fall off the edge.

## Stage 2 — Shoreline & animated ocean

- Replace the flat blue plane with a tiled **animated water shader** (gerstner-ish wave displacement + foam at shoreline based on depth).
- Add a **beach/sand ring** that blends from terrain into surf.
- Add a **far ocean cap** (a huge low-poly disc) so the horizon never shows the void.
- Subtle foam particles where waves meet shore.

## Stage 3 — Chunked streaming + LOD + biomes

Switch from one 100m island to a grid of **64m chunks** generated on demand around the player.

- `src/game/chunkManager.ts` — keeps a Map of loaded chunks keyed by `(cx,cz)`. Each frame, computes the player's chunk and ensures a `radius=3` ring is loaded (LOD0), `radius=5` is LOD1 (half resolution), `radius=7` is LOD2 (quarter, no colliders, no grass, no resources). Unloads beyond that.
- `src/game/biomes.ts` — domain-warped noise picks a biome per (x,z): `plains`, `forest`, `desert`, `tundra`, `mountains`, `swamp`. Biome drives color ramp, tree/rock density, grass color, and ambient tint.
- `src/components/Chunk.tsx` — renders one chunk: mesh + collider (LOD0/1 only), grass instances (LOD0 only), resources (LOD0 only), animals (LOD0/1).
- World size effectively becomes "infinite" (deterministic from seed + chunk coords).

## Stage 4 — Rivers, waterfalls, mountains, scattered portals

- **Mountains**: biome mask adds a tall ridge-noise term; peaks above 0.85 get snow material.
- **Rivers**: trace down-slope from random mountain peaks, carve the heightfield along the path, and lay a thin animated water ribbon mesh.
- **Waterfalls**: where a river crosses a steep cliff edge (slope > 60°), spawn a vertical water-plane + particle spray + point light.
- **Portals**: replace the fixed ring of 5 with a deterministic Poisson-disk scatter (one portal per ~200m², biased to interesting landmarks: peaks, river deltas, forest clearings). Each portal gets a biome-themed color.

## Technical notes

- All randomness stays seeded (`mulberry32(seed, cx, cz)`), so multiplayer/replays stay deterministic.
- Streaming runs off the main thread where possible (heightfield gen in a Web Worker; meshes built on main).
- LOD2 chunks share one merged instanced mesh per biome to keep draw calls flat.
- Kinematic controller writes its translation into the same `playerRef` so portals, AI, vendors keep working.

## Out of scope for this PR (ask later if wanted)

- Network sync of streamed chunks (still single-player physics).
- Caves / overhangs (would need voxels, not heightfields).
- Day/night cycle tied to biome ambient.
- Weather (rain in swamp, snow in tundra).

I'll start with **Stage 1** (character fix + no falling off the world) since that's the most painful issue right now, then ship the rest.
