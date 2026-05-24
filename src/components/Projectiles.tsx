import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, useGLTF } from "@react-three/drei";
import { Group } from "three";

type Arrow = {
  id: number;
  pos: [number, number, number];
  dir: [number, number, number];
  speed: number;
  life: number;
};

type Listener = (a: Omit<Arrow, "id" | "life">) => void;
const listeners = new Set<Listener>();

/** Fire an arrow from anywhere in the app. */
export function fireArrow(a: Omit<Arrow, "id" | "life">) {
  listeners.forEach((l) => l(a));
}

function ArrowMesh({ arrow }: { arrow: Arrow }) {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF("/models/items/arrow.glb");
  const rotY = Math.atan2(arrow.dir[0], arrow.dir[2]);
  const rotX = -Math.asin(arrow.dir[1]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x += arrow.dir[0] * arrow.speed * dt;
    g.position.y += arrow.dir[1] * arrow.speed * dt;
    g.position.z += arrow.dir[2] * arrow.speed * dt;
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
      <Clone object={scene} scale={0.6} castShadow />
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
        { id, pos: [...a.pos] as [number, number, number], dir: [...a.dir] as [number, number, number], speed: a.speed, life: 4 },
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
      if (now - t > a.life * 1000) {
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