import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3, Plane, Raycaster, Vector2 } from "three";
import { useGame } from "@/game/store";
import {
  BOSS_DAMAGE,
  BOSS_HP,
  BOSS_SPAWN_NIGHT,
  BOSS_SPEED,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_DAMAGE,
  ENEMY_MAX_HP,
  ENEMY_SIGHT,
  ENEMY_SPEED,
  GATE_CLOSE_WARNING,
  GATE_DAMAGE,
  HERO_ATTACK_COOLDOWN,
  HERO_ATTACK_RANGE,
  HERO_SPEED,
  ISLAND_RADIUS,
  NIGHT_DURATION,
  VENDOR_INTERACT_RANGE,
  VILLAGE_RADIUS,
} from "@/game/constants";
import { mulberry32 } from "@/game/rng";
import { applyAction, dispatchAction, hostActionQueue } from "@/game/multiplayer";
import { touchInput } from "@/game/touchInput";
import {
  computeLinks,
  damageMultiplier,
  rangeMultiplier,
} from "@/game/weapons";
import { SHAMAN_POS, SMITH_POS } from "@/game/constants";

function equippedWeapon(w: { sword: number; bow: number; hammer: number }): "sword" | "bow" | "hammer" | "fists" {
  const max = Math.max(w.sword, w.bow, w.hammer);
  if (max === 0) return "fists";
  if (w.sword >= w.bow && w.sword >= w.hammer) return "sword";
  if (w.hammer >= w.bow) return "hammer";
  return "bow";
}

const keys = new Set<string>();

function gatePos(angle: number) {
  return { x: Math.cos(angle) * VILLAGE_RADIUS, z: Math.sin(angle) * VILLAGE_RADIUS };
}

