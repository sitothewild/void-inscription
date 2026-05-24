import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from "three";
import { useGame } from "@/game/store";
import { ISLAND_RADIUS } from "@/game/constants";
import { mulberry32 } from "@/game/rng";

const COUNT = 220;

// Drifting wind motes / leaves that swirl across the island.
export function WindParticles() {
  const ref = useRef<Points>(null);
  const phase = useGame((s) => s.phase);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const rng = mulberry32(0xc0ffee);
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (ISLAND_RADIUS + 4);
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0.5 + rng() * 4.5;
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = rng();
    }
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return g;
  }, []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color("#e9f5c8") },
        uSize: { value: 18 },
        uBound: { value: ISLAND_RADIUS + 6 },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uSize;
        uniform float uBound;
        varying float vAlpha;
        void main(){
          vec3 p = position;
          float t = uTime * (0.6 + aSeed * 0.6) + aSeed * 12.0;
          // wind drifts in +X / +Z, with sinusoidal sway
          p.x = mod(p.x + uTime * (2.0 + aSeed * 1.2) + uBound, uBound * 2.0) - uBound;
          p.z += sin(t) * 1.2;
          p.y += sin(t * 1.4 + aSeed * 6.28) * 0.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (1.0 / -mv.z) * (0.6 + aSeed * 0.8);
          float d = length(p.xz) / uBound;
          vAlpha = smoothstep(1.0, 0.4, d);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float a = smoothstep(0.5, 0.0, length(c));
          gl_FragColor = vec4(uColor, a * vAlpha * 0.7);
        }
      `,
    });
  }, []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });

  // Cooler-toned motes at night
  material.uniforms.uColor.value =
    phase === "night" ? new Color("#a8c4ff") : new Color("#f3f7c8");

  return <points ref={ref} args={[geometry, material]} frustumCulled={false} />;
}