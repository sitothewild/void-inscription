import { OrthographicCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { OrthographicCamera as OC } from "three";
import { useGame } from "@/game/store";

export function IsoCamera() {
  const cam = useRef<OC>(null);

  useFrame(() => {
    if (!cam.current) return;
    const { heroX, heroZ } = useGame.getState();
    cam.current.position.set(heroX + 20, 25, heroZ + 20);
    cam.current.lookAt(heroX, 0, heroZ);
  });

  return (
    <OrthographicCamera
      ref={cam}
      makeDefault
      zoom={28}
      near={0.1}
      far={200}
    />
  );
}