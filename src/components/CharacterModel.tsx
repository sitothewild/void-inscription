import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { SkeletonUtils } from "three-stdlib";

export type CharState = "idle" | "walk" | "run";

type Props = {
  url: string;
  scale?: number;
  /** Animation clip name substring to play (case-insensitive). Defaults to first clip. */
  animation?: string;
  /** Y offset (model origin is usually at feet). */
  yOffset?: number;
  /** When true, procedural walk bob is applied. Used as fallback when GLB lacks clips. */
  moving?: boolean;
  /** Optional per-frame getter for moving state (avoids re-renders). */
  getMoving?: () => boolean;
  /** Per-frame getter for high-level locomotion state. Drives clip cross-fade. */
  getState?: () => CharState;
  /** Procedural anim speed multiplier. */
  rate?: number;
};

/**
 * Loads a GLB and plays an animation. Clones the scene so multiple instances
 * of the same model can coexist with independent skeletons.
 */
export function CharacterModel({ url, scale = 1, animation, yOffset = 0, moving = false, getMoving, getState, rate = 1 }: Props) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  // NOTE: Do NOT try to auto-normalise scale via Box3.setFromObject for
  // skinned characters. Quaternius/Modular Men export POSITION attributes in
  // bind space (~1cm extents) and rely on root-bone transforms to render at
  // human scale. Box3 reads the rest pose and reports the tiny extent, which
  // would cause us to scale the model ~200×. Trust the prop scale instead.
  const groupRef = useRef<Group>(null);
  const animRef = useRef<Group>(null);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);
  const { actions, names } = useAnimations(gltf.animations, groupRef);
  const hasClip = names.length > 0;
  const currentName = useRef<string | null>(null);

  useEffect(() => {
    cloned.traverse((o) => {
      // @ts-expect-error three Object3D typing
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [cloned]);

  const pickClip = (keywords: string[]): string | null => {
    for (const kw of keywords) {
      const m = names.find((n) => n.toLowerCase().includes(kw));
      if (m) return m;
    }
    return null;
  };

  // Initial clip if no state driver supplied.
  useEffect(() => {
    if (!names.length || getState) return;
    const lower = (animation ?? "idle").toLowerCase();
    const pick = names.find((n) => n.toLowerCase().includes(lower)) ?? names[0];
    const action = actions[pick];
    action?.reset().fadeIn(0.2).play();
    currentName.current = pick;
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names, animation, getState]);

  const playClip = (target: string | null) => {
    if (!target || target === currentName.current) return;
    const prev = currentName.current ? actions[currentName.current] : null;
    const next = actions[target];
    if (!next) return;
    prev?.fadeOut(0.18);
    next.reset().fadeIn(0.18).play();
    currentName.current = target;
  };

  // Procedural fallback: bob & sway when the GLB has no animation clips.
  useFrame((state) => {
    // State-driven clip selection
    if (hasClip && getState) {
      const s = getState();
      const target =
        s === "run"
          ? pickClip(["run", "sprint", "jog"]) ?? pickClip(["walk"]) ?? names[0]
          : s === "walk"
            ? pickClip(["walk"]) ?? pickClip(["run"]) ?? names[0]
            : pickClip(["idle_neutral", "idle"]) ?? names[0];
      playClip(target);
    }
    if (hasClip) return;
    const g = animRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime * rate + seed;
    const isMoving = getMoving ? getMoving() : moving;
    if (isMoving) {
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
    <group ref={groupRef} position={[0, yOffset, 0]} scale={scale}>
      <group ref={animRef}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/characters/men/Adventurer.glb");
useGLTF.preload("/models/characters/men/King.glb");
useGLTF.preload("/models/characters/men/Farmer.glb");
useGLTF.preload("/models/characters/men/Worker.glb");
useGLTF.preload("/models/characters/men/Hoodie_Character.glb");
useGLTF.preload("/models/animals/fox.glb");
useGLTF.preload("/models/animals/deer.glb");
useGLTF.preload("/models/animals/rabbit.glb");
useGLTF.preload("/models/animals/bear.glb");
useGLTF.preload("/models/animals/bird.glb");
useGLTF.preload("/models/animals/sheep.glb");
