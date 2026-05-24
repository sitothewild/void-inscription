import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector2,
} from "three";
// keep Vector2 import used by shader uniform
import { useGame } from "@/game/store";
import { ISLAND_RADIUS, VILLAGE_RADIUS } from "@/game/constants";
import { heightAt, isOnRamp, isValidResourceSpot } from "@/game/terrain";
import { mulberry32 } from "@/game/rng";

const COUNT = 9000;

export function WindField() {
  const ref = useRef<InstancedMesh>(null);
  const plateaus = useGame((s) => s.plateaus);
  const seed = useGame((s) => s.seed);
  const phase = useGame((s) => s.phase);

  const geometry = useMemo(() => {
    // Tapered curved blade — wider at base, pinches toward tip, with bake-in curve.
    const SEG = 5;
    const H = 0.7;
    const g = new PlaneGeometry(0.11, H, 1, SEG);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new Color("#1f4a1c");
    const tip = new Color("#bde26a");
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + H / 2; // 0..H
      const t = y / H;
      // Taper width toward tip
      const x = pos.getX(i) * (1 - t * 0.85);
      // Slight forward curl baked into geometry
      const z = Math.pow(t, 2) * 0.12;
      pos.setX(i, x);
      pos.setZ(i, z);
      const c = base.clone().lerp(tip, t);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new BufferAttribute(colors, 3));
    g.translate(0, H / 2, 0); // pivot at base
    g.computeVertexNormals();
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: "#ffffff",
      vertexColors: true,
      side: DoubleSide,
      roughness: 0.85,
      metalness: 0,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWind = { value: new Vector2(1.0, 0.55) };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;
           uniform vec2 uWind;`
        )
        .replace(
          "#include <begin_vertex>",
          `vec3 transformed = vec3(position);
           vec3 wp = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
           float bend = smoothstep(0.0, 0.7, position.y);
           bend = bend * bend;
           float phase = uTime * 1.4 + wp.x * 0.32 + wp.z * 0.27;
           float gust = sin(uTime * 0.4 + wp.x * 0.035 + wp.z * 0.045) * 0.5 + 0.5;
           float w = sin(phase) * 0.55 + sin(phase * 1.9 + 1.3) * 0.35;
           float amp = 0.22 + gust * 0.55;
           transformed.x += w * bend * uWind.x * amp;
           transformed.z += w * bend * uWind.y * amp;
           transformed.y -= bend * abs(w) * 0.04;`
        );
      m.userData.shader = shader;
    };
    return m;
  }, []);

  // Cool down vertex tint at night by multiplying the base color.
  useEffect(() => {
    material.color = new Color(phase === "night" ? "#7a96b0" : "#ffffff");
    material.needsUpdate = true;
  }, [phase, material]);

  // Scatter blades across island
  useEffect(() => {
    if (!ref.current) return;
    const rng = mulberry32((seed ^ 0x91b3) >>> 0);
    const dummy = new Object3D();
    const color = new Color();
    let placed = 0;
    let attempts = 0;
    while (placed < COUNT && attempts < COUNT * 10) {
      attempts++;
      // Cluster around random anchors for natural density variation.
      const useCluster = rng() < 0.6;
      let x: number, z: number;
      if (useCluster) {
        const ca = rng() * Math.PI * 2;
        const cr = Math.sqrt(rng()) * (ISLAND_RADIUS - 2);
        const cx = Math.cos(ca) * cr;
        const cz = Math.sin(ca) * cr;
        const oa = rng() * Math.PI * 2;
        const orad = rng() * 1.4;
        x = cx + Math.cos(oa) * orad;
        z = cz + Math.sin(oa) * orad;
      } else {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 1.5);
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      if (Math.hypot(x, z) > ISLAND_RADIUS - 1) continue;
      if (Math.hypot(x, z) < VILLAGE_RADIUS + 0.4) continue;
      if (!isValidResourceSpot(x, z, plateaus) && !isOnRamp(x, z, plateaus)) {
        let onPlateau = false;
        for (const p of plateaus) {
          if (Math.hypot(x - p.cx, z - p.cz) < p.radius - 0.4) {
            onPlateau = true;
            break;
          }
        }
        if (!onPlateau) continue;
      }
      const y = heightAt(x, z, plateaus);
      const s = 0.65 + rng() * 1.1;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(0.85 + rng() * 0.7, s, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(placed, dummy.matrix);
      // Per-instance tint multiplier (cool/warm green variance)
      const t = rng();
      const warm = rng() < 0.15; // occasional warm/yellow tuft
      if (warm) color.setRGB(1.0, 0.95, 0.7);
      else color.setRGB(0.78 + t * 0.22, 0.92 + t * 0.08, 0.7 + t * 0.2);
      ref.current.setColorAt(placed, color);
      placed++;
    }
    ref.current.count = placed;
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [plateaus, seed]);

  useFrame((_, dt) => {
    const shader = material.userData.shader;
    if (shader) shader.uniforms.uTime.value += dt;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, COUNT]}
      castShadow={false}
      receiveShadow
      frustumCulled={false}
    />
  );
}