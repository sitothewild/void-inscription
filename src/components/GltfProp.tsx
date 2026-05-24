import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { SkeletonUtils } from "three-stdlib";

type Props = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
};

/**
 * Lightweight GLB instancer. Clones the scene so the same URL can render
 * many times without sharing transforms. Walks meshes once to enable
 * shadows.
 */
export function GltfProp({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  castShadow = true,
  receiveShadow = true,
}: Props) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(gltf.scene);
    c.traverse((o) => {
      // @ts-expect-error three typing
      if (o.isMesh) {
        o.castShadow = castShadow;
        o.receiveShadow = receiveShadow;
      }
    });
    return c;
  }, [gltf.scene, castShadow, receiveShadow]);
  const s: [number, number, number] =
    typeof scale === "number" ? [scale, scale, scale] : scale;
  return <primitive object={cloned} position={position} rotation={rotation} scale={s} />;
}