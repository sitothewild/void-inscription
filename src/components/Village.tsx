import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { onEdge, playerPos } from "@/game/inputStore";
import { computeHutSlots, VILLAGE_GATE_ANGLES } from "@/game/villageLayout";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

function Hut({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Single tight collider matching the wall box — keeps players from
          bumping the invisible roof overhang or door plane. */}
      <CuboidCollider args={[1.2, 0.9, 1.0]} position={[0, 0.9, 0]} friction={1.2} />
      {/* Base log walls */}
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[2.4, 1.8, 2.0]} />
        <meshStandardMaterial color={"#6b4a2b"} roughness={0.9} />
      </mesh>
      {/* Thatched roof */}
      <mesh castShadow position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.9, 1.4, 4]} />
        <meshStandardMaterial color={"#8a5a2a"} roughness={1} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.6, 1.01]}>
        <planeGeometry args={[0.7, 1.2]} />
        <meshStandardMaterial color={"#2a1a0e"} />
      </mesh>
    </RigidBody>
  );
}

/** Shared gate dimensions so fence stitching and door geometry agree. */
const GATE = {
  postX: 4.0,
  /** Half-width of each door — two doors cover [-2*half, +2*half] when closed. */
  doorHalf: 2.0,
};

function FencePost({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh castShadow position={[0, (scale - 1) * 0.55, 0]}>
        <boxGeometry args={[0.2, 1.1 * scale, 0.2]} />
        <meshStandardMaterial color={"#5a3a20"} roughness={1} />
      </mesh>
    </RigidBody>
  );
}

function FenceRail({
  position,
  rotation,
  length,
  y,
}: {
  position: [number, number, number];
  rotation: number;
  length: number;
  y: number;
}) {
  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      position={[position[0], y, position[2]]}
      rotation={[0, rotation, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, 0.16, 0.16]} />
        <meshStandardMaterial color={"#6f4726"} roughness={1} />
      </mesh>
    </RigidBody>
  );
}

