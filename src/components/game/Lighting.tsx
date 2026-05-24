import { useGame } from "@/game/store";

export function Lighting() {
  const phase = useGame((s) => s.phase);
  const isDay = phase === "day";
  return (
    <>
      <ambientLight
        intensity={isDay ? 0.55 : 0.45}
        color={isDay ? "#fff6e0" : "#9bb6ff"}
      />
      <directionalLight
        position={isDay ? [20, 30, 10] : [-15, 28, -8]}
        intensity={isDay ? 1.4 : 0.9}
        color={isDay ? "#fff1c2" : "#c8d8ff"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <hemisphereLight
        args={isDay ? ["#bfe1ff", "#5b8a3a", 0.55] : ["#7d96d8", "#1a2030", 0.5]}
      />
      <fog attach="fog" args={[isDay ? "#d8efff" : "#2b3a66", 55, 130]} />
    </>
  );
}