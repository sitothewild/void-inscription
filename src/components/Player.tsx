import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls, useGLTF, Clone } from "@react-three/drei";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Group, Plane, Raycaster, Vector2, Vector3 } from "three";
import { CharacterModel, type CharState } from "./CharacterModel";
import { fireArrow } from "./Projectiles";
import { mobileAxis, onEdge, playerPos, playerState, runState } from "@/game/inputStore";
import { setPlayerChunkPosition } from "@/game/chunkManager";

export type Controls = "forward" | "back" | "left" | "right" | "jump" | "sprint";

type Props = {
  spawn: [number, number, number];
  /** Camera follow mode. */
  camera: "iso" | "third";
  onRef?: (body: RapierRigidBody | null) => void;
};

const WALK_SPEED = 4.5;
const RUN_SPEED = 9;
const JUMP_IMPULSE = 12;

export function Player({ spawn, camera, onRef }: Props) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const colliderRef = useRef<RapierCollider | null>(null);
  const visualRef = useRef<Group>(null);
  const [, get] = useKeyboardControls<Controls>();
  const { rapier, world } = useRapier();
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const cam = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const gl = useThree((s) => s.gl);
  const aimRaycaster = useRef(new Raycaster());
  const aimPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const aimPoint = useRef(new Vector3());
  const pointerInside = useRef(false);
  const targetCam = useRef(new Vector3());
  const targetLook = useRef(new Vector3());
  const facing = useRef(0);
  const lastShot = useRef(0);
  const verticalVelocity = useRef(0);
  const bow = useGLTF("/models/items/bow.glb");
  const movingRef = useRef(false);
  const speedRef = useRef(0);
  const stateRef = useRef<CharState>("idle");

  useEffect(() => {
    const controller = world.createCharacterController(0.05);
    controller.setSlideEnabled(true);
    controller.enableAutostep(0.45, 0.25, false);
    controller.enableSnapToGround(0.6);
    controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((58 * Math.PI) / 180);
    controllerRef.current = controller;
    return () => {
      controller.free();
      controllerRef.current = null;
    };
  }, [world]);

  // Track whether the mouse is over the canvas so we only override facing
  // with mouse aim when the player is actually pointing at the game.
  useEffect(() => {
    const el = gl.domElement;
    const onEnter = () => (pointerInside.current = true);
    const onLeave = () => (pointerInside.current = false);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointermove", onEnter);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointermove", onEnter);
    };
  }, [gl]);

  const shoot = () => {
    const now = performance.now();
    if (now - lastShot.current < 350) return;
    lastShot.current = now;
    const b = bodyRef.current;
    if (!b) return;
    const t = b.translation();
    const f = facing.current;
    const dir: [number, number, number] = [Math.sin(f), 0.18, Math.cos(f)];
    const pos: [number, number, number] = [t.x + dir[0] * 0.8, t.y + 0.4, t.z + dir[2] * 0.8];
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
      verticalVelocity.current = JUMP_IMPULSE;
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
    verticalVelocity.current = 0;
  }, [spawn]);

  useEffect(() => {
    onRef?.(bodyRef.current);
    return () => onRef?.(null);
  }, [onRef]);

  useFrame((_, delta) => {
    const b = bodyRef.current;
    if (!b) return;
    // Respawn if somehow we fall under the world
    const tt = b.translation();
    setPlayerChunkPosition(tt.x, tt.z);
    playerPos.x = tt.x;
    playerPos.y = tt.y;
    playerPos.z = tt.z;
    if (tt.y < -20) {
      b.setTranslation({ x: spawn[0], y: spawn[1] + 4, z: spawn[2] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      verticalVelocity.current = 0;
    }
    const { forward, back, left, right, jump, sprint } = get();
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
    const sprinting = sprint || runState.toggled;
    const moveSpeed = sprinting ? RUN_SPEED : WALK_SPEED;
    movingRef.current = len > 0;
    playerState.moving = len > 0;
    if (len > 0) {
      const mag = Math.min(1, len);
      dx = (dx / len) * moveSpeed * mag;
      dz = (dz / len) * moveSpeed * mag;
      speedRef.current = Math.hypot(dx, dz);
    } else {
      speedRef.current = 0;
    }
    stateRef.current =
      speedRef.current < 0.1 ? "idle" : sprinting ? "run" : "walk";

    // Grounded check: cast ray downward
    const t = b.translation();
    const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = world.castRay(ray, 1.2, true, undefined, undefined, undefined, b);
    const grounded = hit !== null && hit.timeOfImpact < 1.2;

    const collider = colliderRef.current;
    const controller = controllerRef.current;
    const dt = Math.min(1 / 30, delta);
    if (collider && controller) {
      verticalVelocity.current += -20 * dt;
      const desiredY = verticalVelocity.current * dt;
      controller.computeColliderMovement(collider, { x: dx * dt, y: desiredY, z: dz * dt });
      const corrected = controller.computedMovement();
      const groundedNow = controller.computedGrounded() || grounded;
      const next = b.translation();
      b.setNextKinematicTranslation({
        x: next.x + corrected.x,
        y: next.y + corrected.y,
        z: next.z + corrected.z,
      });
      if (groundedNow && verticalVelocity.current < 0) verticalVelocity.current = 0;
    } else {
      b.setLinvel({ x: dx, y: vel.y, z: dz }, true);
    }
    if (jump && grounded) {
      verticalVelocity.current = JUMP_IMPULSE;
    }

    // Face mouse cursor when aiming (bow is always equipped). Falls back to
    // movement direction on mobile / when the pointer is off the canvas.
    let desired: number | null = null;
    const hasMouse = matchMedia("(pointer: fine)").matches;
    if (hasMouse && pointerInside.current) {
      aimPlane.current.constant = -t.y;
      aimRaycaster.current.setFromCamera(pointer as Vector2, cam);
      const hit = aimRaycaster.current.ray.intersectPlane(aimPlane.current, aimPoint.current);
      if (hit) {
        const ax = aimPoint.current.x - t.x;
        const az = aimPoint.current.z - t.z;
        if (ax * ax + az * az > 0.01) desired = Math.atan2(ax, az);
      }
    }
    if (desired === null && len > 0) {
      desired = Math.atan2(dx, dz);
    }
    if (desired !== null && visualRef.current) {
      let delta = desired - facing.current;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      facing.current += delta * 0.25;
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
      type="kinematicPosition"
      colliders={false}
      enabledRotations={[false, false, false]}
      position={spawn}
      mass={1}
      linearDamping={0.5}
    >
      <CapsuleCollider ref={colliderRef} args={[0.55, 0.42]} friction={1.4} restitution={0} />
      <group ref={visualRef} position={[0, -1, 0]}>
        <CharacterModel
          url="/models/characters/men/Adventurer.glb"
          scale={1}
          getState={() => stateRef.current}
        />
        {/* Bow in hand */}
        <group position={[0.45, 1.1, 0.1]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
          <Clone object={bow.scene} scale={0.5} castShadow />
        </group>
      </group>
    </RigidBody>
  );
}

useGLTF.preload("/models/items/bow.glb");
