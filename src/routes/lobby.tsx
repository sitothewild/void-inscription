import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { genRoomCode } from "@/lib/net/codec";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Co-op Lobby - Seed of Yggdrasil" },
      { name: "description", content: "Create or join a co-op room." },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Viking");
  const [code, setCode] = useState("");

  const onCreate = () => {
    const c = genRoomCode();
    localStorage.setItem("midgard.name", name || "Viking");
    navigate({ to: "/play", search: { room: c } });
  };
  const onJoin = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    localStorage.setItem("midgard.name", name || "Viking");
    navigate({ to: "/play", search: { room: c } });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0c1a2e] via-[#13294a] to-[#0c1a2e] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-20">
        <p className="mb-2 text-xs uppercase tracking-[0.4em] text-emerald-300/80">
          Co-op
        </p>
        <h1 className="mb-8 text-4xl font-black">Gather your tribe</h1>

        <label className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 16))}
          className="mb-8 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-lg outline-none focus:border-emerald-400"
          placeholder="Viking"
        />

        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-emerald-300">
            Create a room
          </h3>
          <p className="mb-4 text-sm text-white/60">
            You become the host. Share the room code with friends.
          </p>
          <button
            onClick={onCreate}
            className="w-full rounded-md bg-emerald-500 px-4 py-3 font-bold text-black hover:bg-emerald-400"
          >
            Create room
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-emerald-300">
            Join a room
          </h3>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="mb-3 w-full rounded-md border border-white/15 bg-white/5 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-emerald-400"
            placeholder="ABCDE"
          />
          <button
            onClick={onJoin}
            disabled={code.trim().length < 4}
            className="w-full rounded-md bg-white/10 px-4 py-3 font-bold hover:bg-white/20 disabled:opacity-40"
          >
            Join
          </button>
        </div>

        <p className="mt-8 text-xs text-amber-300/80">
          Co-op is experimental. Best with 2-4 players in the same region.
          Expect 100-300 ms latency. If the host leaves, the run ends.
        </p>
      </div>
    </div>
  );
}