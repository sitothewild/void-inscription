import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
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

function World() {
  const resources = useGame((s) => s.resources);
  const enemies = useGame((s) => s.enemies);
  return (
    <>
      {resources.map((r) =>
        r.kind === "tree" ? (
          <Tree key={r.id} x={r.x} z={r.z} />
        ) : (
          <Rock key={r.id} x={r.x} z={r.z} />
        ),
      )}
      {enemies.map((e) => (
        <Enemy key={e.id} enemy={e} />
      ))}
    </>
  );
}

export function Scene() {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <IsoCamera />
        <Lighting />
        <Ground />
        <Seed />
        <Hero />
        <World />
        <GameLoop />
      </Suspense>
    </Canvas>
  );
}