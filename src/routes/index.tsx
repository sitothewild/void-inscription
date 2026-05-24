import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Game } from "@/components/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seed of Yggdrasil - Viking survival in your browser" },
      {
        name: "description",
        content:
          "A Tribe of Midgard-inspired isometric survival prototype built with Three.js. Gather by day, defend the Seed by night.",
      },
      { property: "og:title", content: "Seed of Yggdrasil" },
      {
        property: "og:description",
        content:
          "Isometric Viking survival prototype. Gather by day, defend the Seed by night.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white/60">
        Loading...
      </div>
    );
  }
  return <Game />;
}
