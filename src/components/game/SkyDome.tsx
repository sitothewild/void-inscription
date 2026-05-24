import { useMemo } from "react";
import { BackSide, Color, ShaderMaterial, SphereGeometry } from "three";
import { useGame } from "@/game/store";

export function SkyDome() {
  const phase = useGame((s) => s.phase);

  const geometry = useMemo(() => new SphereGeometry(180, 32, 16), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new Color("#7ec3ff") },
          uMid: { value: new Color("#cfeaff") },
          uBot: { value: new Color("#f7e6c1") },
        },
        vertexShader: `
          varying vec3 vPos;
          void main(){
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vPos;
          uniform vec3 uTop;
          uniform vec3 uMid;
          uniform vec3 uBot;
          void main(){
            float h = normalize(vPos).y * 0.5 + 0.5;
            vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.55, h));
            c = mix(c, uTop, smoothstep(0.45, 1.0, h));
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    []
  );

  if (phase === "night") {
    material.uniforms.uTop.value = new Color("#0a1230");
    material.uniforms.uMid.value = new Color("#1d2a5a");
    material.uniforms.uBot.value = new Color("#3a3a6e");
  } else {
    material.uniforms.uTop.value = new Color("#5fa9f0");
    material.uniforms.uMid.value = new Color("#bfe1ff");
    material.uniforms.uBot.value = new Color("#fbe6c4");
  }

  return <mesh args={[geometry, material]} frustumCulled={false} />;
}