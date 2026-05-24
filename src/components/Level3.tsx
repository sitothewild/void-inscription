import { Suspense, useMemo, useRef } from "react";
import { type RapierRigidBody } from "@react-three/rapier";
import { Terrain } from "./Terrain";
import { Player } from "./Player";
import { Grass } from "./Grass";
import { Resources } from "./Resources";
import { Animals } from "./Animals";
import { Projectiles } from "./Projectiles";
import { InteractionSystem } from "./InteractionSystem";
import { Ocean } from "./Ocean";
import { SkyEnvironment } from "./SkyEnvironment";
import { Lake } from "./Lake";
import { Waterfall } from "./Waterfall";
import { Portal } from "./Portal";
import { WindParticles } from "./WindParticles";
import { useImageTerrain } from "@/hooks/useImageTerrain";
import { usePortalTrigger } from "@/hooks/usePortalTrigger";

type Props = {
  spawn: [number, number, number];
  onEnterPortal: () => void;
};

/**
 * Sundered Isle — a 2km x 2km painted world: snow peaks, deep forest,
 * meadows, swamps, hot plains, lakes, rivers and cascading waterfalls.
 */
export function Level3({ spawn, onEnterPortal }: Props) {
  const terrain = useImageTerrain({
    url: "/maps/island_source.jpg",
    worldSize: 2000,
    segments: 400,
    maxHeight: 80,
    seed: 11,
  });

  const playerRef = useRef<RapierRigidBody | null>(null);

  // Exit portal: drop one near world origin at safe ground height.
  const exitPortal = useMemo(() => {
    const x = 0;
    const z = 0;
    const y = Math.max(2, terrain.sampleWorldY(x, z) + 1);
    return { id: "exit", position: [x, y, z] as [number, number, number] };
  }, [terrain]);

  usePortalTrigger(playerRef, [exitPortal], 4, onEnterPortal);

  // Lake water sits slightly above the carved basin so waves cover the rim.
  const lakeY = 2.8;

  return (
    <>
      <SkyEnvironment fogNear={120} fogFar={520} />

      <Terrain data={terrain} />
      <Resources data={terrain} densityMultiplier={6} />
      <Grass data={terrain} count={28000} allowDesert />
      <Suspense fallback={null}>
        <Animals data={terrain} />
      </Suspense>
      <WindParticles />

      {/* Surrounding ocean — large enough to encircle the 2km island. */}
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

      <Projectiles />
      <InteractionSystem playerRef={playerRef} />

      <Portal position={exitPortal.position} color={"#a08bff"} />

      <Player spawn={spawn} terrain={terrain} camera="third" onRef={(b) => (playerRef.current = b)} />
    </>
  );
}