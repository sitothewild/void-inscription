import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { onEdge, playerPos } from "@/game/inputStore";
import { computeHutSlots, VILLAGE_GATE_ANGLES } from "@/game/villageLayout";
import type { TerrainData } from "@/hooks/useProceduralTerrain";
import { health, useHealth, type HealthId } from "@/game/health";
import { hitTargets } from "@/game/hitTargets";
import { WorldHealthBar } from "./WorldHealthBar";
import { GltfProp } from "./GltfProp";

/** Suburban house GLBs cycled per slot for variety. */
const HOUSE_URLS = [
  "/models/houses/House.glb",
  "/models/houses/House-7VSVwAg2T3.glb",
  "/models/houses/Two_story_house.glb",
  "/models/houses/Two_story_house-9N6ROCbmO1.glb",
  "/models/houses/Two_story_house-QsF9E0PqyN.glb",
  "/models/houses/Two_story_house-hmXhiLDf8D.glb",
  "/models/houses/Two_story_house-htvFgnVP4d.glb",
  "/models/houses/Two_story_house-sGgL4Nt7I7.glb",
];

function Hut({
  position,
  rotation,
  url,
}: {
  position: [number, number, number];
  rotation: number;
  url: string;
}) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Tight collider covers the suburban house footprint. The visual GLB
          is loaded inside a Suspense; the collider stays put while it streams. */}
      <CuboidCollider args={[1.6, 1.4, 1.6]} position={[0, 1.4, 0]} friction={1.2} />
      <Suspense fallback={null}>
        <GltfProp url={url} scale={1.6} />
      </Suspense>
    </RigidBody>
  );
}

/** Shared gate dimensions so fence stitching and door geometry agree. */
const GATE = {
  postX: 4.0,
  /** Half-width of each door — two doors cover [-2*half, +2*half] when closed. */
  doorHalf: 2.0,
};

/**
 * Modular wooden fence segment (Wood_Frame build set). Provides its own thin
 * cuboid collider so players still can't walk through the prop. The visual
 * mesh is loaded asynchronously inside Suspense.
 */
const FENCE_URL = "/models/fences/Wood_Fence_1.glb";
/** Approximate segment width of one fence GLB. Used to space modules. */
export const FENCE_SEGMENT_LEN = 1.8;

function FenceSegment({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={[0, rotation, 0]}
    >
      <CuboidCollider args={[FENCE_SEGMENT_LEN / 2, 0.7, 0.08]} position={[0, 0.7, 0]} />
      <Suspense fallback={null}>
        <GltfProp url={FENCE_URL} scale={1.1} />
      </Suspense>
    </RigidBody>
  );
}

