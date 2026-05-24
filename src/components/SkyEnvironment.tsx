import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Color, DirectionalLight, Fog, Mesh, ShaderMaterial, Vector3 } from "three";
import { computeSkyEnv, tickTime, time } from "@/game/time";

type Props = {
  /** Fog near/far distances. */
  fogNear?: number;
  fogFar?: number;
};

/**
 * Drives a moving sun + moon, ambient/directional lights, sky tint, and
 * fog color from the global day/night clock. Drop this into a scene
 * INSTEAD of static <Sky>/<ambientLight>/<directionalLight>.
 */
export function SkyEnvironment({ fogNear = 60, fogFar = 140 }: Props) {
  const scene = useThree((s) => s.scene);
  const sunDirRef = useRef<DirectionalLight>(null);
  const moonDirRef = useRef<DirectionalLight>(null);
  const ambientRef = useRef<{ intensity: number; color: Color } | null>(null);
  const moonMeshRef = useRef<Mesh>(null);
  const moonGlowRef = useRef<Mesh>(null);
  // Drei's <Sky> exposes itself as a mesh; we mutate its material uniforms each frame.
  const skyRef = useRef<Mesh>(null);
  // Reusable color buffers (avoid GC each frame).
  const tmpColor = useMemo(() => new Color(), []);
  const sunVec = useMemo(() => new Vector3(), []);

  useFrame(() => {
    tickTime();
    const env = computeSkyEnv(time.get());

    // Sun directional light — anchored ~80m away from origin so shadow camera fits.
    const sun = sunDirRef.current;
    if (sun) {
      sun.position.set(env.sunDir[0] * 80, env.sunDir[1] * 80, env.sunDir[2] * 80);
      sun.intensity = env.sunIntensity;
      sun.color.set(env.sunColor);
      sun.visible = env.sunIntensity > 0.01;
    }
    // Moon directional — soft cool fill.
    const moon = moonDirRef.current;
    if (moon) {
      moon.position.set(env.moonDir[0] * 80, env.moonDir[1] * 80, env.moonDir[2] * 80);
      moon.intensity = env.moonIntensity;
      moon.color.set(env.moonColor);
      moon.visible = env.moonIntensity > 0.01;
    }
    // Ambient (mutated via scene userData — we render a real <ambientLight> below).
    if (ambientRef.current) {
      ambientRef.current.intensity = env.ambientIntensity;
      ambientRef.current.color.set(env.ambientColor);
    }
    // Sky uniforms.
    const skyMat = skyRef.current?.material as ShaderMaterial | undefined;
    if (skyMat?.uniforms?.sunPosition) {
      sunVec.set(env.sunDir[0], env.sunDir[1], env.sunDir[2]).multiplyScalar(450000);
      (skyMat.uniforms.sunPosition.value as Vector3).copy(sunVec);
    }
    // Moon mesh — billboarded above horizon when the moon side is up.
    if (moonMeshRef.current) {
      const m = moonMeshRef.current;
      m.position.set(env.moonDir[0] * 220, env.moonDir[1] * 220, env.moonDir[2] * 220);
      const vis = env.moonDir[1] > -0.1;
      m.visible = vis;
      if (vis) {
        const op = Math.max(0, env.moonDir[1] + 0.1) * 1.4;
        const mat = m.material as { opacity?: number };
        if (mat.opacity !== undefined) mat.opacity = Math.min(1, op);
      }
    }
    if (moonGlowRef.current) {
      moonGlowRef.current.position.set(
        env.moonDir[0] * 220,
        env.moonDir[1] * 220,
        env.moonDir[2] * 220,
      );
      moonGlowRef.current.visible = (moonMeshRef.current?.visible ?? false);
    }
    // Fog & background.
    if (!scene.fog) scene.fog = new Fog(env.fogColor, fogNear, fogFar);
    (scene.fog as Fog).color.set(env.fogColor);
    if (!scene.background) scene.background = new Color(env.bgColor);
    (scene.background as Color).set(env.bgColor);
    void tmpColor;
  });

  return (
    <group>
      {/* Daylight sky. We dim the sun via the directional light; the sky
          itself uses default scattering. */}
      <Sky ref={skyRef as unknown as React.Ref<typeof Sky>} distance={450000} sunPosition={[40, 50, 20]} turbidity={4} rayleigh={1.2} />

      <ambientLight
        ref={(o) => {
          ambientRef.current = o
            ? ({ intensity: o.intensity, color: o.color } as { intensity: number; color: Color })
            : null;
          // Re-bind so per-frame mutations hit the same object.
          if (o) ambientRef.current = o as unknown as { intensity: number; color: Color };
        }}
        intensity={0.4}
      />

      <directionalLight
        ref={sunDirRef}
        position={[30, 40, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
      />
      <directionalLight ref={moonDirRef} position={[-30, 40, 20]} intensity={0} color={"#9bb7ff"} />

      {/* Moon billboard (sphere with a soft halo) */}
      <mesh ref={moonMeshRef}>
        <sphereGeometry args={[7, 24, 24]} />
        <meshBasicMaterial color={"#f4f0e0"} transparent opacity={0.95} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={moonGlowRef}>
        <sphereGeometry args={[14, 24, 24]} />
        <meshBasicMaterial color={"#9bb7ff"} transparent opacity={0.18} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}