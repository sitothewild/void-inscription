import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/game/store";

export function RoomBar({ code }: { code: string }) {
  const isHost = useGame((s) => s.isHost);
  const players = useGame((s) => s.players);
  const selfName = useGame((s) => s.selfName);
  const selfColor = useGame((s) => s.selfColor);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pointer-events-auto absolute left-1/2 top-24 flex -translate-x-1/2 items-center gap-3 rounded-md bg-black/50 px-3 py-2 text-white backdrop-blur-sm">
      <button
        onClick={onCopy}
        title="Click to copy"
        className="font-mono text-lg font-bold tracking-[0.3em] hover:text-emerald-300"
      >
        {copied ? "Copied!" : code}
      </button>
      <div className="h-5 w-px bg-white/20" />
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: selfColor }}
          />
          {selfName} {isHost && <span className="text-emerald-300">(host)</span>}
        </span>
        {Object.entries(players).map(([id, p]) => (
          <span key={id} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </span>
        ))}
      </div>
      <div className="h-5 w-px bg-white/20" />
      <Link
        to="/"
        className="text-xs text-white/60 hover:text-white"
      >
        Leave
      </Link>
    </div>
  );
}