export function GameLoop() {
  const { camera, gl } = useThree();
  const mouseWorld = useRef(new Vector3());
  const attackRequested = useRef(false);
  const interactRequested = useRef(false);
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const raycaster = useRef(new Raycaster());
  const ndc = useRef(new Vector2());
  const rngRef = useRef(mulberry32(Date.now() & 0xffffffff));
  const wardenAccum = useRef(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === "e") interactRequested.current = true;
    };
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
    if (s.openVendor) return; // pause input while shop open

    const isMultiplayer = !!s.roomCode;
    const isAuthoritative = !isMultiplayer || s.isHost;

    if (isAuthoritative) s.tickPhase(dt);

    const links = computeLinks(s.inventory.weapons);

    // Movement
    let dx = 0;
    let dz = 0;
    if (keys.has("w") || keys.has("arrowup")) dz -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dz += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;
    if (touchInput.active) {
      dx += touchInput.dx;
      dz += touchInput.dz;
    }
    const len = Math.hypot(dx, dz);
    const speedBonus =
      s.phase === "night" && links.berserker ? HERO_SPEED * 0.15 : 0;
    const speed = HERO_SPEED + speedBonus;
    let nx = s.heroX;
    let nz = s.heroZ;
    if (len > 0) {
      dx /= len;
      dz /= len;
      nx = s.heroX + dx * speed * dt;
      nz = s.heroZ + dz * speed * dt;
      if (Math.hypot(nx, nz) > ISLAND_RADIUS - 1) {
        const ang = Math.atan2(nz, nx);
        nx = Math.cos(ang) * (ISLAND_RADIUS - 1);
        nz = Math.sin(ang) * (ISLAND_RADIUS - 1);
      }
    }

    // Facing
    let facing = s.heroFacing;
    if (touchInput.active && len > 0) {
      facing = Math.atan2(dx, dz);
    } else {
      const fx = mouseWorld.current.x - nx;
      const fz = mouseWorld.current.z - nz;
      if (Math.hypot(fx, fz) > 0.01) facing = Math.atan2(fx, fz);
    }
    s.setHero(nx, nz, facing);

    // Attack cooldown
    const cd = Math.max(0, s.heroAttackCd - dt);
    s.setHeroAttackCd(cd);

    // Interact (E or touch)
    if (touchInput.interact) {
      touchInput.interact = false;
      interactRequested.current = true;
    }
    if (interactRequested.current) {
      interactRequested.current = false;
      const dSmith = Math.hypot(nx - SMITH_POS.x, nz - SMITH_POS.z);
      const dShaman = Math.hypot(nx - SHAMAN_POS.x, nz - SHAMAN_POS.z);
      if (dSmith < VENDOR_INTERACT_RANGE) {
        s.setOpenVendor("smith");
      } else if (dShaman < VENDOR_INTERACT_RANGE) {
        s.setOpenVendor("shaman");
      } else {
        // Try to chop/mine the nearest resource within attack range
        const range = HERO_ATTACK_RANGE * rangeMultiplier(s.inventory.weapons);
        let bestId: string | null = null;
        let bestD = range;
        for (const r of s.resources) {
          const d = Math.hypot(r.x - nx, r.z - nz);
          if (d < bestD) {
            bestD = d;
            bestId = r.id;
          }
        }
        if (bestId && cd <= 0) {
          dispatchAction({
            type: "attack",
            x: nx,
            z: nz,
            facing,
            damageMul: damageMultiplier(s.inventory.weapons),
            range,
          });
          s.triggerAttackFx(equippedWeapon(s.inventory.weapons));
          s.setHeroAttackCd(HERO_ATTACK_COOLDOWN);
        }
      }
    }

    // Attack input
    if (touchInput.attack) {
      touchInput.attack = false;
      attackRequested.current = true;
    }
    if (attackRequested.current) {
      attackRequested.current = false;
      if (cd <= 0) {
        dispatchAction({
          type: "attack",
          x: nx,
          z: nz,
          facing,
          damageMul: damageMultiplier(s.inventory.weapons),
          range: HERO_ATTACK_RANGE * rangeMultiplier(s.inventory.weapons),
        });
        s.triggerAttackFx(equippedWeapon(s.inventory.weapons));
        s.setHeroAttackCd(HERO_ATTACK_COOLDOWN);
      }
    }

    if (!isAuthoritative) return;

    // ---- Drain actions
    while (hostActionQueue.length > 0) {
      const { from, action } = hostActionQueue.shift()!;
      applyAction(from, action);
    }

    // ---- Gates: open/close timing
    const after0 = useGame.getState();
    if (after0.phase === "day") {
      const shouldClose = after0.phaseTime <= GATE_CLOSE_WARNING;
      for (const g of after0.gates) {
        if (g.broken) continue;
        if (shouldClose && g.open) after0.setGate(g.id, { open: false });
        if (!shouldClose && !g.open) after0.setGate(g.id, { open: true });
      }
    } else {
      // Night: keep gates closed unless broken
      for (const g of after0.gates) {
        if (!g.broken && g.open) after0.setGate(g.id, { open: false });
      }
    }

    // Warden link: walls/gates self-heal during day
    if (links.warden && after0.phase === "day") {
      wardenAccum.current += dt;
      if (wardenAccum.current >= 1) {
        wardenAccum.current = 0;
        for (const g of after0.gates) {
          if (!g.broken && g.hp < 200) {
            after0.setGate(g.id, { hp: Math.min(200, g.hp + 1) });
          }
        }
      }
    }

    // ---- Mini-boss spawn on night 3
    if (
      after0.phase === "night" &&
      after0.day === BOSS_SPAWN_NIGHT &&
      !after0.bossSpawned &&
      after0.phaseTime <= NIGHT_DURATION - 5
    ) {
      const r = rngRef.current;
      const ang = r() * Math.PI * 2;
      after0.addEnemy({
        id: `boss-${Date.now()}`,
        x: Math.cos(ang) * (ISLAND_RADIUS - 1),
        z: Math.sin(ang) * (ISLAND_RADIUS - 1),
        hp: BOSS_HP,
        maxHp: BOSS_HP,
        target: "seed",
        attackCd: 0,
        kind: "boss",
      });
      useGame.setState({ bossSpawned: true });
    }

    // ---- Night grunt spawn
    if (
      after0.phase === "night" &&
      after0.spawnedThisNight < after0.toSpawnThisNight &&
      after0.enemies.length < 25
    ) {
      const totalToSpawn = after0.toSpawnThisNight;
      const elapsed = NIGHT_DURATION - after0.phaseTime;
      const shouldHaveSpawned = Math.min(
        totalToSpawn,
        Math.floor((elapsed / 60) * totalToSpawn),
      );
      if (after0.spawnedThisNight < shouldHaveSpawned) {
        const r = rngRef.current;
        const ang = r() * Math.PI * 2;
        const x = Math.cos(ang) * (ISLAND_RADIUS - 1);
        const z = Math.sin(ang) * (ISLAND_RADIUS - 1);
        after0.addEnemy({
          id: `e${Date.now()}-${Math.floor(r() * 1e6)}`,
          x,
          z,
          hp: ENEMY_MAX_HP,
          maxHp: ENEMY_MAX_HP,
          target: "seed",
          attackCd: 0,
          kind: "grunt",
        });
        useGame.setState({ spawnedThisNight: after0.spawnedThisNight + 1 });
      }
    }

    // ---- Enemy AI ----
    const after = useGame.getState();
    const playerPositions: { id: string; x: number; z: number; isSelf: boolean }[] = [
      { id: after.selfId ?? "self", x: nx, z: nz, isSelf: true },
    ];
    for (const [id, p] of Object.entries(after.players)) {
      playerPositions.push({ id, x: p.x, z: p.z, isSelf: false });
    }

    const closedGates = after.gates.filter((g) => !g.open && !g.broken);
    const anyGateClosed = closedGates.length > 0;

    for (const e of after.enemies) {
      // Pick target: nearest player if visible, else seed (or gate if blocked)
      let nearestPlayer: { x: number; z: number; isSelf: boolean } | null = null;
      let nd = ENEMY_SIGHT;
      if (after.phase === "night") {
        for (const p of playerPositions) {
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d < nd) {
            nd = d;
            nearestPlayer = p;
          }
        }
      }

      const enemyInside = Math.hypot(e.x, e.z) < VILLAGE_RADIUS;
      let targetKind: "hero" | "seed" | "gate" = nearestPlayer ? "hero" : "seed";
      let targetX = nearestPlayer ? nearestPlayer.x : 0;
      let targetZ = nearestPlayer ? nearestPlayer.z : 0;
      let targetGateId: string | null = null;

      // If targeting something inside village and gate is closed and we're outside, head to nearest gate
      const targetInside = Math.hypot(targetX, targetZ) < VILLAGE_RADIUS;
      if (anyGateClosed && targetInside && !enemyInside) {
        let bestGate = closedGates[0];
        let bestD = Infinity;
        for (const g of closedGates) {
          const gp = gatePos(g.angle);
          const d = Math.hypot(e.x - gp.x, e.z - gp.z);
          if (d < bestD) {
            bestD = d;
            bestGate = g;
          }
        }
        const gp = gatePos(bestGate.angle);
        targetKind = "gate";
        targetX = gp.x;
        targetZ = gp.z;
        targetGateId = bestGate.id;
      }

      const dxE = targetX - e.x;
      const dzE = targetZ - e.z;
      const dE = Math.hypot(dxE, dzE);
      const attackRange =
        targetKind === "seed" ? 2.2 : targetKind === "gate" ? 1.6 : 1.4;
      const speed = e.kind === "boss" ? BOSS_SPEED : ENEMY_SPEED;
      const damage = e.kind === "boss" ? BOSS_DAMAGE : ENEMY_DAMAGE;
      let newCd = Math.max(0, e.attackCd - dt);
      let ex = e.x;
      let ez = e.z;
      if (dE > attackRange) {
        ex += (dxE / dE) * speed * dt;
        ez += (dzE / dE) * speed * dt;
      } else if (newCd <= 0) {
        if (targetKind === "hero" && nearestPlayer) {
          if (nearestPlayer.isSelf) {
            after.damageHero(damage);
          } else {
            const hitId = Object.entries(after.players).find(
              ([, pp]) => pp.x === nearestPlayer!.x && pp.z === nearestPlayer!.z,
            )?.[0];
            if (hitId) {
              const cp = after.players[hitId];
              after.setPlayer(hitId, { ...cp, hp: Math.max(0, cp.hp - damage) });
            }
          }
        } else if (targetKind === "gate" && targetGateId) {
          const gateDmg = links.foundation ? GATE_DAMAGE * 0.5 : GATE_DAMAGE;
          after.damageGate(targetGateId, gateDmg);
        } else {
          after.damageSeed(damage);
        }
        newCd = ENEMY_ATTACK_COOLDOWN;
      }
      after.updateEnemy(e.id, { x: ex, z: ez, attackCd: newCd });
    }
  });

  return null;
}
