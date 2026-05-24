import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Points,
  ShaderMaterial,
} from "three";

type Props = {
  position: [number, number, number];
  /** Total cascade height (world units). */
  height: number;
  /** Y rotation aligning the fall with the river flow. */
  rotationY?: number;
  width?: number;
};

/**
 * Vertical scrolling-water plane plus a halo of mist particles. Drops from
 * `position` straight down for `height` meters.
 */
export function Waterfall({ position, height, rotationY = 0, width = 6 }: Props) {
  const sheetMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uTop: { value: new Color("#cbe7f5") },
          uBot: { value: new Color("#2a7aa0") },
          uFoam: { value: new Color("#ffffff") },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uTop;
          uniform vec3 uBot;
          uniform vec3 uFoam;
          varying vec2 vUv;
          // Cheap fractal stripes scrolling downward to suggest flowing water.
          float stripes(vec2 uv) {
            float v = 0.0;
            v += sin((uv.y * 18.0 + uTime * 4.0) + sin(uv.x * 11.0) * 1.4);
            v += 0.6 * sin((uv.y * 35.0 + uTime * 7.0) + sin(uv.x * 23.0) * 0.8);
            return 0.5 + 0.5 * v / 1.6;
          }
          void main() {
            float s = stripes(vUv);
            // Foam ring at the top lip and at the bottom plunge.
            float topFoam = smoothstep(0.98, 1.0, vUv.y);
            float botFoam = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.0, 0.08, vUv.y));
            vec3 base = mix(uBot, uTop, pow(vUv.y, 0.65));
            base = mix(base, uFoam, s * 0.35);
            base = mix(base, uFoam, topFoam * 0.9);
            base = mix(base, uFoam, botFoam * 0.7);
            // Slight horizontal taper so edges feather out.
            float edge = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
            float alpha = edge * (0.7 + s * 0.3);
            gl_FragColor = vec4(base, alpha);
          }
        `,
      }),
    [],
  );

  // Mist particles at the bottom of the falls.
  const MIST = 60;
  const mistRef = useRef<Points>(null);
  const mistGeom = useMemo(() => {
    const arr = new Float32Array(MIST * 3);
    for (let i = 0; i < MIST; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * width * 1.2;
      arr[i * 3 + 1] = Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(arr, 3));
    return g;
  }, [width]);

  useFrame((s) => {
    sheetMat.uniforms.uTime.value = s.clock.elapsedTime;
    const pts = mistRef.current;
    if (pts) {
      const attr = pts.geometry.getAttribute("position") as BufferAttribute;
      const a = attr.array as Float32Array;
      const t = s.clock.elapsedTime;
      for (let i = 0; i < MIST; i++) {
        a[i * 3 + 1] = ((a[i * 3 + 1] + 0.02) % 4) + Math.sin(t + i) * 0.01;
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, -height / 2, 0]} material={sheetMat}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <points ref={mistRef as never} geometry={mistGeom} position={[0, -height, 0]}>
        <pointsMaterial
          color={"#e6f4ff"}
          size={1.2}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
    </group>
  );
}