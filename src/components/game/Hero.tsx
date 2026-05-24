import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useGame } from "@/game/store";
import { HERO_SPEED, ISLAND_RADIUS } from "@/game/constants";
import { heroInput } from "@/game/heroInput";
import { touchInput } from "@/game/touchInput";
import { computeLinks } from "@/game/weapons";

/** Read current attack-fx phase, or null when idle. */
function readFx() {
  const fx = useGame.getState().attackFx;
  if (!fx) return null;
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const t = (now - fx.startedAt) / fx.duration;
  if (t >= 1) return null;
  return { ...fx, t };
}

// Per-weapon swing curves.
function swingCurve(weapon: string, step: number, t: number) {
  const wind = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
  const strike = t < 0.25 ? 0 : Math.sin(((t - 0.25) / 0.75) * Math.PI);
  if (weapon === "sword") {
    if (step === 0)
      return { armX: 0.6 * wind - 2.0 * strike, armZ: 0.3 * strike, weaponZ: 0 };
    if (step === 1)
      return { armX: 0.6 * wind - 2.0 * strike, armZ: -0.3 * strike, weaponZ: 0 };
    return { armX: 0.9 * wind - 2.4 * strike, armZ: 0, weaponZ: 0 };
  }
  if (weapon === "hammer") {
    if (step === 0)
      return { armX: 0.7 * wind - 2.2 * strike, armZ: 0.2 * strike, weaponZ: 0 };
    if (step === 1)
      return { armX: 0.7 * wind - 2.2 * strike, armZ: -0.2 * strike, weaponZ: 0 };
    return { armX: 1.1 * wind - 2.6 * strike, armZ: 0, weaponZ: 0 };
  }
  if (weapon === "bow") {
    const draw = Math.min(1, t * 2.5);
    const release = t > 0.55 ? Math.sin(((t - 0.55) / 0.45) * Math.PI) : 0;
    return { armX: 1.0 * draw - 0.6 * release, armZ: 0, weaponZ: 0 };
  }
  if (step === 0) return { armX: 0.3 * wind - 1.8 * strike, armZ: 0, weaponZ: 0 };
  if (step === 1)
    return { armX: 0.3 * wind - 1.8 * strike, armZ: -0.3 * strike, weaponZ: 0 };
  return { armX: 0.5 * wind - 2.2 * strike, armZ: 0.2 * strike, weaponZ: 0 };
}

