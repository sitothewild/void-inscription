import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, useGLTF } from "@react-three/drei";
import { Group } from "three";
import { hitTargets } from "@/game/hitTargets";
import { health } from "@/game/health";

type Arrow = {
  id: number;
  pos: [number, number, number];
  dir: [number, number, number];
  speed: number;
  life: number;
  /** Max travel distance (m) before despawn. */
  maxDistance: number;
  /** Damage scalar (0..1+) — used by hit handlers. */
  power: number;
};

type Listener = (a: Omit<Arrow, "id" | "life">) => void;
const listeners = new Set<Listener>();

/** Fire an arrow from anywhere in the app. */
export function fireArrow(a: {
  pos: [number, number, number];
  dir: [number, number, number];
  speed: number;
  /** Max distance (m). Default 12. */
  maxDistance?: number;
  /** Damage 0..1. Default 0.3 (quick shot). */
  power?: number;
}) {
  const full: Omit<Arrow, "id" | "life"> = {
    pos: a.pos,
    dir: a.dir,
    speed: a.speed,
    maxDistance: a.maxDistance ?? 12,
    power: a.power ?? 0.3,
  };
  listeners.forEach((l) => l(full));
}

function ArrowMesh({ arrow }: { arrow: Arrow }) {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF("/models/items/arrow.glb");
  const rotY = Math.atan2(arrow.dir[0], arrow.dir[2]);
  const rotX = -Math.asin(arrow.dir[1]);
  const travelled = useRef(0);
  const onDespawn = useRef<(() => void) | null>(null);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const step = arrow.speed * dt;
    g.position.x += arrow.dir[0] * step;
    g.position.y += arrow.dir[1] * step;
    g.position.z += arrow.dir[2] * step;
    travelled.current += step;
    // Hit detection against registered damageable targets.
    const px = g.position.x;
    const py = g.position.y;
    const pz = g.position.z;
    for (const t of hitTargets.list()) {
      const dx = px - t.x;
      const dy = py - t.y;
      const dz = pz - t.z;
      if (dx * dx + dy * dy + dz * dz < t.radius * t.radius) {
        // Power 0..1 scales to 6..30 damage.
        const dmg = 6 + arrow.power * 24;
        health.damage(t.id, dmg);
        arrow.life = 0;
        arrow.speed = 0;
        return;
      }
    }
    if (travelled.current >= arrow.maxDistance) {
      // Sink it harmlessly — Projectiles' lifetime sweep will GC it next.
      arrow.life = 0;
      arrow.speed = 0;
      return;
    }
    // Mild gravity arc
    arrow.dir[1] -= 0.4 * dt;
    const len = Math.hypot(arrow.dir[0], arrow.dir[1], arrow.dir[2]) || 1;
    arrow.dir[0] /= len;
    arrow.dir[1] /= len;
    arrow.dir[2] /= len;
    g.rotation.set(-Math.asin(arrow.dir[1]), Math.atan2(arrow.dir[0], arrow.dir[2]), 0);
  });

  return (
    <group
      ref={ref}
      position={arrow.pos}
      rotation={[rotX, rotY, 0]}
    >
      <Clone object={scene} scale={0.6 + arrow.power * 0.5} castShadow />
      {arrow.power > 0.5 && (
        <pointLight color={"#ff4030"} intensity={arrow.power * 4} distance={3} />
      )}
    </group>
  );
}

export function Projectiles() {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const nextId = useRef(1);
  const spawned = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const handler: Listener = (a) => {
      const id = nextId.current++;
      spawned.current.set(id, performance.now());
      setArrows((prev) => [
        ...prev,
        {
          id,
          pos: [...a.pos] as [number, number, number],
          dir: [...a.dir] as [number, number, number],
          speed: a.speed,
          life: 4,
          maxDistance: a.maxDistance,
          power: a.power,
        },
      ]);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  useFrame(() => {
    const now = performance.now();
    let changed = false;
    const map = spawned.current;
    const remaining = arrows.filter((a) => {
      const t = map.get(a.id) ?? now;
      if (a.life <= 0 || now - t > a.life * 1000) {
        map.delete(a.id);
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) setArrows(remaining);
  });

  return (
    <>
      {arrows.map((a) => (
        <ArrowMesh key={a.id} arrow={a} />
      ))}
    </>
  );
}

useGLTF.preload("/models/items/arrow.glb");