import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CanvasTexture,
  DoubleSide,
  Mesh,
  type Points,
  ShaderMaterial,
} from "three";

/** Soft circular gradient texture so point sprites are round, not blocky. */
function makeSoftCircleTexture(): CanvasTexture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new CanvasTexture(c);
}

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
          uDeep: { value: new Color("#03263f") },
          uMid: { value: new Color("#0d6a99") },
          uShallow: { value: new Color("#4ec9d6") },
          uFoam: { value: new Color("#ffffff") },
          uShoreR: { value: shoreRadius },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          varying vec3 vNormal;
          // Sum a few Gerstner-like directional waves and return both the
          // displacement and an approximate surface normal so the fragment
          // shader can do specular highlights.
          vec3 oceanSurface(vec2 p, float t, out vec3 normal) {
            // dir.xy = direction, dir.z = wavelength k, dir.w = speed
            vec4 waves[4];
            waves[0] = vec4( 0.80, 0.20, 0.18, 1.10);
            waves[1] = vec4(-0.30, 0.95, 0.26, 0.85);
            waves[2] = vec4( 0.55,-0.75, 0.42, 1.30);
            waves[3] = vec4(-0.85,-0.50, 0.65, 1.60);
            float h = 0.0;
            vec2 slope = vec2(0.0);
            for (int i = 0; i < 4; i++) {
              vec2 dir = normalize(waves[i].xy);
              float k = waves[i].z;
              float spd = waves[i].w;
              float amp = 0.35 / (1.0 + float(i) * 0.9);
              float phase = dot(dir, p) * k + t * spd;
              h += sin(phase) * amp;
              slope += dir * cos(phase) * amp * k;
            }
            normal = normalize(vec3(-slope.x, 1.0, -slope.y));
            return vec3(p.x, h, p.y);
          }
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vec3 n;
            vec3 surf = oceanSurface(wp.xz, uTime, n);
            wp.y += surf.y;
            vWorld = wp.xyz;
            vWave = surf.y;
            vNormal = n;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uDeep;
          uniform vec3 uMid;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          uniform float uShoreR;
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          varying vec3 vNormal;
          void main() {
            float d = length(vWorld.xz);
            float shoreDist = uShoreR - d; // > 0 outside island, < 0 over land

            // Three-stop depth gradient: deep navy -> mid blue -> shallow turquoise
            float shallow = smoothstep(-22.0, 6.0, shoreDist);
            float mid = smoothstep(-60.0, -10.0, shoreDist);
            vec3 base = mix(uDeep, uMid, mid);
            base = mix(base, uShallow, shallow);

            // Fresnel — water looks like sky at grazing angles, deeper from above.
            vec3 viewDir = normalize(cameraPosition - vWorld);
            float fres = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0);
            vec3 skyTint = vec3(0.62, 0.78, 0.92);
            vec3 col = mix(base, skyTint, fres * 0.55);

            // Specular sun glint
            vec3 sunDir = normalize(vec3(0.35, 0.85, 0.40));
            float spec = pow(max(dot(reflect(-sunDir, vNormal), viewDir), 0.0), 64.0);
            col += spec * 0.9;

            // Gentle crest brightening so waves catch the light
            col += smoothstep(0.10, 0.30, vWave) * 0.08;

            // Shoreline foam — a soft animated band right at the beach, no
            // hard stripes. Faint outer wash that drifts seaward.
            float band = exp(-pow((shoreDist - 0.5) / 2.2, 2.0));
            float wob = 0.5 + 0.5 * sin(uTime * 1.8 + d * 0.55 + vWave * 4.0);
            float foam = band * (0.55 + 0.45 * wob);
            float wash = smoothstep(-5.0, -1.0, shoreDist) * (1.0 - smoothstep(-1.0, 2.5, shoreDist));
            foam = clamp(foam + wash * 0.35 * wob, 0.0, 1.0);
            col = mix(col, uFoam, foam * 0.9);

            gl_FragColor = vec4(col, 0.97);
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
        <planeGeometry args={[size, size, 256, 256]} />
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
function ShoreSplash({ radius, y, count = 520 }: { radius: number; y: number; count?: number }) {
  const ref = useRef<Points>(null!);
  const sprite = useMemo(() => makeSoftCircleTexture(), []);
  const { geometry, phases, baseY, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const by = new Float32Array(count);
    const sp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.02;
      const r = radius + (Math.random() - 0.5) * 3.5;
      positions[i * 3 + 0] = Math.cos(ang) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(ang) * r;
      ph[i] = Math.random() * Math.PI * 2;
      by[i] = y + (Math.random() - 0.5) * 0.05;
      sp[i] = 1.6 + Math.random() * 1.4;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: g, phases: ph, baseY: by, speeds: sp };
  }, [count, radius, y]);

  useFrame((s) => {
    const pts = ref.current;
    if (!pts) return;
    const t = s.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      // Cubic ease on the upper half of a sine — quick burst, soft fall.
      const s01 = Math.max(0, Math.sin(t * speeds[i] + phases[i]));
      const bounce = s01 * s01 * (3 - 2 * s01);
      arr[i * 3 + 1] = baseY[i] + bounce * 0.55;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color={"#ffffff"}
        size={0.55}
        map={sprite}
        alphaTest={0.01}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
