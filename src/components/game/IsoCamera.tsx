import { OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { OrthographicCamera as OC } from "three";
import { useGame } from "@/game/store";

export function IsoCamera() {
  const cam = useRef<OC>(null);
  const { size } = useThree();
  const aspect = size.width / size.height;
  const zoom = 40;

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
      left={-aspect * (size.width / zoom) / 2}
      right={(aspect * size.width) / zoom / 2}
      top={size.height / zoom / 2}
      bottom={-size.height / zoom / 2}
      near={0.1}
      far={200}
    />
  );
}