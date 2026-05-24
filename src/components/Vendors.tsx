import { Suspense, useMemo } from "react";
import { CharacterModel } from "./CharacterModel";
import { computeHutSlots } from "@/game/villageLayout";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

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
      // Stand 1.6m further out from the hut center (past the door plane).
      const standOut = 1.6;
      const x = hut.x + ur * standOut + ut * a.sideOffset;
      const z = hut.z + vr * standOut + vt * a.sideOffset;
      return [{
        url: a.url,
        label: a.label,
        pos: [x, data.sampleWorldY(x, z), z] as [number, number, number],
        // Face inward toward the plaza / pylon so the player walking up sees their face.
        rotY: Math.atan2(-x, -z),
      }];
    });
  }, [data]);

  return (
    <group>
      {vendors.map((v) => (
        <group key={v.label} position={v.pos} rotation={[0, v.rotY, 0]}>
          <Suspense fallback={null}>
            <CharacterModel url={v.url} scale={1} animation="idle" />
          </Suspense>
        </group>
      ))}
    </group>
  );
}