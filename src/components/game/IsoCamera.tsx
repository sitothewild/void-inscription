import { OrthographicCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3, type OrthographicCamera as OC } from "three";
import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

export function IsoCamera() {
  const cam = useRef<OC>(null);
  const target = useRef(new Vector3());
  const look = useRef(new Vector3());

  useFrame((_, dt) => {
    if (!cam.current) return;
    const { heroX, heroZ, tiles } = useGame.getState();
    const hy = heightAt(heroX, heroZ, tiles);
    target.current.set(heroX + 20, 25 + hy, heroZ + 20);
    look.current.set(heroX, hy, heroZ);
    const k = 1 - Math.exp(-dt * 14);
    cam.current.position.lerp(target.current, k);
    cam.current.lookAt(look.current);
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