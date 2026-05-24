import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls, useGLTF, Clone } from "@react-three/drei";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Group, Vector3 } from "three";
import { CharacterModel } from "./CharacterModel";
import { fireArrow } from "./Projectiles";
import { mobileAxis, onEdge } from "@/game/inputStore";

export type Controls = "forward" | "back" | "left" | "right" | "jump";

type Props = {
  spawn: [number, number, number];
  /** Camera follow mode. */
  camera: "iso" | "third";
  onRef?: (body: RapierRigidBody | null) => void;
};

const SPEED = 8;
const JUMP_IMPULSE = 12;

export function Player({ spawn, camera, onRef }: Props) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const visualRef = useRef<Group>(null);
  const [, get] = useKeyboardControls<Controls>();
  const { rapier, world } = useRapier();
  const cam = useThree((s) => s.camera);
  const targetCam = useRef(new Vector3());
  const targetLook = useRef(new Vector3());
  const facing = useRef(0);
  const lastShot = useRef(0);
  const bow = useGLTF("/models/items/bow.glb");

  const shoot = () => {
    const now = performance.now();
    if (now - lastShot.current < 350) return;
    lastShot.current = now;
    const b = bodyRef.current;
    if (!b) return;
    const t = b.translation();
    const f = facing.current;
    const dir: [number, number, number] = [Math.sin(f), 0.18, Math.cos(f)];
    const pos: [number, number, number] = [
      t.x + dir[0] * 0.8,
      t.y + 0.4,
      t.z + dir[2] * 0.8,
    ];
    fireArrow({ pos, dir, speed: 22 });
  };

  // Shoot on left mouse button
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Avoid firing when interacting with UI buttons
      if ((e.target as HTMLElement)?.closest("button")) return;
      shoot();
    };
    window.addEventListener("mousedown", onDown);
    const offAttack = onEdge("attack", shoot);
    const offJump = onEdge("jump", () => {
      const b = bodyRef.current;
      if (!b) return;
      b.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
    });
    return () => {
      window.removeEventListener("mousedown", onDown);
      offAttack();
      offJump();
    };
  }, []);

  // Teleport on spawn change
  useEffect(() => {
    const b = bodyRef.current;
    if (!b) return;
    b.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }, [spawn]);

  useEffect(() => {
    onRef?.(bodyRef.current);
    return () => onRef?.(null);
  }, [onRef]);

  useFrame(() => {
    const b = bodyRef.current;
    if (!b) return;
    // Respawn if somehow we fall under the world
    const tt = b.translation();
    if (tt.y < -20) {
      b.setTranslation({ x: spawn[0], y: spawn[1] + 4, z: spawn[2] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    const { forward, back, left, right, jump } = get();
    const vel = b.linvel();

    let dx = 0;
    let dz = 0;
    if (forward) dz -= 1;
    if (back) dz += 1;
    if (left) dx -= 1;
    if (right) dx += 1;
    // Add mobile joystick (y is inverted for "up = forward")
    dx += mobileAxis.x;
    dz += mobileAxis.y;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      const mag = Math.min(1, len);
      dx = (dx / len) * SPEED * mag;
      dz = (dz / len) * SPEED * mag;
    }

    // Grounded check: cast ray downward
    const t = b.translation();
    const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = world.castRay(ray, 1.2, true, undefined, undefined, undefined, b);
    const grounded = hit !== null && hit.timeOfImpact < 1.2;

    b.setLinvel({ x: dx, y: vel.y, z: dz }, true);
    if (jump && grounded) {
      b.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
    }

    // Face movement direction
    if (len > 0 && visualRef.current) {
      const desired = Math.atan2(dx, dz);
      let delta = desired - facing.current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      facing.current += delta * 0.2;
      visualRef.current.rotation.y = facing.current;
    }

    // Camera follow
    if (camera === "iso") {
      targetCam.current.set(t.x + 0, t.y + 30, t.z + 30);
      targetLook.current.set(t.x, t.y, t.z);
    } else {
      targetCam.current.set(t.x + 0, t.y + 5, t.z + 8);
      targetLook.current.set(t.x, t.y + 1, t.z);
    }
    cam.position.lerp(targetCam.current, 0.12);
    cam.lookAt(targetLook.current);
  });

  return (
    <RigidBody
      ref={(b) => {
        bodyRef.current = b;
        onRef?.(b);
      }}
      type="dynamic"
      colliders={false}
      enabledRotations={[false, false, false]}
      position={spawn}
      mass={1}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.5, 0.5]} friction={1.2} restitution={0} />
      <group ref={visualRef} position={[0, -1, 0]}>
        <CharacterModel url="/models/characters/warrior.glb" scale={1} animation="idle" />
        {/* Bow in hand */}
        <group position={[0.45, 1.1, 0.1]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
          <Clone object={bow.scene} scale={0.5} castShadow />
        </group>
      </group>
    </RigidBody>
  );
}

useGLTF.preload("/models/items/bow.glb");