function Gate({
  data,
  radius,
  angle,
  index,
}: {
  data: TerrainData;
  radius: number;
  angle: number;
  index: number;
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
  const hpId: HealthId = `gate:${index}`;
  const hp = useHealth(hpId);
  const broken = hp ? hp.hp <= 0 : false;

  // Register gate as a damageable target + ensure its health entry exists.
  useEffect(() => {
    health.ensure(hpId, 200);
    hitTargets.register({ id: hpId, x: cx, y: y + 1.2, z: cz, radius: 2.6 });
    return () => hitTargets.unregister(hpId);
  }, [cx, cz, y, hpId]);

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
    // Broken gates swing fully open and stay that way.
    const target = broken || open ? 1 : 0;
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
      {/* Sturdy posts on either side of the gate opening (visual + collider). */}
      {posts.map((p, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid" position={p}>
          <mesh castShadow>
            <boxGeometry args={[0.28, 2.1, 0.28]} />
            <meshStandardMaterial color={"#3a2a18"} roughness={1} />
          </mesh>
        </RigidBody>
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
      {/* Gate health bar — billboarded above the arch. */}
      <group position={[cx, y + 3.4, cz]}>
        <WorldHealthBar id={hpId} yOffset={0} width={2.4} color={broken ? "#ff5555" : "#c89c5a"} label="Gate" />
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

/**
 * Wooden garrison watchtower. Hollow log base with a railed lookout platform
 * and a torch on top. Anchor points are exposed for future NPC mounts
 * (guards stationed on the platform).
 */
function WatchTower({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const BASE = 1.0; // base half-width (was 1.6)
  const H = 2.8;    // total height to platform deck (was 4.2)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Four corner posts */}
      <RigidBody type="fixed" colliders="cuboid">
        {[
          [-BASE, 0, -BASE],
          [BASE, 0, -BASE],
          [-BASE, 0, BASE],
          [BASE, 0, BASE],
        ].map((p, i) => (
          <mesh key={i} castShadow receiveShadow position={[p[0], H / 2, p[2]]}>
            <boxGeometry args={[0.28, H, 0.28]} />
            <meshStandardMaterial color={"#4a2f1a"} roughness={1} />
          </mesh>
        ))}
      </RigidBody>
      {/* Cross-braces (decorative, no collider) */}
      <mesh castShadow position={[0, 1.4, -BASE]} rotation={[0, 0, Math.PI / 5]}>
        <boxGeometry args={[BASE * 2.6, 0.14, 0.14]} />
        <meshStandardMaterial color={"#5a3a20"} roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 1.4, BASE]} rotation={[0, 0, -Math.PI / 5]}>
        <boxGeometry args={[BASE * 2.6, 0.14, 0.14]} />
        <meshStandardMaterial color={"#5a3a20"} roughness={1} />
      </mesh>
      <mesh castShadow position={[-BASE, 1.4, 0]} rotation={[Math.PI / 5, 0, 0]}>
        <boxGeometry args={[0.14, 0.14, BASE * 2.6]} />
        <meshStandardMaterial color={"#5a3a20"} roughness={1} />
      </mesh>
      <mesh castShadow position={[BASE, 1.4, 0]} rotation={[-Math.PI / 5, 0, 0]}>
        <boxGeometry args={[0.14, 0.14, BASE * 2.6]} />
        <meshStandardMaterial color={"#5a3a20"} roughness={1} />
      </mesh>
      {/* Platform deck */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow position={[0, H + 0.1, 0]}>
          <boxGeometry args={[BASE * 2.4, 0.2, BASE * 2.4]} />
          <meshStandardMaterial color={"#6b4a2b"} roughness={1} />
        </mesh>
      </RigidBody>
      {/* Platform railings */}
      {[
        { p: [0, H + 0.75, -BASE] as [number, number, number], r: [0, 0, 0] as [number, number, number] },
        { p: [0, H + 0.75, BASE] as [number, number, number], r: [0, 0, 0] as [number, number, number] },
        { p: [-BASE, H + 0.75, 0] as [number, number, number], r: [0, Math.PI / 2, 0] as [number, number, number] },
        { p: [BASE, H + 0.75, 0] as [number, number, number], r: [0, Math.PI / 2, 0] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} castShadow position={b.p} rotation={b.r}>
          <boxGeometry args={[BASE * 2.4, 0.12, 0.12]} />
          <meshStandardMaterial color={"#5a3a20"} roughness={1} />
        </mesh>
      ))}
      {/* Pitched plank roof */}
      <mesh castShadow position={[0, H + 1.9, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[BASE * 1.7, 1.2, 4]} />
        <meshStandardMaterial color={"#3a2a18"} roughness={1} />
      </mesh>
      {/* Torch on the outward side (facing village outskirts) */}
      <mesh castShadow position={[0, H + 0.6, BASE - 0.1]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 6]} />
        <meshStandardMaterial color={"#2a1a0e"} />
      </mesh>
      <mesh position={[0, H + 1.05, BASE - 0.1]}>
        <coneGeometry args={[0.18, 0.4, 8]} />
        <meshStandardMaterial
          color={"#ffaa3a"}
          emissive={"#ff7a1a"}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={"#ffb070"} intensity={3} distance={10} position={[0, H + 1.1, BASE - 0.1]} />
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

  // Modern modular fence: drop a continuous ring of GLB segments around the
  // village radius, skipping each gate's clearance arc. Each segment sits on
  // the terrain and faces tangent to the circle.
  const fence = useMemo(() => {
    const r = 15;
    const circumference = Math.PI * 2 * r;
    const n = Math.max(24, Math.round(circumference / FENCE_SEGMENT_LEN));
    const TAU = Math.PI * 2;
    const norm = (a: number) => ((a % TAU) + TAU) % TAU;
    const gates = VILLAGE_GATE_ANGLES.map(norm);
    // Gate clearance matches the actual angular extent of the gate posts
    // (POST_X off the fence circle). Tight margin so the fence butts up
    // against each gate and the ring reads as a closed circle.
    const gateHalf = Math.atan2(GATE.postX, r) + 0.02;
    const inAnyGate = (a: number) =>
      gates.some((g) => {
        const d = Math.abs(((norm(a) - g + Math.PI) % TAU) - Math.PI);
        return d < gateHalf;
      });
    const segments: Array<{ pos: [number, number, number]; rot: number }> = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      if (inAnyGate(a)) continue;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = data.sampleWorldY(x, z);
      // Segment's local +X faces along the fence (tangent direction).
      const rot = Math.atan2(-Math.cos(a), Math.sin(a));
      segments.push({ pos: [x, y, z], rot });
    }
    return { segments, radius: r };
  }, [data]);

  // Two watchtowers per gate, flanking each gate just inside the fence.
  // Positions: gate center + tangent*±OFFSET + inward*INSET.
  const towers = useMemo(() => {
    const fenceR = 15;
    const TANGENT = GATE.postX + 2.2; // outside the door swing arc
    const INSET = 3.0; // pulled inside the village
    const out: Array<{ pos: [number, number, number]; rot: number }> = [];
    for (const angle of VILLAGE_GATE_ANGLES) {
      const cx = Math.cos(angle) * fenceR;
      const cz = Math.sin(angle) * fenceR;
      const tx = -Math.sin(angle);
      const tz = Math.cos(angle);
      // Inward unit vector (toward village center).
      const ix = -Math.cos(angle);
      const iz = -Math.sin(angle);
      for (const side of [-1, 1] as const) {
        const x = cx + tx * TANGENT * side + ix * INSET;
        const z = cz + tz * TANGENT * side + iz * INSET;
        const y = data.sampleWorldY(x, z);
        // Face the tower outward (toward the gate), so the torch & platform
        // front line up with the road.
        const rot = Math.atan2(-iz, ix) + Math.PI / 2;
        out.push({ pos: [x, y, z], rot });
      }
    }
    return out;
  }, [data]);

  return (
    <group>
      {huts.map((h, i) => (
        <Hut key={i} position={h.pos} rotation={h.rot} url={HOUSE_URLS[i % HOUSE_URLS.length]} />
      ))}
      {fence.segments.map((s, i) => (
        <FenceSegment key={i} position={s.pos} rotation={s.rot} />
      ))}
      {VILLAGE_GATE_ANGLES.map((angle, i) => (
        <Gate key={i} data={data} radius={fence.radius} angle={angle} index={i} />
      ))}
      {towers.map((t, i) => (
        <WatchTower key={i} position={t.pos} rotation={t.rot} />
      ))}
      {/* Campfire on the back side of the pylon, off the gate path */}
      <Campfire position={[0, baseY, -3.5]} />
    </group>
  );
}
