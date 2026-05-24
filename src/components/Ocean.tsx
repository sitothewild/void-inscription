import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, DoubleSide, Mesh } from "three";

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
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            float w1 = sin(wp.x * 0.08 + uTime * 1.2) * 0.18;
            float w2 = cos(wp.z * 0.11 + uTime * 0.9) * 0.22;
            float w3 = sin((wp.x + wp.z) * 0.05 + uTime * 0.7) * 0.12;
            float w = w1 + w2 + w3;
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
            // shore band: 0 in deep water, 1 right at shore
            float shore = 1.0 - smoothstep(uShoreR - 6.0, uShoreR + 2.0, d);
            shore = clamp(shore, 0.0, 1.0);
            // base color blends deep -> shallow as we approach shore
            vec3 base = mix(uDeep, uShallow, shore);
            // foam line that wobbles with waves near the shore band
            float foamBand = smoothstep(0.85, 1.0, shore + vWave * 0.6 + sin(uTime*2.0 + d*0.5)*0.05);
            vec3 col = mix(base, uFoam, foamBand * 0.85);
            // sparkle highlights on wave crests in open water
            float sparkle = smoothstep(0.18, 0.26, vWave) * (1.0 - shore);
            col += sparkle * 0.25;
            gl_FragColor = vec4(col, 0.95);
          }
        `,
      }),
    [shoreRadius],
  );

  useFrame((s) => {
    material.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, y, 0]}
      receiveShadow
      material={material}
    >
      <planeGeometry args={[size, size, 96, 96]} />
    </mesh>
  );
}