export function Hero() {
  const rb = useRef<RapierRigidBody>(null);
  const colliderRef = useRef<RapierCollider>(null);
  const visualRef = useRef<Group>(null);
  const rArmRef = useRef<Group>(null);
  const weaponRef = useRef<Group>(null);
  const lLegRef = useRef<Group>(null);
  const rLegRef = useRef<Group>(null);
  const lArmRef = useRef<Group>(null);
  const lastPos = useRef({ x: 0, z: 0 });
  const walkPhase = useRef(0);
  const vy = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctrlRef = useRef<any>(null);

  const { world } = useRapier();

  useEffect(() => {
    if (!world) return;
    const c = world.createCharacterController(0.05);
    c.setApplyImpulsesToDynamicBodies(false);
    c.enableAutostep(0.5, 0.2, true);
    c.enableSnapToGround(0.5);
    c.setMaxSlopeClimbAngle((46 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    c.setSlideEnabled(true);
    ctrlRef.current = c;
    return () => {
      try {
        world.removeCharacterController(c);
      } catch {
        /* world may already be disposed */
      }
      ctrlRef.current = null;
    };
  }, [world]);

  useFrame((_, dt) => {
    const dtc = Math.min(dt, 0.05);
    if (!rb.current || !ctrlRef.current || !colliderRef.current) return;
    const state = useGame.getState();
    const { inventory, status, openVendor } = state;
    const frozen = status !== "playing" || !!openVendor;

    let dx = 0;
    let dz = 0;
    if (!frozen) {
      const k = heroInput.keys;
      if (k.has("w") || k.has("arrowup")) dz -= 1;
      if (k.has("s") || k.has("arrowdown")) dz += 1;
      if (k.has("a") || k.has("arrowleft")) dx -= 1;
      if (k.has("d") || k.has("arrowright")) dx += 1;
      if (touchInput.active) {
        dx += touchInput.dx;
        dz += touchInput.dz;
      }
      const len = Math.hypot(dx, dz);
      if (len > 1) {
        dx /= len;
        dz /= len;
      }
    }

    const links = computeLinks(inventory.weapons);
    const speedBonus =
      state.phase === "night" && links.berserker ? HERO_SPEED * 0.15 : 0;
    const speed = HERO_SPEED + speedBonus;

    vy.current += -22 * dtc;
    if (vy.current < -30) vy.current = -30;

    const move = {
      x: dx * speed * dtc,
      y: vy.current * dtc,
      z: dz * speed * dtc,
    };
    ctrlRef.current.computeColliderMovement(colliderRef.current, move);
    const corr = ctrlRef.current.computedMovement();

    const p = rb.current.translation();
    let nx = p.x + corr.x;
    const ny = p.y + corr.y;
    let nz = p.z + corr.z;

    const r = Math.hypot(nx, nz);
    if (r > ISLAND_RADIUS - 1) {
      const ang = Math.atan2(nz, nx);
      nx = Math.cos(ang) * (ISLAND_RADIUS - 1);
      nz = Math.sin(ang) * (ISLAND_RADIUS - 1);
    }

    rb.current.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    if (ctrlRef.current.computedGrounded()) vy.current = 0;

    let facing = state.heroFacing;
    const inputLen = Math.hypot(dx, dz);
    if (touchInput.active && inputLen > 0.01) {
      facing = Math.atan2(dx, dz);
    } else {
      const fx = heroInput.mouseWorld.x - nx;
      const fz = heroInput.mouseWorld.z - nz;
      if (Math.hypot(fx, fz) > 0.01) facing = Math.atan2(fx, fz);
    }
    state.setHero(nx, nz, facing);
    if (visualRef.current) visualRef.current.rotation.y = facing;

    const ddx = nx - lastPos.current.x;
    const ddz = nz - lastPos.current.z;
    lastPos.current = { x: nx, z: nz };
    const hspeed = Math.hypot(ddx, ddz) / Math.max(dtc, 0.0001);
    const moving = hspeed > 0.3;
    walkPhase.current += dtc * (moving ? 10 : 4);
    const stride = moving ? Math.sin(walkPhase.current) * 0.6 : 0;
    if (lLegRef.current) lLegRef.current.rotation.x = stride;
    if (rLegRef.current) rLegRef.current.rotation.x = -stride;
    if (lArmRef.current) lArmRef.current.rotation.x = -stride * 0.5;

    const fx = readFx();
    let armX = stride * 0.5;
    let armZ = 0;
    let weaponZ = 0;
    if (fx) {
      const c = swingCurve(fx.weapon, fx.step, fx.t);
      armX = c.armX;
      armZ = c.armZ;
      weaponZ = c.weaponZ;
    }
    if (rArmRef.current) {
      rArmRef.current.rotation.x = armX;
      rArmRef.current.rotation.z = armZ;
    }
    if (weaponRef.current) weaponRef.current.rotation.z = weaponZ;

    const w = inventory.weapons;
    const carried =
      w.sword >= w.bow && w.sword >= w.hammer
        ? w.sword > 0
          ? "sword"
          : "fists"
        : w.hammer >= w.bow
          ? w.hammer > 0
            ? "hammer"
            : "fists"
          : w.bow > 0
            ? "bow"
            : "fists";
    if (weaponRef.current) {
      weaponRef.current.children.forEach((c) => {
        c.visible = c.name === carried;
      });
    }
  });

  return (
    <RigidBody
      ref={rb}
      type="kinematicPosition"
      colliders={false}
      position={[0, 1, 4]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider
        ref={colliderRef}
        args={[0.5, 0.35]}
        position={[0, 0.85, 0]}
      />
      <group ref={visualRef}>
        <group ref={lLegRef} position={[-0.13, 0.45, 0]}>
          <mesh castShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.22, 0.5, 0.24]} />
            <meshStandardMaterial color="#4a3526" />
          </mesh>
          <mesh castShadow position={[0, -0.5, 0]}>
            <boxGeometry args={[0.24, 0.12, 0.28]} />
            <meshStandardMaterial color="#2a1d12" />
          </mesh>
        </group>
        <group ref={rLegRef} position={[0.13, 0.45, 0]}>
          <mesh castShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.22, 0.5, 0.24]} />
            <meshStandardMaterial color="#4a3526" />
          </mesh>
          <mesh castShadow position={[0, -0.5, 0]}>
            <boxGeometry args={[0.24, 0.12, 0.28]} />
            <meshStandardMaterial color="#2a1d12" />
          </mesh>
        </group>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.6, 0.55, 0.4]} />
          <meshStandardMaterial color="#3a6ea8" />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.62, 0.1, 0.42]} />
          <meshStandardMaterial color="#3a2a1a" />
        </mesh>
        <mesh position={[0, 0.7, 0.22]}>
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.18, -0.05]} castShadow>
          <boxGeometry args={[0.78, 0.22, 0.35]} />
          <meshStandardMaterial color="#5a4030" />
        </mesh>
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.36]} />
          <meshStandardMaterial color="#e8c69a" />
        </mesh>
        <mesh position={[0, 1.32, 0.12]} castShadow>
          <boxGeometry args={[0.32, 0.22, 0.14]} />
          <meshStandardMaterial color="#b85a2a" />
        </mesh>
        <mesh position={[-0.07, 1.5, 0.19]}>
          <boxGeometry args={[0.05, 0.05, 0.02]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.07, 1.5, 0.19]}>
          <boxGeometry args={[0.05, 0.05, 0.02]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, 1.68, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.2, 12]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[-0.26, 1.78, 0]} rotation={[0, 0, 0.6]} castShadow>
          <coneGeometry args={[0.07, 0.32, 8]} />
          <meshStandardMaterial color="#efe3c0" />
        </mesh>
        <mesh position={[0.26, 1.78, 0]} rotation={[0, 0, -0.6]} castShadow>
          <coneGeometry args={[0.07, 0.32, 8]} />
          <meshStandardMaterial color="#efe3c0" />
        </mesh>
        <group ref={lArmRef} position={[-0.36, 1.15, 0]}>
          <mesh castShadow position={[0, -0.25, 0]}>
            <boxGeometry args={[0.18, 0.5, 0.2]} />
            <meshStandardMaterial color="#e8c69a" />
          </mesh>
          <mesh castShadow position={[-0.12, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.06, 16]} />
            <meshStandardMaterial color="#7a2a2a" />
          </mesh>
          <mesh position={[-0.16, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
        <group ref={rArmRef} position={[0.36, 1.15, 0]}>
          <mesh castShadow position={[0, -0.25, 0]}>
            <boxGeometry args={[0.18, 0.5, 0.2]} />
            <meshStandardMaterial color="#e8c69a" />
          </mesh>
          <group ref={weaponRef} position={[0, -0.5, 0.05]} rotation={[-0.55, 0, 0]}>
            <group name="sword">
              <mesh castShadow position={[0, 0.4, 0]}>
                <boxGeometry args={[0.08, 0.8, 0.04]} />
                <meshStandardMaterial color="#e8e8ee" metalness={0.85} roughness={0.25} />
              </mesh>
              <mesh castShadow position={[0, 0, 0]}>
                <boxGeometry args={[0.22, 0.06, 0.08]} />
                <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh castShadow position={[0, -0.1, 0]}>
                <boxGeometry args={[0.06, 0.16, 0.06]} />
                <meshStandardMaterial color="#3a2418" />
              </mesh>
            </group>
            <group name="hammer">
              <mesh castShadow position={[0, 0.4, 0]}>
                <boxGeometry args={[0.07, 0.75, 0.07]} />
                <meshStandardMaterial color="#3a2418" />
              </mesh>
              <mesh castShadow position={[0, 0.8, 0]}>
                <boxGeometry args={[0.32, 0.22, 0.22]} />
                <meshStandardMaterial color="#6a6a72" metalness={0.6} roughness={0.5} />
              </mesh>
            </group>
            <group name="bow" rotation={[0, 0, 0]}>
              <mesh castShadow position={[0, 0.3, 0]}>
                <torusGeometry args={[0.32, 0.03, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#5a3a1a" />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.01, 0.62, 0.01]} />
                <meshBasicMaterial color="#eee" />
              </mesh>
            </group>
            <group name="fists" />
          </group>
        </group>
      </group>
    </RigidBody>
  );
}