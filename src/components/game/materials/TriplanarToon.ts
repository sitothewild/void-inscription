import {
  Color,
  DoubleSide,
  ShaderMaterial,
  Vector3,
} from "three";

/**
 * Stylized triplanar + cel-shaded material.
 * Top-facing normals sample a grass color ramp; side-facing normals sample
 * a darker rocky cliff ramp. Quantized N·L produces toon bands; a Fresnel
 * rim brightens silhouettes.
 */
export function createTriplanarToon(opts?: {
  grassA?: string;
  grassB?: string;
  cliffA?: string;
  cliffB?: string;
  rimColor?: string;
}) {
  return new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    uniforms: {
      uGrassA: { value: new Color(opts?.grassA ?? "#3f7a2f") },
      uGrassB: { value: new Color(opts?.grassB ?? "#7fc14a") },
      uCliffA: { value: new Color(opts?.cliffA ?? "#5a4838") },
      uCliffB: { value: new Color(opts?.cliffB ?? "#8a7560") },
      uRimColor: { value: new Color(opts?.rimColor ?? "#fff3c2") },
      uSunDir: { value: new Vector3(0.6, 1, 0.4).normalize() },
      uTime: { value: 0 },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uGrassA; uniform vec3 uGrassB;
      uniform vec3 uCliffA; uniform vec3 uCliffB;
      uniform vec3 uRimColor;
      uniform vec3 uSunDir;
      uniform float uTime;
      uniform float uFade;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;

      // cheap hash noise for color variation
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main(){
        vec3 n = normalize(vWorldNormal);
        // Triplanar weights: heavily prefer top vs sides
        vec3 w = pow(abs(n), vec3(4.0));
        w /= (w.x + w.y + w.z);
        // Grass color (top) with noise variation
        float gn = noise(vWorldPos.xz * 0.35);
        vec3 grass = mix(uGrassA, uGrassB, gn);
        // Cliff stripes from world Y for stratification
        float strat = sin(vWorldPos.y * 3.2) * 0.5 + 0.5;
        float cn = noise(vWorldPos.xz * 0.7 + vWorldPos.y);
        vec3 cliff = mix(uCliffA, uCliffB, strat * 0.5 + cn * 0.5);
        // Blend: top weight → grass, side weight → cliff
        vec3 base = grass * w.y + cliff * (w.x + w.z);

        // Toon banded lighting
        float ndl = max(dot(n, normalize(uSunDir)), 0.0);
        float band = floor(ndl * 3.0) / 3.0;
        vec3 lit = base * (0.55 + band * 0.55);

        // Fresnel rim
        float fres = pow(1.0 - max(dot(n, vViewDir), 0.0), 3.0);
        lit += uRimColor * fres * 0.35;

        gl_FragColor = vec4(lit, uFade);
      }
    `,
  });
}

export type TriplanarToonMaterial = ReturnType<typeof createTriplanarToon>;