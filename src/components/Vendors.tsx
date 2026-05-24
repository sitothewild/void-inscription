import { Suspense, useMemo } from "react";
import { CharacterModel } from "./CharacterModel";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

type Vendor = {
  url: string;
  label: string;
  pos: [number, number, number];
  rotY: number;
};

/** Static NPC vendors clustered near the village campfire / pylon. */
export function Vendors({ data }: { data: TerrainData }) {
  const baseY = data.sampleWorldY(0, 0);
  // Place vendors on a comfortable inner ring that scales with the village
  // pad. They sit between the central pylon and the hut ring (~r=10).
  const ringR = Math.max(4, data.villageRadius * 0.45);

  const vendors = useMemo<Vendor[]>(() => {
    // Keep the +Z corridor (in front of the gate) clear: vendors only occupy
    // the back/side arcs around the campfire.
    const ring: Array<{ url: string; label: string; angle: number; radius: number }> = [
      // Angles in radians; π/2 (≈1.57) is the gate, so we skip ~[1.1, 2.0].
      { url: "/models/characters/men/Farmer.glb", label: "Trader", angle: 0.4, radius: ringR },
      { url: "/models/characters/men/Worker.glb", label: "Blacksmith", angle: 2.5, radius: ringR },
      { url: "/models/characters/men/King.glb", label: "Captain", angle: Math.PI + 0.3, radius: ringR * 0.7 },
      { url: "/models/characters/men/Hoodie_Character.glb", label: "Scout", angle: 5.1, radius: ringR },
    ];
    return ring.map((v) => {
      const x = Math.cos(v.angle) * v.radius;
      const z = Math.sin(v.angle) * v.radius;
      // Face the central pylon (origin)
      return {
        url: v.url,
        label: v.label,
        pos: [x, data.sampleWorldY(x, z), z],
        rotY: Math.atan2(-x, -z),
      };
    });
  }, [data, baseY, ringR]);

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