import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HUD } from "@/components/hud/HUD";
import { Scene } from "@/components/game/Scene";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play - Seed of Yggdrasil" },
      { name: "description", content: "Defend the Seed for five nights." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {mounted ? (
        <>
          <Scene />
          <HUD />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/60">
          Loading Midgard...
        </div>
      )}
    </div>
  );
}