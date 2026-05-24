import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Vector3 } from "three";

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
  const [, get] = useKeyboardControls<Controls>();
  const { rapier, world } = useRapier();
  const cam = useThree((s) => s.camera);
  const targetCam = useRef(new Vector3());
  const targetLook = useRef(new Vector3());

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
    const { forward, back, left, right, jump } = get();
    const vel = b.linvel();

    let dx = 0;
    let dz = 0;
    if (forward) dz -= 1;
    if (back) dz += 1;
    if (left) dx -= 1;
    if (right) dx += 1;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx = (dx / len) * SPEED;
      dz = (dz / len) * SPEED;
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
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.5, 1.0, 8, 16]} />
        <meshStandardMaterial color={"#e6b35a"} emissive={"#3a2410"} emissiveIntensity={0.3} />
      </mesh>
    </RigidBody>
  );
}