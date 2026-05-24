import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useGame } from "@/game/store";

/**
 * Compute a 0..1 phase for the current attack animation, plus
 * the active weapon + combo step. Returns null when idle.
 */
function readFx() {
  const fx = useGame.getState().attackFx;
  if (!fx) return null;
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const t = (now - fx.startedAt) / fx.duration;
  if (t >= 1) return null;
  return { ...fx, t };
}

// Animation curves per weapon + combo step. Each returns local rotations
// for the right arm + the weapon mesh. Step 0/1/2 are the three combos.
function swingCurve(weapon: string, step: number, t: number) {
  // ease in then out
  const e = Math.sin(Math.min(1, t) * Math.PI); // 0 → 1 → 0
  const swing = e;
  if (weapon === "sword") {
    if (step === 0) return { armX: -1.2 * swing, armZ: -0.6 * swing, weaponZ: -1.4 * swing }; // right-to-left slash
    if (step === 1) return { armX: -1.0 * swing, armZ: 0.7 * swing, weaponZ: 1.3 * swing }; // left-to-right slash
    return { armX: -2.0 * swing, armZ: 0, weaponZ: 0 }; // overhead
  }
  if (weapon === "hammer") {
    if (step === 0) return { armX: -0.9 * swing, armZ: -0.8 * swing, weaponZ: -1.5 * swing }; // side swing
    if (step === 1) return { armX: -2.2 * swing, armZ: 0, weaponZ: 0 }; // overhead
    return { armX: -2.6 * swing, armZ: 0, weaponZ: 0 }; // ground slam
  }
  if (weapon === "bow") {
    // draw → release pulse
    const draw = Math.min(1, t * 2);
    const release = t > 0.5 ? 1 - (t - 0.5) * 2 : 0;
    return { armX: -1.2 * draw + 0.4 * release, armZ: 0, weaponZ: 0 };
  }
  // fists — quick jabs
  if (step === 0) return { armX: -1.4 * swing, armZ: 0, weaponZ: 0 };
  if (step === 1) return { armX: 0, armZ: -1.0 * swing, weaponZ: 0 };
  return { armX: -1.8 * swing, armZ: 0.4 * swing, weaponZ: 0 };
}

export function Hero() {
  const ref = useRef<Group>(null);
  const rArmRef = useRef<Group>(null);
  const weaponRef = useRef<Group>(null);
  const lLegRef = useRef<Group>(null);
  const rLegRef = useRef<Group>(null);
  const lArmRef = useRef<Group>(null);
  const lastPos = useRef({ x: 0, z: 0 });
  const walkPhase = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const { heroX, heroZ, heroFacing, inventory } = useGame.getState();
    ref.current.position.set(heroX, 0, heroZ);
    ref.current.rotation.y = heroFacing;

    // Walk cycle based on velocity
    const dx = heroX - lastPos.current.x;
    const dz = heroZ - lastPos.current.z;
    lastPos.current = { x: heroX, z: heroZ };
    const speed = Math.hypot(dx, dz) / Math.max(dt, 0.0001);
    const moving = speed > 0.3;
    walkPhase.current += dt * (moving ? 10 : 4);
    const stride = moving ? Math.sin(walkPhase.current) * 0.6 : 0;
    if (lLegRef.current) lLegRef.current.rotation.x = stride;
    if (rLegRef.current) rLegRef.current.rotation.x = -stride;
    if (lArmRef.current) lArmRef.current.rotation.x = -stride * 0.5;

    // Attack animation overrides right arm
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
    if (weaponRef.current) {
      weaponRef.current.rotation.z = weaponZ;
    }

    // Hide weapon meshes the viking isn't holding
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
    <group ref={ref}>
      {/* Legs */}
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

      {/* Torso w/ tunic + belt */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.6, 0.55, 0.4]} />
        <meshStandardMaterial color="#3a6ea8" />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.62, 0.1, 0.42]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* Belt buckle */}
      <mesh position={[0, 0.7, 0.22]}>
        <boxGeometry args={[0.12, 0.08, 0.02]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Shoulders / fur cloak */}
      <mesh position={[0, 1.18, -0.05]} castShadow>
        <boxGeometry args={[0.78, 0.22, 0.35]} />
        <meshStandardMaterial color="#5a4030" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color="#e8c69a" />
      </mesh>
      {/* Beard */}
      <mesh position={[0, 1.32, 0.12]} castShadow>
        <boxGeometry args={[0.32, 0.22, 0.14]} />
        <meshStandardMaterial color="#b85a2a" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.07, 1.5, 0.19]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.07, 1.5, 0.19]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* Horned helmet */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.2, 12]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Horns */}
      <mesh position={[-0.26, 1.78, 0]} rotation={[0, 0, 0.6]} castShadow>
        <coneGeometry args={[0.07, 0.32, 8]} />
        <meshStandardMaterial color="#efe3c0" />
      </mesh>
      <mesh position={[0.26, 1.78, 0]} rotation={[0, 0, -0.6]} castShadow>
        <coneGeometry args={[0.07, 0.32, 8]} />
        <meshStandardMaterial color="#efe3c0" />
      </mesh>

      {/* Left arm (passive) */}
      <group ref={lArmRef} position={[-0.36, 1.15, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[0.18, 0.5, 0.2]} />
          <meshStandardMaterial color="#e8c69a" />
        </mesh>
        {/* Round shield held in left hand */}
        <mesh castShadow position={[-0.12, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.06, 16]} />
          <meshStandardMaterial color="#7a2a2a" />
        </mesh>
        <mesh position={[-0.16, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Right arm — swings during attacks */}
      <group ref={rArmRef} position={[0.36, 1.15, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[0.18, 0.5, 0.2]} />
          <meshStandardMaterial color="#e8c69a" />
        </mesh>
        {/* Hand-held weapon, pivots from grip */}
        <group ref={weaponRef} position={[0, -0.5, 0]}>
          {/* SWORD */}
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
          {/* HAMMER */}
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
          {/* BOW */}
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
          {/* FISTS — nothing visible */}
          <group name="fists" />
        </group>
      </group>
    </group>
  );
}