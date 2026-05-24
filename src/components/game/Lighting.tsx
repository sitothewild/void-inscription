import { useGame } from "@/game/store";

export function Lighting() {
  const phase = useGame((s) => s.phase);
  const isDay = phase === "day";
  return (
    <>
      <ambientLight intensity={isDay ? 0.7 : 0.25} color={isDay ? "#ffffff" : "#5566aa"} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={isDay ? 1.1 : 0.3}
        color={isDay ? "#fff4d6" : "#8899ff"}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <color attach="background" args={[isDay ? "#9ed1ff" : "#1a2244"]} />
      <fog attach="fog" args={[isDay ? "#9ed1ff" : "#1a2244", 30, 80]} />
    </>
  );
}