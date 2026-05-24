import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  type Points,
  ShaderMaterial,
} from "three";

type Props = {
  size?: number;
  y?: number;
  shoreRadius?: number;
};

/**
 * Big animated ocean disc with gerstner-ish wave displacement and
 * shoreline foam falloff (lighter color near the island center).
 */
export function Ocean({ size = 800, y = -0.3, shoreRadius = 95 }: Props) {
  const matRef = useRef<ShaderMaterial>(null!);
  const meshRef = useRef<Mesh>(null!);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: DoubleSide,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new Color("#0a3a66") },
          uShallow: { value: new Color("#3aa5d6") },
          uFoam: { value: new Color("#ffffff") },
          uShoreR: { value: shoreRadius },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          // Sum a few directional sine waves for richer crests.
          float waveSum(vec2 p, float t) {
            float w = 0.0;
            w += sin(dot(p, vec2(0.18, 0.04)) + t * 1.3) * 0.22;
            w += sin(dot(p, vec2(-0.09, 0.21)) + t * 1.05) * 0.18;
            w += sin(dot(p, vec2(0.07, -0.13)) + t * 0.8) * 0.14;
            w += sin(dot(p, vec2(0.31, 0.27)) + t * 1.6) * 0.07;
            return w;
          }
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            float w = waveSum(wp.xz, uTime);
            wp.y += w;
            vWorld = wp.xyz;
            vWave = w;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          uniform float uShoreR;
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          void main() {
            float d = length(vWorld.xz);
            // Distance to shoreline (negative outside, positive inside the band)
            float shoreDist = uShoreR - d;
            // Shallow band — broader, smoother gradient from deep to turquoise
            float shallow = smoothstep(-18.0, 4.0, shoreDist);
            vec3 base = mix(uDeep, uShallow, shallow);
            // Animated breaker foam right at the shore, plus a thinner trailing line
            float wob = sin(uTime * 2.2 + d * 0.7) * 0.6 + sin(uTime * 1.1 - d * 0.3) * 0.4;
            float crest = vWave + wob * 0.08;
            float breaker = smoothstep(-1.5, 1.5, shoreDist) * (1.0 - smoothstep(1.5, 5.0, shoreDist));
            float foam = breaker * (0.65 + 0.35 * smoothstep(-0.05, 0.18, crest));
            // Outer froth that drifts seaward
            float froth = smoothstep(-6.0, -1.0, shoreDist) * smoothstep(0.08, 0.22, vWave);
            foam = clamp(foam + froth * 0.4, 0.0, 1.0);
            vec3 col = mix(base, uFoam, foam);
            // Sparkle on open-water wave crests
            float openWater = 1.0 - smoothstep(-10.0, 0.0, shoreDist);
            float sparkle = smoothstep(0.18, 0.28, vWave) * openWater;
            col += sparkle * 0.3;
            gl_FragColor = vec4(col, 0.96);
          }
        `,
      }),
    [shoreRadius],
  );

  useFrame((s) => {
    material.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, y, 0]}
        receiveShadow
        material={material}
      >
        <planeGeometry args={[size, size, 192, 192]} />
      </mesh>
      <ShoreSplash radius={shoreRadius} y={y + 0.15} />
    </group>
  );
}

/**
 * Ring of bouncing white "splash" point sprites that hug the shoreline.
 * Each particle oscillates vertically on its own phase to suggest waves
 * breaking on the beach.
 */
function ShoreSplash({ radius, y, count = 360 }: { radius: number; y: number; count?: number }) {
  const ref = useRef<Points>(null!);
  const { geometry, phases, baseY, jitterR } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const by = new Float32Array(count);
    const jr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.04;
      const r = radius + (Math.random() - 0.5) * 2.5;
      positions[i * 3 + 0] = Math.cos(ang) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(ang) * r;
      ph[i] = Math.random() * Math.PI * 2;
      by[i] = y;
      jr[i] = r;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: g, phases: ph, baseY: by, jitterR: jr };
  }, [count, radius, y]);

  useFrame((s) => {
    const pts = ref.current;
    if (!pts) return;
    const t = s.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const p = phases[i];
      const bounce = Math.max(0, Math.sin(t * 2.4 + p));
      arr[i * 3 + 1] = baseY[i] + bounce * 0.9;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color={"#ffffff"}
        size={1.2}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
