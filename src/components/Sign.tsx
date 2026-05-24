import { Suspense } from "react";
import { Billboard, Text } from "@react-three/drei";
import { GltfProp } from "./GltfProp";

type Props = {
  position: [number, number, number];
  rotationY?: number;
  label?: string;
  url?: string;
  scale?: number;
  /** Y offset for the floating label above the sign post. */
  labelHeight?: number;
};

/**
 * Wooden sign post with an optional billboarded text label so we can name
 * shops, gates, or districts without authoring per-sign textures.
 */
export function Sign({
  position,
  rotationY = 0,
  label,
  url = "/models/signs/Wooden_Sign.glb",
  scale = 1.4,
  labelHeight = 1.6,
}: Props) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Suspense fallback={null}>
        <GltfProp url={url} scale={scale} />
      </Suspense>
      {label ? (
        <Billboard position={[0, labelHeight, 0]}>
          <Text
            fontSize={0.32}
            color={"#fff2c8"}
            outlineColor={"#2a1a0a"}
            outlineWidth={0.03}
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        </Billboard>
      ) : null}
    </group>
  );
}