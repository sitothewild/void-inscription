import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { Vector3 } from "three";

/** Fires onEnter once when the player gets within `radius` of any portal pos. */
export function usePortalTrigger(
  playerRef: React.MutableRefObject<RapierRigidBody | null>,
  portals: Array<{ id: string; position: [number, number, number] }>,
  radius: number,
  onEnter: (id: string) => void,
) {
  const armed = useRef(true);
  const tmp = new Vector3();

  useEffect(() => {
    armed.current = true;
  }, [portals]);

  useFrame(() => {
    const body = playerRef.current;
    if (!body) return;
    const t = body.translation();
    tmp.set(t.x, t.y, t.z);
    for (const p of portals) {
      const dx = tmp.x - p.position[0];
      const dz = tmp.z - p.position[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < radius) {
        if (armed.current) {
          armed.current = false;
          onEnter(p.id);
        }
        return;
      }
    }
    armed.current = true;
  });
}