import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3, Plane, Raycaster, Vector2 } from "three";
import { useGame } from "@/game/store";
import {
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_DAMAGE,
  ENEMY_MAX_HP,
  ENEMY_SIGHT,
  ENEMY_SPEED,
  HERO_ATTACK_COOLDOWN,
  HERO_SPEED,
  ISLAND_RADIUS,
} from "@/game/constants";
import { mulberry32 } from "@/game/rng";
import { applyAction, dispatchAction, hostActionQueue } from "@/game/multiplayer";

// Keyboard state (module-level so handlers + frame share)
const keys = new Set<string>();

export function GameLoop() {
  const { camera, gl } = useThree();
  const mouseWorld = useRef(new Vector3());
  const attackRequested = useRef(false);
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const raycaster = useRef(new Raycaster());
  const ndc = useRef(new Vector2());
  const rngRef = useRef(mulberry32(Date.now() & 0xffffffff));

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Mouse → world position on y=0 plane
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(ndc.current, camera);
      const hit = new Vector3();
      raycaster.current.ray.intersectPlane(plane.current, hit);
      mouseWorld.current.copy(hit);
    };
    const click = () => {
      attackRequested.current = true;
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mousedown", click);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mousedown", click);
    };
  }, [camera, gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useGame.getState();
    if (s.status !== "playing") return;

    const isMultiplayer = !!s.roomCode;
    const isAuthoritative = !isMultiplayer || s.isHost;

    // ---- Phase timer (host or single-player)
    if (isAuthoritative) s.tickPhase(dt);

    // ---- Hero movement
    let dx = 0;
    let dz = 0;
    if (keys.has("w") || keys.has("arrowup")) dz -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dz += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;
    const len = Math.hypot(dx, dz);
    let nx = s.heroX;
    let nz = s.heroZ;
    if (len > 0) {
      dx /= len;
      dz /= len;
      nx = s.heroX + dx * HERO_SPEED * dt;
      nz = s.heroZ + dz * HERO_SPEED * dt;
      if (Math.hypot(nx, nz) > ISLAND_RADIUS - 1) {
        // clamp to island edge
        const ang = Math.atan2(nz, nx);
        nx = Math.cos(ang) * (ISLAND_RADIUS - 1);
        nz = Math.sin(ang) * (ISLAND_RADIUS - 1);
      }
    }
    // Facing toward mouse
    const fx = mouseWorld.current.x - nx;
    const fz = mouseWorld.current.z - nz;
    const facing =
      Math.hypot(fx, fz) > 0.01 ? Math.atan2(fx, fz) : s.heroFacing;
    s.setHero(nx, nz, facing);

    // ---- Hero attack cooldown is always local for responsive UX
    const cd = Math.max(0, s.heroAttackCd - dt);
    s.setHeroAttackCd(cd);
    if (attackRequested.current) {
      attackRequested.current = false;
      if (cd <= 0) {
        dispatchAction({
          type: "attack",
          x: nx,
          z: nz,
          facing,
          sword: s.inventory.sword,
        });
        s.setHeroAttackCd(HERO_ATTACK_COOLDOWN);
      }
    }

    // ---- Host-only: world simulation ----
    if (!isAuthoritative) return;

    // Drain queued actions (from self in single-player, or from clients via network)
    while (hostActionQueue.length > 0) {
      const { from, action } = hostActionQueue.shift()!;
      applyAction(from, action);
    }

    // ---- Night spawn
    if (
      s.phase === "night" &&
      s.spawnedThisNight < s.toSpawnThisNight &&
      s.enemies.length < 25
    ) {
      // spawn rate: spread across first half of night
      const totalToSpawn = s.toSpawnThisNight;
      const elapsed = 120 - s.phaseTime;
      const shouldHaveSpawned = Math.min(
        totalToSpawn,
        Math.floor((elapsed / 60) * totalToSpawn),
      );
      if (s.spawnedThisNight < shouldHaveSpawned) {
        const r = rngRef.current;
        const ang = r() * Math.PI * 2;
        const x = Math.cos(ang) * (ISLAND_RADIUS - 1);
        const z = Math.sin(ang) * (ISLAND_RADIUS - 1);
        s.addEnemy({
          id: `e${Date.now()}-${Math.floor(r() * 1e6)}`,
          x,
          z,
          hp: ENEMY_MAX_HP,
          target: "seed",
          attackCd: 0,
        });
        useGame.setState({ spawnedThisNight: s.spawnedThisNight + 1 });
      }
    }

    // ---- Enemy AI (targets nearest player including remote)
    const after = useGame.getState();
    const playerPositions: { id: string; x: number; z: number; isSelf: boolean }[] = [
      { id: after.selfId ?? "self", x: nx, z: nz, isSelf: true },
    ];
    for (const [id, p] of Object.entries(after.players)) {
      playerPositions.push({ id, x: p.x, z: p.z, isSelf: false });
    }
    for (const e of after.enemies) {
      // Aggro nearest player if in sight (night only), else target seed
      let nearest: { x: number; z: number; isSelf: boolean } | null = null;
      let nd = ENEMY_SIGHT;
      if (after.phase === "night") {
        for (const p of playerPositions) {
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d < nd) {
            nd = d;
            nearest = p;
          }
        }
      }
      const target = nearest
        ? { x: nearest.x, z: nearest.z, kind: "hero" as const, isSelf: nearest.isSelf }
        : { x: 0, z: 0, kind: "seed" as const, isSelf: false };
      const dxE = target.x - e.x;
      const dzE = target.z - e.z;
      const dE = Math.hypot(dxE, dzE);
      const attackRange = target.kind === "seed" ? 2.2 : 1.4;
      let newCd = Math.max(0, e.attackCd - dt);
      let ex = e.x;
      let ez = e.z;
      if (dE > attackRange) {
        ex += (dxE / dE) * ENEMY_SPEED * dt;
        ez += (dzE / dE) * ENEMY_SPEED * dt;
      } else if (newCd <= 0) {
        if (target.kind === "hero") {
          if (target.isSelf) {
            after.damageHero(ENEMY_DAMAGE);
          } else if (nearest) {
            // damage remote player in store; snapshot will propagate hp
            const cur = after.players[nearest && (playerPositions.find(p => p === nearest)?.id ?? "")];
            // Simpler: find their id again
            const hitId = Object.entries(after.players).find(
              ([, pp]) => pp.x === nearest!.x && pp.z === nearest!.z,
            )?.[0];
            if (hitId) {
              const cp = after.players[hitId];
              after.setPlayer(hitId, { ...cp, hp: Math.max(0, cp.hp - ENEMY_DAMAGE) });
            }
            void cur;
          }
        } else after.damageSeed(ENEMY_DAMAGE);
        newCd = ENEMY_ATTACK_COOLDOWN;
      }
      after.updateEnemy(e.id, { x: ex, z: ez, attackCd: newCd });
    }
  });

  return null;
}