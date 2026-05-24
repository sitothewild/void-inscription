import { createFileRoute } from "@tanstack/react-router";
import { Scene } from "@/components/game/Scene";
import { HUD } from "@/components/hud/HUD";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play - Seed of Yggdrasil" },
      { name: "description", content: "Defend the Seed for five nights." },
    ],
  }),
  component: PlayPage,
  ssr: false,
});

function PlayPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Scene />
      <HUD />
    </div>
  );
}