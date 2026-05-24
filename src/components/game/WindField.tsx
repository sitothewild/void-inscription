import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector2,
} from "three";
import { useGame } from "@/game/store";
import { ISLAND_RADIUS, VILLAGE_RADIUS } from "@/game/constants";
import { heightAt, isOnRamp, isValidResourceSpot } from "@/game/terrain";
import { mulberry32 } from "@/game/rng";

const COUNT = 2400;

export function WindField() {
  const ref = useRef<InstancedMesh>(null);
  const plateaus = useGame((s) => s.plateaus);
  const seed = useGame((s) => s.seed);
  const phase = useGame((s) => s.phase);

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(0.09, 0.45, 1, 3);
    g.translate(0, 0.225, 0); // pivot at base
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: "#7fae4d",
      side: DoubleSide,
      roughness: 1,
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
           float bend = smoothstep(0.0, 0.45, position.y);
           float phase = uTime * 1.6 + wp.x * 0.32 + wp.z * 0.27;
           float gust = sin(uTime * 0.35 + wp.x * 0.04 + wp.z * 0.05) * 0.5 + 0.5;
           float w = sin(phase) * 0.55 + sin(phase * 1.9 + 1.3) * 0.35;
           float amp = 0.28 + gust * 0.55;
           transformed.x += w * bend * uWind.x * amp;
           transformed.z += w * bend * uWind.y * amp;
           transformed.y -= bend * abs(w) * 0.05;`
        );
      m.userData.shader = shader;
    };
    return m;
  }, []);

  // Tint color slightly toward bluish at night
  useEffect(() => {
    material.color = new Color(phase === "night" ? "#4a6a52" : "#7fae4d");
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
    while (placed < COUNT && attempts < COUNT * 8) {
      attempts++;
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (ISLAND_RADIUS - 1.5);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < VILLAGE_RADIUS + 0.4) continue;
      if (!isValidResourceSpot(x, z, plateaus) && !isOnRamp(x, z, plateaus)) {
        // allow grass on plateau tops too
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
      const s = 0.7 + rng() * 0.9;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(0.9 + rng() * 0.6, s, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(placed, dummy.matrix);
      const t = rng();
      color.setRGB(0.32 + t * 0.18, 0.55 + t * 0.22, 0.22 + t * 0.15);
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