function Gate({
  data,
  radius,
  angle,
}: {
  data: TerrainData;
  radius: number;
  angle: number;
}) {
  // Gate center on the fence circle.
  const cx = Math.cos(angle) * radius;
  const cz = Math.sin(angle) * radius;
  // Tangent direction along the fence (used as the gate's local +X axis).
  const tx = -Math.sin(angle);
  const tz = Math.cos(angle);
  // Y rotation so the gate's local +X aligns with (tx, 0, tz).
  const baseRot = Math.atan2(-tz, tx);
  const y = data.sampleWorldY(cx, cz);
  // Gate clearance: 8m wide opening, two 4m doors that fully close.
  const POST_X = GATE.postX;
  const DOOR_HALF = GATE.doorHalf;
  const lpx = cx + tx * POST_X;
  const lpz = cz + tz * POST_X;
  const rpx = cx - tx * POST_X;
  const rpz = cz - tz * POST_X;
  const posts: Array<[number, number, number]> = [
    [lpx, data.sampleWorldY(lpx, lpz) + 0.9, lpz],
    [rpx, data.sampleWorldY(rpx, rpz) + 0.9, rpz],
  ];
  const [open, setOpen] = useState(false);
  const leftRef = useRef<RapierRigidBody>(null);
  const rightRef = useRef<RapierRigidBody>(null);
  const ringRef = useRef<Mesh>(null);
  const promptRef = useRef<Group>(null);
  const openProgress = useRef(0);
  const INTERACT_R = 5;

  useEffect(() => {
    return onEdge("action", () => {
      const dx = playerPos.x - cx;
      const dz = playerPos.z - cz;
      if (dx * dx + dz * dz < INTERACT_R * INTERACT_R) {
        setOpen((o) => !o);
      }
    });
  }, [cx, cz]);

  useFrame((state, dt) => {
    const target = open ? 1 : 0;
    openProgress.current += (target - openProgress.current) * Math.min(1, dt * 4);
    const swing = openProgress.current * (Math.PI / 2);
    // Compose base rotation with door swing about Y.
    const lY = baseRot - swing;
    const rY = baseRot + swing;
    leftRef.current?.setNextKinematicRotation({
      x: 0,
      y: Math.sin(lY / 2),
      z: 0,
      w: Math.cos(lY / 2),
    });
    rightRef.current?.setNextKinematicRotation({
      x: 0,
      y: Math.sin(rY / 2),
      z: 0,
      w: Math.cos(rY / 2),
    });
    // Highlight when player is near
    const dx = playerPos.x - cx;
    const dz = playerPos.z - cz;
    const near = dx * dx + dz * dz < INTERACT_R * INTERACT_R;
    if (promptRef.current) promptRef.current.visible = near;
    if (ringRef.current && near) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {posts.map((p, i) => (
        <FencePost key={i} position={p} scale={1.9} />
      ))}
      {/* Arch beam */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[cx, y + 2.45, cz]}
        rotation={[0, baseRot, 0]}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[POST_X * 2 + 0.8, 0.32, 0.36]} />
          <meshStandardMaterial color={"#5a3a20"} roughness={1} />
        </mesh>
      </RigidBody>
      {/* Decorative crossbeam */}
      <mesh castShadow position={[cx, y + 2.85, cz]} rotation={[0, baseRot, 0]}>
        <boxGeometry args={[POST_X * 2 - 0.4, 0.18, 0.24]} />
        <meshStandardMaterial color={"#6b4a2b"} roughness={1} />
      </mesh>
      {/* Left door, hinged at +tangent post */}
      <RigidBody
        ref={leftRef}
        type="kinematicPosition"
        colliders="cuboid"
        position={[lpx, y + 0.85, lpz]}
        rotation={[0, baseRot, 0]}
      >
        <mesh castShadow receiveShadow position={[-DOOR_HALF, 0, 0]}>
          <boxGeometry args={[DOOR_HALF * 2, 1.9, 0.18]} />
          <meshStandardMaterial color={"#7a4d2a"} roughness={1} />
        </mesh>
      </RigidBody>
      {/* Right door, hinged at -tangent post */}
      <RigidBody
        ref={rightRef}
        type="kinematicPosition"
        colliders="cuboid"
        position={[rpx, y + 0.85, rpz]}
        rotation={[0, baseRot, 0]}
      >
        <mesh castShadow receiveShadow position={[DOOR_HALF, 0, 0]}>
          <boxGeometry args={[DOOR_HALF * 2, 1.9, 0.18]} />
          <meshStandardMaterial color={"#7a4d2a"} roughness={1} />
        </mesh>
      </RigidBody>
      {/* Interaction prompt */}
      <group ref={promptRef} position={[cx, y + 0.05, cz]} visible={false}>
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial color={"#ffd27a"} transparent opacity={0.9} toneMapped={false} depthWrite={false} />
        </mesh>
        <pointLight color={"#ffd27a"} intensity={3} distance={5} position={[0, 1, 0]} />
      </group>
    </group>
  );
}

function Campfire({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.15, 12]} />
        <meshStandardMaterial color={"#2a2a2a"} roughness={1} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.35, 0.7, 8]} />
        <meshStandardMaterial
          color={"#ff7a1a"}
          emissive={"#ff5a00"}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={"#ff9050"} intensity={4} distance={10} position={[0, 1, 0]} />
    </group>
  );
}

