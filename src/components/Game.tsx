import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { Level1 } from "./Level1";
import { Level2 } from "./Level2";
import { Level3 } from "./Level3";
import type { Controls } from "./Player";
import { TouchControls } from "./TouchControls";
import { HUD } from "./HUD";
import { PauseMenu } from "./PauseMenu";
import { Shop } from "./Shop";
import { InventoryWindow } from "./InventoryWindow";
import { AdminConsole } from "./AdminConsole";
import { MapOverlay } from "./MapOverlay";
import { ControlsHUD } from "./ControlsHUD";
import { useEffect } from "react";
import { emitEdge } from "@/game/inputStore";

export function Game() {
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [playerSpawnPos, setPlayerSpawnPos] = useState<[number, number, number]>([0, 90, 0]);

  // Global keyboard wiring:
  //   E -> interaction edge (harvest / talk)
  //   Track Ctrl/Alt for admin flight ascend/descend.
  useEffect(() => {
    const mods = ((window as unknown as { __mods?: { ctrl: boolean; alt: boolean } }).__mods ??=
      { ctrl: false, alt: false });
    const onDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) mods.ctrl = true;
      if (e.altKey) mods.alt = true;
      if ((e.code === "KeyE") && !e.repeat) {
        emitEdge("action");
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) mods.ctrl = false;
      if (!e.altKey) mods.alt = false;
    };
    const onBlur = () => {
      mods.ctrl = false;
      mods.alt = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

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

  // Cycle: L1 → L3 (Sundered Isle) → L2 (crystal tunnel) → L1.
  const enterLevel3 = () => {
    setCurrentLevel(3);
    setPlayerSpawnPos([0, 90, 0]);
  };
  const enterLevel2 = () => {
    setCurrentLevel(2);
    setPlayerSpawnPos([0, 2, -15]);
  };
  const enterLevel1 = () => {
    setCurrentLevel(1);
    setPlayerSpawnPos([0, 90, 0]);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black" style={{ cursor: "crosshair" }}>
      <KeyboardControls map={keyMap}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 2400 }}
          gl={{
            antialias: true,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
            outputColorSpace: SRGBColorSpace,
          }}
        >
          <Physics gravity={[0, -20, 0]} timeStep={1 / 60}>
            <Suspense fallback={null}>
              {currentLevel === 1 && (
                <Level1 key="L1" spawn={playerSpawnPos} onEnterPortal={enterLevel3} />
              )}
              {currentLevel === 2 && (
                <Level2 key="L2" spawn={playerSpawnPos} onEnterPortal={enterLevel1} />
              )}
              {currentLevel === 3 && (
                <Level3 key="L3" spawn={playerSpawnPos} onEnterPortal={enterLevel2} />
              )}
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      <HUD />
      <TouchControls />
      <ControlsHUD />
      <PauseMenu />
      <Shop />
      <InventoryWindow />
      <AdminConsole />
      <MapOverlay />

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
        <div>WASD run · Space jump · E interact · I bag · M map · ` admin</div>
        <div>Run to a portal to enter</div>
      </div>
    </div>
  );
}