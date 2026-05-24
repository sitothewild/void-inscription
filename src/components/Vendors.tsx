import { Suspense, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CharacterModel } from "./CharacterModel";
import { computeHutSlots } from "@/game/villageLayout";
import type { TerrainData } from "@/hooks/useProceduralTerrain";
import { playerPos } from "@/game/inputStore";
import { vendorProximity } from "@/game/inventory";

type Vendor = {
  url: string;
  label: string;
  pos: [number, number, number];
  rotY: number;
};

/**
 * Static NPC vendors. Each vendor is anchored next to a specific hut (their
 * "shop") rather than placed on an arbitrary ring, so the village reads as
 * intentional: blacksmith at the smithy, trader at the trading post, etc.
 */
export function Vendors({ data }: { data: TerrainData }) {
  const vendors = useMemo<Vendor[]>(() => {
    const slots = computeHutSlots();
    // Map vendors to specific hut indices. Each vendor stands ~1.6m in front
    // of "their" hut's door, offset slightly sideways so they don't block
    // the entrance, and faces outward (away from the hut into the plaza).
    const assignments: Array<{ url: string; label: string; hutIndex: number; sideOffset: number }> = [
      { url: "/models/characters/men/Worker.glb",           label: "Blacksmith", hutIndex: 0, sideOffset: 0.6 },
      { url: "/models/characters/men/Farmer.glb",           label: "Trader",     hutIndex: 1, sideOffset: -0.6 },
      { url: "/models/characters/men/King.glb",             label: "Captain",    hutIndex: 3, sideOffset: 0.5 },
      { url: "/models/characters/men/Hoodie_Character.glb", label: "Scout",      hutIndex: 5, sideOffset: -0.5 },
    ];
    return assignments.flatMap((a) => {
      const hut = slots[a.hutIndex];
      if (!hut) return [];
      // "Outward" radial unit vector from village center → hut.
      const ur = Math.cos(hut.angle);
      const vr = Math.sin(hut.angle);
      // Tangent (perpendicular to radial), for the side offset along the hut wall.
      const ut = -vr;
      const vt = ur;
      // Stand 1.6m IN FRONT of the door — doors face the seed/center now,
      // so vendors live on the inner (plaza) side of their hut. This keeps
      // them visible from the isometric camera instead of hidden behind
      // the hut's outer wall.
      const standOut = 1.6;
      const x = hut.x - ur * standOut + ut * a.sideOffset;
      const z = hut.z - vr * standOut + vt * a.sideOffset;
      return [{
        url: a.url,
        label: a.label,
        pos: [x, data.sampleWorldY(x, z), z] as [number, number, number],
        // Face the seed/pylon at world origin.
        rotY: Math.atan2(-x, -z),
      }];
    });
  }, [data]);

  // Per-frame: find the nearest vendor within range and publish it for the UI.
  const INTERACT = 3.5;
  useFrame(() => {
    let best: Vendor | null = null;
    let bestD = INTERACT * INTERACT;
    for (const v of vendors) {
      const dx = v.pos[0] - playerPos.x;
      const dz = v.pos[2] - playerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) {
        bestD = d2;
        best = v;
      }
    }
    vendorProximity.set(best ? { label: best.label, pos: best.pos } : null);
  });
  useEffect(() => () => vendorProximity.set(null), []);

  return (
    <group>
      {vendors.map((v) => (
        <group key={v.label} position={v.pos} rotation={[0, v.rotY, 0]}>
          <Suspense fallback={null}>
            <CharacterModel url={v.url} scale={1} animation="idle" />
          </Suspense>
          {/* Soft golden glow ring so vendors stand out at a glance. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.9, 1.15, 32]} />
            <meshBasicMaterial color={"#ffd86b"} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}