import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { useGame } from "@/game/store";
import { Enemy } from "./Enemy";
import { GameLoop } from "./GameLoop";
import { Ground } from "./Ground";
import { Hero } from "./Hero";
import { IsoCamera } from "./IsoCamera";
import { Lighting } from "./Lighting";
import { Rock } from "./Rock";
import { Seed } from "./Seed";
import { Tree } from "./Tree";
import { RemotePlayer } from "./RemotePlayer";
import { Village } from "./Village";
import { Vendors } from "./Vendor";
import { Herb } from "./Herb";
import { Plateaus } from "./Plateaus";
import { WindField } from "./WindField";
import { WindParticles } from "./WindParticles";
import { SkyDome } from "./SkyDome";

function World() {
  const resources = useGame((s) => s.resources);
  const enemies = useGame((s) => s.enemies);
  const players = useGame((s) => s.players);
  return (
    <>
      {resources.map((r) =>
        r.kind === "tree" ? (
          <Tree key={r.id} id={r.id} x={r.x} z={r.z} />
        ) : r.kind === "rock" ? (
          <Rock key={r.id} id={r.id} x={r.x} z={r.z} />
        ) : (
          <Herb key={r.id} id={r.id} x={r.x} z={r.z} />
        ),
      )}
      {enemies.map((e) => (
        <Enemy key={e.id} enemy={e} />
      ))}
      {Object.entries(players).map(([id, p]) => (
        <RemotePlayer key={id} p={p} />
      ))}
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
        outputColorSpace: SRGBColorSpace,
      }}
    >
      <Suspense fallback={null}>
        <IsoCamera />
        <SkyDome />
        <Lighting />
        <Ground />
        <Seed />
      <Village />
      <Plateaus />
      <WindField />
      <Vendors />
        <Hero />
        <World />
        <WindParticles />
        <GameLoop />
      </Suspense>
    </Canvas>
  );
}