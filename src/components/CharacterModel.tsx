import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Box3, Group, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";

type Props = {
  url: string;
  scale?: number;
  /** Animation clip name substring to play (case-insensitive). Defaults to first clip. */
  animation?: string;
  /** Y offset (model origin is usually at feet). */
  yOffset?: number;
  /** When true, procedural walk bob is applied. Used as fallback when GLB lacks clips. */
  moving?: boolean;
  /** Procedural anim speed multiplier. */
  rate?: number;
};

/**
 * Loads a GLB and plays an animation. Clones the scene so multiple instances
 * of the same model can coexist with independent skeletons.
 */
export function CharacterModel({ url, scale = 1, animation, yOffset = 0, moving = false, rate = 1 }: Props) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  const autoScale = useMemo(() => {
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    box.getSize(size);
    // Some RPG-pack GLBs import in centimeters, making the body nearly invisible.
    return size.y > 0 && size.y < 0.5 ? 1.8 / size.y : 1;
  }, [cloned]);
  const groupRef = useRef<Group>(null);
  const animRef = useRef<Group>(null);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);
  const { actions, names } = useAnimations(gltf.animations, groupRef);
  const hasClip = names.length > 0;

  useEffect(() => {
    cloned.traverse((o) => {
      // @ts-expect-error three Object3D typing
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [cloned]);

  useEffect(() => {
    if (!names.length) return;
    let pick = names[0];
    if (animation) {
      const lower = animation.toLowerCase();
      const match = names.find((n) => n.toLowerCase().includes(lower));
      if (match) pick = match;
    }
    const action = actions[pick];
    action?.reset().fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names, animation]);

  // Procedural fallback: bob & sway when the GLB has no animation clips.
  useFrame((state) => {
    if (hasClip) return;
    const g = animRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime * rate + seed;
    if (moving) {
      const stride = Math.sin(t * 10);
      g.position.y = Math.abs(stride) * 0.08;
      g.rotation.z = stride * 0.06;
      g.rotation.x = Math.cos(t * 10) * 0.04;
    } else {
      const breathe = Math.sin(t * 2) * 0.02;
      g.position.y = breathe;
      g.rotation.z = Math.sin(t * 1.3) * 0.01;
      g.rotation.x = 0;
    }
  });

  return (
    <group ref={groupRef} position={[0, yOffset, 0]} scale={scale * autoScale}>
      <group ref={animRef}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/characters/warrior.glb");
useGLTF.preload("/models/characters/cowboy.glb");
useGLTF.preload("/models/characters/female-fighter.glb");
useGLTF.preload("/models/characters/male-fighter.glb");
useGLTF.preload("/models/animals/fox.glb");
useGLTF.preload("/models/animals/deer.glb");
useGLTF.preload("/models/animals/rabbit.glb");
useGLTF.preload("/models/animals/bear.glb");
useGLTF.preload("/models/animals/bird.glb");
useGLTF.preload("/models/animals/sheep.glb");
