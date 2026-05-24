import { useGame } from "@/game/store";

export function Lighting() {
  const phase = useGame((s) => s.phase);
  const isDay = phase === "day";
  return (
    <>
      <ambientLight
        intensity={isDay ? 0.7 : 0.55}
        color={isDay ? "#ffffff" : "#9bb6ff"}
      />
      <directionalLight
        position={isDay ? [20, 30, 10] : [-15, 28, -8]}
        intensity={isDay ? 1.1 : 0.85}
        color={isDay ? "#fff4d6" : "#c8d8ff"}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      {!isDay && (
        <hemisphereLight args={["#bcd0ff", "#1a2030", 0.5]} />
      )}
      <fog attach="fog" args={[isDay ? "#cfeaff" : "#2b3a66", 45, 110]} />
    </>
  );
}