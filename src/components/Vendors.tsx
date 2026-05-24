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

  const vendors = useMemo<Vendor[]>(() => {
    const ring: Array<{ url: string; label: string; angle: number; radius: number }> = [
      { url: "/models/characters/cowboy.glb", label: "Trader", angle: 0.2, radius: 4 },
      { url: "/models/characters/female-fighter.glb", label: "Captain", angle: 2.1, radius: 4.2 },
      { url: "/models/characters/male-fighter.glb", label: "Blacksmith", angle: 4.0, radius: 4 },
    ];
    return ring.map((v) => {
      const x = Math.cos(v.angle) * v.radius;
      const z = Math.sin(v.angle) * v.radius;
      // Face the campfire (origin)
      return {
        url: v.url,
        label: v.label,
        pos: [x, baseY, z],
        rotY: Math.atan2(-x, -z),
      };
    });
  }, [baseY]);

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