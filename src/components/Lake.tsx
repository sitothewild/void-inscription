import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial, Vector2 } from "three";

type Props = {
  position: [number, number, number];
  radius: number;
};

/**
 * Flat circular freshwater body — fits in lake basins carved by the image map.
 * Uses the same Gerstner-wave look as the ocean but with a calmer, greener tint.
 */
export function Lake({ position, radius }: Props) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new Color("#0e2b3a") },
          uShallow: { value: new Color("#2c8aa6") },
          uFoam: { value: new Color("#e8f4ff") },
          uR: { value: radius },
          uCenter: { value: new Vector2(position[0], position[2]) },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          varying vec3 vNormal;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            float a = sin(uTime * 1.1 + wp.x * 0.18 + wp.z * 0.22) * 0.18;
            float b = sin(uTime * 1.7 + wp.x * 0.45) * 0.07;
            float h = a + b;
            wp.y += h;
            vWorld = wp.xyz;
            vWave = h;
            vec2 slope = vec2(
              cos(uTime * 1.1 + wp.x * 0.18 + wp.z * 0.22) * 0.18 * 0.18,
              cos(uTime * 1.1 + wp.x * 0.18 + wp.z * 0.22) * 0.18 * 0.22
            );
            vNormal = normalize(vec3(-slope.x, 1.0, -slope.y));
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          uniform float uR;
          uniform float uTime;
          uniform vec2 uCenter;
          varying vec3 vWorld;
          varying float vWave;
          varying vec3 vNormal;
          void main() {
            float d = length(vWorld.xz - uCenter);
            // Smooth edge fade so the lake blends into its basin.
            float edge = smoothstep(uR, uR - 8.0, d);
            vec3 base = mix(uDeep, uShallow, 0.35 + vWave * 0.6);
            vec3 viewDir = normalize(cameraPosition - vWorld);
            float fres = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0);
            base = mix(base, vec3(0.7, 0.85, 0.95), fres * 0.5);
            // Crest glint
            base += smoothstep(0.10, 0.25, vWave) * 0.1;
            // Shoreline foam
            float band = smoothstep(uR - 2.5, uR - 0.5, d) * (1.0 - smoothstep(uR - 0.5, uR + 0.5, d));
            float wob = 0.5 + 0.5 * sin(uTime * 2.0 + d * 0.8);
            base = mix(base, uFoam, band * wob * 0.8);
            gl_FragColor = vec4(base, edge * 0.95);
          }
        `,
      }),
    [radius],
  );

  useFrame((s) => {
    material.uniforms.uTime.value = s.clock.elapsedTime;
  });

  const ref = useRef<ShaderMaterial>(null);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      material={material}
      ref={ref as never}
    >
      <circleGeometry args={[radius, 64]} />
    </mesh>
  );
}