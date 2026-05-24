import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { Level1 } from "./Level1";
import { Level2 } from "./Level2";
import type { Controls } from "./Player";
import { TouchControls } from "./TouchControls";
import { HUD } from "./HUD";

export function Game() {
  const [currentLevel, setCurrentLevel] = useState<1 | 2>(1);
  const [playerSpawnPos, setPlayerSpawnPos] = useState<[number, number, number]>([0, 8, 0]);

  const keyMap = useMemo(
    () => [
      { name: "forward" satisfies Controls, keys: ["KeyW", "ArrowUp"] },
      { name: "back" satisfies Controls, keys: ["KeyS", "ArrowDown"] },
      { name: "left" satisfies Controls, keys: ["KeyA", "ArrowLeft"] },
      { name: "right" satisfies Controls, keys: ["KeyD", "ArrowRight"] },
      { name: "jump" satisfies Controls, keys: ["Space"] },
      { name: "sprint" satisfies Controls, keys: ["ShiftLeft", "ShiftRight"] },
    ],
    [],
  );

  const enterLevel2 = () => {
    setCurrentLevel(2);
    setPlayerSpawnPos([0, 2, -15]);
  };
  const enterLevel1 = () => {
    setCurrentLevel(1);
    setPlayerSpawnPos([0, 8, 0]);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <KeyboardControls map={keyMap}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 500 }}
          gl={{
            antialias: true,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
            outputColorSpace: SRGBColorSpace,
          }}
        >
          <Physics gravity={[0, -20, 0]} timeStep={1 / 60}>
            {currentLevel === 1 ? (
              <Level1 key="L1" spawn={playerSpawnPos} onEnterPortal={enterLevel2} />
            ) : (
              <Level2 key="L2" spawn={playerSpawnPos} onEnterPortal={enterLevel1} />
            )}
          </Physics>
        </Canvas>
      </KeyboardControls>

      <HUD />
      <TouchControls />

      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          padding: "10px 14px",
          background: "rgba(0,0,0,0.5)",
          color: "white",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
          lineHeight: 1.5,
          borderRadius: 8,
          backdropFilter: "blur(6px)",
          pointerEvents: "none",
        }}
      >
        <div>Level: {currentLevel}</div>
        <div>WASD move · Space jump</div>
        <div>Walk to a portal to enter</div>
      </div>
    </div>
  );
}