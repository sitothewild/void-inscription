import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group } from "three";
import { SkeletonUtils } from "three-stdlib";

type Props = {
  url: string;
  scale?: number;
  /** Animation clip name substring to play (case-insensitive). Defaults to first clip. */
  animation?: string;
  /** Y offset (model origin is usually at feet). */
  yOffset?: number;
};

/**
 * Loads a GLB and plays an animation. Clones the scene so multiple instances
 * of the same model can coexist with independent skeletons.
 */
export function CharacterModel({ url, scale = 1, animation, yOffset = 0 }: Props) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  const groupRef = useRef<Group>(null);
  const { actions, names } = useAnimations(gltf.animations, groupRef);

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

  return (
    <group ref={groupRef} position={[0, yOffset, 0]} scale={scale}>
      <primitive object={cloned} />
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