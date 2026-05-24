
# Milestone 2 — Online Co-op

## Goal

Let 2–4 players share a single run via a 6-character room code. Host's browser owns the world (enemies, resources, Seed, day/night); other clients send their inputs and render the host's snapshot.

## Architecture

- Enable Lovable Cloud. Use Supabase **Realtime only** (no DB writes during play — keeps latency low and avoids RLS friction).
- One channel per room: `room:{CODE}`.
- **Anonymous auth** so each tab has a stable `user_id` for Presence.
- Two message kinds on the channel:
  - **broadcast `input`** — clients → host, ~15 Hz: `{ heroX, heroZ, facing, attacking }`.
  - **broadcast `snapshot`** — host → everyone, ~12 Hz: world delta (`players[]`, `enemies[]`, `resources[]`, `seedHp`, `phase`, `phaseTime`, `day`, `status`).
  - **broadcast `event`** — one-shots: `gather`, `craft`, `chat`, `joined`, `left`.
- **Presence** tracks `{ userId, name, color, isHost }`. Host = lowest userId in presence (deterministic; survives reconnects of non-hosts).

## Routes

- `/lobby` — Enter name, then **Create room** (generates code, navigates to `/play?room=XXXX&host=1`) or **Join room** (enter code, navigates to `/play?room=XXXX`).
- `/play` — already exists. Reads `?room` search param. If present → multiplayer mode. If absent → unchanged single-player.
- Landing `/` — add a "Play with friends" CTA next to the existing "Enter Midgard".

## Files

New:
- `src/lib/net/room.ts` — channel setup, presence, broadcast helpers, host election.
- `src/lib/net/codec.ts` — compact snapshot/input shapes.
- `src/game/multiplayer.ts` — `useMultiplayer()` hook: subscribes to room, runs host loop OR client loop based on `isHost`.
- `src/components/game/RemotePlayer.tsx` — render other players (reuse Hero geometry, different color + name label via drei `Text`).
- `src/components/hud/Lobby.tsx` — name + room code UI.
- `src/components/hud/RoomBar.tsx` — small overlay in `/play`: room code (click to copy), connected players, host indicator, leave button.
- `src/routes/lobby.tsx` — lobby page.

Modified:
- `src/routes/play.tsx` — read `?room`, mount multiplayer hook when present, render `RemotePlayer`s.
- `src/components/game/GameLoop.tsx` — split:
  - Always: hero input + facing + local hero attack feedback.
  - Host only: world tick (current logic — enemies, resources, day/night).
  - Non-host: skip world tick; consume snapshots to update store (enemies, seed, day/night, resources). Local hero is predicted; remote heroes come from snapshots.
- `src/game/store.ts` — add `players: Record<userId, RemotePlayerState>`, `selfId`, `isHost`, `roomCode`, plus `applySnapshot(snap)` and `applyInput(userId, input)` actions.
- `src/routes/index.tsx` — add "Play with friends" secondary button → `/lobby`.

## Game tweaks for co-op

- Enemy aggro picks **nearest player** in sight, not just local hero.
- Seed HP and day counter come from snapshot on clients; host runs the existing timer.
- Resources: when host removes one, snapshot diff handles it; clients send a `gather` request, host validates range and applies.
- Damage attribution stays simple (no scoring in M2).

## Caveats I will surface in the UI

- "Co-op is experimental. Best with 2–4 players in the same region. Expect 100–300 ms latency on combat."
- If the host disconnects, the run ends (host migration is out of scope for M2).
- No reconnect/resume — leaving the tab ends your participation.

## What's NOT in M2

- No persistence of runs to Postgres (deferred to M3 if needed for leaderboards).
- No voice/text chat (could add text chat in M3; trivial on the same channel).
- No matchmaking / public rooms — codes only.
- No host migration.

## Risks

- Lovable Cloud Realtime is a Postgres channel, not a game server. Snapshot rate stays ≤ 12 Hz to stay within message limits.
- State drift: clients fully overwrite world state from each snapshot (no interpolation in M2). Remote players will look slightly jerky; the local hero stays smooth via client-side prediction.

Approve and I'll enable Cloud, scaffold the lobby + room channel, and wire host/client modes into the existing scene.
