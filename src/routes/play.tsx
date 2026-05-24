import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HUD } from "@/components/hud/HUD";
import { Scene } from "@/components/game/Scene";
import { RoomBar } from "@/components/hud/RoomBar";
import { TouchControls } from "@/components/hud/TouchControls";
import { useMultiplayer } from "@/game/multiplayer";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play - Seed of Yggdrasil" },
      { name: "description", content: "Defend the Seed for five nights." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search.room === "string" ? search.room : undefined,
  }),
  component: PlayPage,
});

function PlayPage() {
  const { room } = Route.useSearch();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("Viking");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setName(localStorage.getItem("midgard.name") || "Viking");
    }
  }, []);

  useMultiplayer(mounted && room ? room : null, name);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {mounted ? (
        <>
          <Scene />
          <HUD />
          <TouchControls />
          {room && <RoomBar code={room} />}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/60">
          Loading Midgard...
        </div>
      )}
    </div>
  );
}