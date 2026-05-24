import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { useGame } from "@/game/store";

/**
 * Post-processing stack. Bloom punches the Seed's emissive crystal and
 * enemy eyes; vignette deepens during night for siege atmosphere.
 */
export function PostFX() {
  const phase = useGame((s) => s.phase);
  const isNight = phase === "night";
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={isNight ? 1.1 : 0.7}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.2}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <Vignette
        offset={0.25}
        darkness={isNight ? 0.75 : 0.45}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}