/** Cluster of huts + a campfire around the central anchor pylon. */
export function Village({ data }: { data: TerrainData }) {
  const baseY = data.sampleWorldY(0, 0);

  const huts = useMemo(() => {
    return computeHutSlots().map((s) => ({
      pos: [s.x, baseY, s.z] as [number, number, number],
      rot: s.rotY,
    }));
  }, [baseY]);

  const fence = useMemo(() => {
    const posts: Array<[number, number, number]> = [];
    const rails: Array<{ pos: [number, number, number]; rot: number; length: number; y: number }> =
      [];
    const r = 15;
    const n = 40; // ~2.35m post spacing — readable, not picket-dense
    // Gate arc must match the actual door clearance (POST_X = 4 at radius 15
    // → half-angle = asin(4.4/15) ≈ 0.30 rad ≈ 0.094π).
    const gateHalf = Math.PI * 0.1;
    const gateMin = Math.PI / 2 - gateHalf;
    const gateMax = Math.PI / 2 + gateHalf;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const nextA = ((i + 1) / n) * Math.PI * 2;
      const prevA = ((i - 1 + n) / n) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // Leave a gap (gate) on +Z side sized to the actual gate opening.
      const inGate = a > gateMin && a < gateMax;
      const nextInGate = nextA > gateMin && nextA < gateMax;
      const prevInGate = prevA > gateMin && prevA < gateMax;
      if (inGate) continue;
      const y = data.sampleWorldY(x, z) + 0.55;
      posts.push([x, y, z]);
      // Stitch a connector rail from the gate post to this first-after-gate
      // post so the left flank also closes off cleanly.
      if (prevInGate) {
        const gx = x > 0 ? GATE.postX : -GATE.postX;
        const gz = r;
        const mx = (x + gx) / 2;
        const mz = (z + gz) / 2;
        const dy = data.sampleWorldY(mx, mz);
        const dxg = x - gx;
        const dzg = z - gz;
        const length = Math.hypot(dxg, dzg);
        const rot = Math.atan2(-dzg, dxg);
        rails.push({ pos: [mx, dy + 0.78, mz], rot, length, y: dy + 0.78 });
        rails.push({ pos: [mx, dy + 1.2, mz], rot, length, y: dy + 1.2 });
      }
      // Stitch a connector rail from this last-before-gate post directly to
      // the gate post so there is no walk-through gap on either flank.
      if (nextInGate) {
        const gx = x > 0 ? GATE.postX : -GATE.postX;
        const gz = r; // gate posts sit at z = fence radius
        const mx = (x + gx) / 2;
        const mz = (z + gz) / 2;
        const dy = data.sampleWorldY(mx, mz);
        const dxg = gx - x;
        const dzg = gz - z;
        const length = Math.hypot(dxg, dzg);
        const rot = Math.atan2(-dzg, dxg);
        rails.push({ pos: [mx, dy + 0.78, mz], rot, length, y: dy + 0.78 });
        rails.push({ pos: [mx, dy + 1.2, mz], rot, length, y: dy + 1.2 });
      }
      if (!nextInGate) {
        const x2 = Math.cos(nextA) * r;
        const z2 = Math.sin(nextA) * r;
        const mx = (x + x2) / 2;
        const mz = (z + z2) / 2;
        const dy = data.sampleWorldY(mx, mz);
        const dx = x2 - x;
        const dz = z2 - z;
        const length = Math.hypot(dx, dz);
        const rot = Math.atan2(-dz, dx);
        rails.push({ pos: [mx, dy + 0.78, mz], rot, length, y: dy + 0.78 });
        rails.push({ pos: [mx, dy + 1.2, mz], rot, length, y: dy + 1.2 });
      }
    }
    return { posts, rails, radius: r };
  }, [data]);

  return (
    <group>
      {huts.map((h, i) => (
        <Hut key={i} position={h.pos} rotation={h.rot} />
      ))}
      {fence.posts.map((p, i) => (
        <FencePost key={i} position={p} />
      ))}
      {fence.rails.map((r, i) => (
        <FenceRail key={i} position={r.pos} rotation={r.rot} length={r.length} y={r.y} />
      ))}
      <Gate data={data} radius={fence.radius} />
      {/* Campfire on the back side of the pylon, off the gate path */}
      <Campfire position={[0, baseY, -3.5]} />
    </group>
  );
}
