import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Raycaster, Vector3, type Mesh, type ShaderMaterial } from "three";
import { useGame } from "@/game/store";
import { heightAt } from "@/game/terrain";

/**
 * Fades slab tiles between the camera and the hero so the player is never
 * occluded by upper layers. Operates on any mesh whose material has a
 * `uFade` uniform (TriplanarToon).
 */
export function CameraFade() {
  const { scene, camera } = useThree();
  const ray = useRef(new Raycaster());
  const target = useRef(new Vector3());
  const dir = useRef(new Vector3());
  const faded = useRef(new Set<ShaderMaterial>());

  useFrame((_, dt) => {
    const { heroX, heroZ, tiles } = useGame.getState();
    const hy = heightAt(heroX, heroZ, tiles) + 1.2;
    target.current.set(heroX, hy, heroZ);
    dir.current.copy(target.current).sub(camera.position);
    const dist = dir.current.length();
    dir.current.normalize();
    ray.current.set(camera.position, dir.current);
    ray.current.far = dist;
    ray.current.near = 0.1;

    const hits = ray.current.intersectObjects(scene.children, true);
    const nowFaded = new Set<ShaderMaterial>();
    for (const h of hits) {
      const m = (h.object as Mesh).material as ShaderMaterial | undefined;
      if (m && m.uniforms && "uFade" in m.uniforms) {
        nowFaded.add(m);
      }
    }
    const k = 1 - Math.exp(-dt * 10);
    // Fade in newly-occluding
    nowFaded.forEach((m) => {
      m.uniforms.uFade.value += (0.18 - m.uniforms.uFade.value) * k;
      faded.current.add(m);
    });
    // Restore the rest
    faded.current.forEach((m) => {
      if (!nowFaded.has(m)) {
        m.uniforms.uFade.value += (1 - m.uniforms.uFade.value) * k;
        if (m.uniforms.uFade.value > 0.985) faded.current.delete(m);
      }
    });
  });

  return null;
}