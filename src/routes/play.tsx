import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useState } from "react";
import { z } from "zod";
import { HUD } from "@/components/hud/HUD";
import { Scene } from "@/components/game/Scene";
import { RoomBar } from "@/components/hud/RoomBar";
import { useMultiplayer } from "@/game/multiplayer";

const searchSchema = z.object({
  room: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play - Seed of Yggdrasil" },
      { name: "description", content: "Defend the Seed for five nights." },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
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