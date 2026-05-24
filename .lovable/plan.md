
# Midgard-Style Browser Prototype — Plan

## Honest scope note

A true Tribe of Midgard clone is a multi-year studio effort. What's realistic here is an inspired prototype: a small isometric survival/defense loop you can play with friends in the browser. Expect "indie game jam" quality, not Norsfell production value. Online co-op especially is the riskiest piece — browser games over Supabase Realtime work for 2–4 players in the same region with visible latency, not for fast-paced combat at scale.

I recommend we build this in 3 incremental milestones so you can play after each one. This plan covers Milestone 1 + the scaffolding for 2 and 3.

## Gameplay loop (target)

- Day: explore a procedural island, chop trees, mine rocks, hunt boars, gather resources.
- Dusk: return to the Seed of Yggdrasil (your base), craft gear at a forge, build palisades.
- Night: waves of Helthings spawn and attack the Seed. Defend until dawn.
- Lose: Seed HP hits 0. Win: survive N nights and defeat the Jötunn boss.

## Tech choices

- Rendering: `three` + `@react-three/fiber` + `@react-three/drei` (camera, GLTF loader, instancing).
- Physics/collision: lightweight AABB + grid checks (no full physics engine — Rapier is heavy and overkill).
- Controls: top-down isometric ortho camera, WASD move, mouse-click attack/interact, click-to-place build.
- Assets: free CC0 GLTF from Kenney's "Mini" packs (Viking-friendly low-poly). Bundled in `src/assets/models/`.
- State: Zustand for local game state, React Query only for menus.
- Multiplayer: Supabase Realtime (Lovable Cloud) — Presence for player list, Broadcast for movement/actions at ~15 Hz, Postgres for persistent runs.
- Auth: anonymous sessions + optional display name (no email required for a game).

## Milestone 1 — Single-player core (this build)

1. Lovable Cloud enabled; `runs` and `players` tables created with RLS.
2. Three.js scene: isometric ortho camera, lit ground plane, skybox, day/night color cycle.
3. Hero character (GLTF) with WASD movement, idle/run/attack animations, click-to-attack.
4. World: 64×64 tile island, procedurally placed trees and rocks (deterministic seed).
5. Resource gathering: click tree → chop animation → wood +1; same for stone.
6. Inventory + simple crafting UI (axe, sword, palisade).
7. One enemy type (Helthing): wanders, chases on sight, melee attack.
8. The Seed: central object with HP bar. Enemies path to it at night.
9. Day/night cycle (~3 min day, ~2 min night). Night spawns 5–10 enemies.
10. HUD: health, stamina, inventory, day counter, Seed HP.
11. Game over + restart.

Route: `/play` (single-player). Landing page `/` explains the game with a Play button.

## Milestone 2 — Co-op (separate build)

- Lobby route `/lobby` — create or join a room code.
- Supabase Realtime channel per room. Broadcast: `move`, `attack`, `hit`, `gather`, `build`. Presence: connected players.
- Authoritative-ish host model: room creator's client owns enemy AI and world state, sends snapshots at 10 Hz; other clients send inputs.
- Render remote players with name labels.
- Caveats I will set expectations on: ~100–300 ms perceived latency, no rollback, host migration not handled (if host disconnects, run ends).

## Milestone 3 — Depth (separate build)

- 2 more enemy types, 1 boss.
- Procedural island variants (forest / tundra / coast biomes).
- Building system: palisades, watchtowers, second forge.
- Persistent meta-progression: unlock classes between runs.

## Files in Milestone 1

- Schema migration: `runs`, `players`, `run_events` tables + RLS.
- `src/routes/index.tsx` — replace placeholder with landing page (title, blurb, Play CTA).
- `src/routes/play.tsx` — game canvas + HUD overlay.
- `src/game/` — engine code (not React):
  - `world.ts` (procedural map gen, deterministic RNG)
  - `entities.ts` (hero, enemies, resources, seed)
  - `combat.ts`, `inventory.ts`, `crafting.ts`, `daynight.ts`, `ai.ts`
  - `loop.ts` (fixed-timestep update loop)
  - `store.ts` (Zustand)
- `src/components/game/` — R3F components: `Scene`, `Hero`, `Enemy`, `Tree`, `Rock`, `Seed`, `Ground`, `IsoCamera`, `Lighting`.
- `src/components/hud/` — `HealthBar`, `Inventory`, `CraftingPanel`, `DayCounter`, `SeedHealth`, `GameOver`.
- `src/assets/models/` — downloaded CC0 GLTF files (hero, enemy, tree, rock, seed).
- `package.json` — add `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`, `zustand`.

## What I will NOT do in Milestone 1

- No online multiplayer (that's M2).
- No procedural biomes beyond one island.
- No boss, no progression unlocks.
- No mobile/touch controls (desktop only).
- No audio in M1 (can add SFX/music in M3 if you want).

## Risks / open questions

- Asset licensing: I'll use Kenney CC0 packs; if you want custom art, that's a separate engagement.
- Performance: targeting 60 FPS on a modern laptop with ~50 enemies on screen. Older hardware/phones will struggle.
- Online co-op over Supabase Realtime is not a real game netcode stack. If smoothness matters, the right answer is a dedicated server (Colyseus on Fly.io, etc.), which is out of Lovable's scope.

Approve and I'll start with Milestone 1.
