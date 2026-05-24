import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Group, LoopOnce, LoopRepeat } from "three";
import { SkeletonUtils } from "three-stdlib";

/** Looping locomotion / posture states. */
export type CharState = "idle" | "walk" | "run" | "aim" | "run_aim";
/** One-shot actions that play once then return to the current CharState. */
export type CharAction = "shoot" | "jump" | "interact" | "hit" | "wave" | null;

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
  /**
   * Per-frame getter for transient one-shot actions (shoot/jump/etc.).
   * Return the action once, then return null on the next frame — the
   * component handles the rest (LoopOnce, return to state).
   */
  getAction?: () => CharAction;
  /** Procedural anim speed multiplier. */
  rate?: number;
};

/**
 * Loads a GLB and plays an animation. Clones the scene so multiple instances
 * of the same model can coexist with independent skeletons.
 */
export function CharacterModel({ url, scale = 1, animation, yOffset = 0, moving = false, getMoving, getState, getAction, rate = 1 }: Props) {
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
  const oneShotName = useRef<string | null>(null);
  const oneShotUntil = useRef(0);

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

  const playClip = (target: string | null, fade = 0.18) => {
    if (!target || target === currentName.current) return;
    const prev = currentName.current ? actions[currentName.current] : null;
    const next = actions[target];
    if (!next) return;
    prev?.fadeOut(fade);
    next.reset().setLoop(LoopRepeat, Infinity).fadeIn(fade).play();
    currentName.current = target;
  };

  const playOneShot = (target: string | null, fade = 0.08) => {
    if (!target) return;
    const next = actions[target];
    if (!next) return;
    const prev = currentName.current ? actions[currentName.current] : null;
    prev?.fadeOut(fade);
    next.reset().setLoop(LoopOnce, 1).fadeIn(fade).play();
    next.clampWhenFinished = true;
    oneShotName.current = target;
    oneShotUntil.current = performance.now() + next.getClip().duration * 1000;
    currentName.current = target;
  };

  // Procedural fallback: bob & sway when the GLB has no animation clips.
  useFrame((state) => {
    // One-shot actions take priority — trigger then wait for clip end.
    if (hasClip && getAction) {
      const a = getAction();
      if (a) {
        const target =
          a === "shoot"
            ? pickClip(["idle_gun_shoot", "gun_shoot"])
            : a === "jump"
              ? pickClip(["roll", "jump"])
              : a === "interact"
                ? pickClip(["interact"])
                : a === "hit"
                  ? pickClip(["hitrecieve", "hit"])
                  : a === "wave"
                    ? pickClip(["wave"])
                    : null;
        playOneShot(target);
      }
    }
    const oneShotActive =
      oneShotName.current !== null && performance.now() < oneShotUntil.current;
    if (oneShotActive) {
      // Let one-shot finish before resuming state-driven clips.
    } else if (oneShotName.current !== null) {
      oneShotName.current = null;
      currentName.current = null; // force re-pick of state clip below
    }
    // State-driven clip selection (only when no one-shot is active).
    if (hasClip && getState && !oneShotActive) {
      const s = getState();
      let target: string | null;
      if (s === "run_aim") {
        target =
          pickClip(["run_shoot"]) ??
          pickClip(["run"]) ??
          pickClip(["walk"]) ??
          names[0];
      } else if (s === "aim") {
        target =
          pickClip(["idle_gun_pointing"]) ??
          pickClip(["idle_gun"]) ??
          pickClip(["idle_neutral", "idle"]) ??
          names[0];
      } else if (s === "run") {
        target =
          pickClip(["run", "sprint", "jog"]) ?? pickClip(["walk"]) ?? names[0];
      } else if (s === "walk") {
        target = pickClip(["walk"]) ?? pickClip(["run"]) ?? names[0];
      } else {
        target = pickClip(["idle_neutral", "idle"]) ?? names[0];
      }
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
useGLTF.preload("/models/characters/men/HumanM_KI.glb");
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
