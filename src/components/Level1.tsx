import { Suspense, useMemo, useRef } from "react";
import { type RapierRigidBody } from "@react-three/rapier";
import { Terrain } from "./Terrain";
import { Portal } from "./Portal";
import { Player } from "./Player";
import { Grass } from "./Grass";
import { Village } from "./Village";
import { WindParticles } from "./WindParticles";
import { Resources } from "./Resources";
import { Vendors } from "./Vendors";
import { Animals } from "./Animals";
import { Pylon } from "./Pylon";
import { Projectiles } from "./Projectiles";
import { InteractionSystem } from "./InteractionSystem";
import { Ocean } from "./Ocean";
import { SkyEnvironment } from "./SkyEnvironment";
import { PirateShip } from "./PirateShip";
import { FlyingCity } from "./FlyingCity";
import { Lake } from "./Lake";
import { Waterfall } from "./Waterfall";
import { useImageTerrain } from "@/hooks/useImageTerrain";
import { usePortalTrigger } from "@/hooks/usePortalTrigger";

type Props = {
  spawn: [number, number, number];
  onEnterPortal: () => void;
};

export function Level1({ spawn, onEnterPortal }: Props) {
  // The painted 2 km × 2 km island is now the main world. Snow peaks,
  // forest, meadows, swamps, hot plains, lakes and waterfalls all come
  // from /maps/island_source.jpg.
  const terrain = useImageTerrain({
    url: "/maps/island_source.jpg",
    worldSize: 2000,
    segments: 400,
    maxHeight: 80,
    seed: 11,
  });
  const playerRef = useRef<RapierRigidBody | null>(null);

  const portals = useMemo(() => {
    // Scatter portals across the 2 km island, well clear of the village
    // pad and the shore.
    const out: Array<{ id: string; position: [number, number, number] }> = [];
    let a = 0x9e3779b1;
    const rand = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const count = 12;
    const minR = 80;
    const maxR = terrain.worldSize / 2 - 80;
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const r = minR + rand() * (maxR - minR);
      const x = Math.sin(ang) * r;
      const z = Math.cos(ang) * r;
      const y = terrain.sampleWorldY(x, z);
      // skip if underwater
      if (y < 3) continue;
      out.push({ id: `p${i}`, position: [x, y, z] });
    }
    return out;
  }, [terrain]);

  usePortalTrigger(playerRef, portals, 3, onEnterPortal);

  // Lake water sits slightly above the carved basin so waves cover the rim.
  const lakeY = 2.8;

  return (
    <>
      {/* Dynamic day/night cycle drives sky, sun, moon, ambient, and fog. */}
      <SkyEnvironment fogNear={120} fogFar={520} />

      <Terrain data={terrain} />
      <Resources data={terrain} densityMultiplier={40} />
      <Grass data={terrain} count={140000} allowDesert />
      <Village data={terrain} />
      <Suspense fallback={null}>
        <Vendors data={terrain} />
        <Animals data={terrain} />
      </Suspense>
      <WindParticles />

      {/* Surrounding ocean — large enough to encircle the 2 km island. */}
      <Ocean size={3200} y={0.4} shoreRadius={terrain.worldSize / 2 - 30} />

      {/* Painted lakes become real water bodies. */}
      {terrain.lakes.map((l, i) => (
        <Lake key={i} position={[l.x, lakeY, l.z]} radius={l.r} />
      ))}

      {/* Waterfalls auto-spawned where rivers cascade off the snowline. */}
      {terrain.waterfalls.map((w, i) => (
        <Waterfall
          key={i}
          position={[w.x, w.y, w.z]}
          height={w.height}
          rotationY={w.dir}
          width={6}
        />
      ))}

      {/* Pirate ship bobbing on the open ocean for a touch of life beyond the island. */}
      <Suspense fallback={null}>
        <PirateShip position={[-260, 0.4, -terrain.worldSize / 2 - 80]} rotation={Math.PI * 0.15} scale={9} />
        <PirateShip position={[320, 0.4, -terrain.worldSize / 2 - 140]} rotation={-Math.PI * 0.4} scale={6} url="/models/pirate/Small_Ship.glb" />
      </Suspense>

      {/* Floating sky city — pure visual, drifts slowly above the island. */}
      <Suspense fallback={null}>
        <FlyingCity position={[180, 140, -220]} scale={9} seed={1337} />
        <FlyingCity position={[-260, 170, 180]} scale={7} seed={4242} />
      </Suspense>

      {/* Village Anchor — spinning cube + particles */}
      <Pylon position={[0, terrain.sampleWorldY(0, 0) + 3, 0]} color={"#ffb060"} />

      <Projectiles />
      <InteractionSystem playerRef={playerRef} />

      {/* Portals */}
      {portals.map((p) => (
        <Portal key={p.id} position={p.position} color={"#6040ff"} />
      ))}

      <Player spawn={spawn} terrain={terrain} camera="iso" onRef={(b) => (playerRef.current = b)} />
    </>
  );
}