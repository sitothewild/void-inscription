import {
  DAY_DURATION,
  GATE_CLOSE_WARNING,
  HERO_MAX_HP,
  NIGHT_DURATION,
  SEED_MAX_HP,
} from "@/game/constants";
import { useGame } from "@/game/store";
import { dispatchAction } from "@/game/multiplayer";
import { computeLinks } from "@/game/weapons";
import { ShopPanel } from "./ShopPanel";

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-semibold text-white drop-shadow">
        <span>{label}</span>
        <span>{Math.ceil(value)} / {max}</span>
      </div>
      <div className="h-3 w-56 overflow-hidden rounded-sm border border-black/40 bg-black/60">
        <div className="h-full transition-[width] duration-150" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function HUD() {
  const { heroHp, seedHp, day, phase, phaseTime, inventory, status } = useGame();
  const doReset = () => dispatchAction({ type: "reset" });
  const phaseMax = phase === "day" ? DAY_DURATION : NIGHT_DURATION;
  const mm = Math.floor(phaseTime / 60);
  const ss = Math.floor(phaseTime % 60).toString().padStart(2, "0");
  const links = computeLinks(inventory.weapons);
  const activeLinks = Object.entries(links).filter(([, v]) => v).map(([k]) => k);
  const gatesClosing = phase === "day" && phaseTime <= GATE_CLOSE_WARNING;

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute left-4 top-4 flex flex-col gap-2 rounded-md bg-black/40 p-3 backdrop-blur-sm">
        <Bar label="Health" value={heroHp} max={HERO_MAX_HP} color="#e04040" />
        <Bar label="Seed of Yggdrasil" value={seedHp} max={SEED_MAX_HP} color="#3fa83f" />
        {inventory.seedWard > 0 && (
          <div className="text-xs text-cyan-300">Ward +{inventory.seedWard}</div>
        )}
      </div>

      <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-black/50 px-4 py-2 text-center backdrop-blur-sm">
        <div className="text-xs uppercase tracking-widest text-white/70">Day {day} · {phase}</div>
        <div className="font-mono text-2xl font-bold text-white">{mm}:{ss}</div>
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-white/20">
          <div className={phase === "day" ? "h-full bg-yellow-300" : "h-full bg-indigo-300"} style={{ width: `${(1 - phaseTime / phaseMax) * 100}%` }} />
        </div>
        {gatesClosing && (
          <div className="mt-1 animate-pulse text-xs font-bold text-red-400">Gates closing!</div>
        )}
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2 rounded-md bg-black/40 p-3 text-sm text-white backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-x-3 text-xs">
          <span>Wood {inventory.wood}</span>
          <span>Stone {inventory.stone}</span>
          <span>Herb {inventory.herb}</span>
          <span>Fang {inventory.fang}</span>
          {inventory.mythril > 0 && <span className="col-span-2 text-cyan-300">Mythril {inventory.mythril}</span>}
        </div>
        <div className="flex gap-1 text-xs">
          {(["sword", "bow", "hammer"] as const).map((k) => {
            const t = inventory.weapons[k];
            if (t === 0) return null;
            return (
              <span key={k} className="rounded bg-slate-600 px-2 py-0.5 capitalize">
                {k} T{t}
              </span>
            );
          })}
        </div>
        {activeLinks.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px]">
            {activeLinks.map((l) => (
              <span key={l} className="rounded bg-emerald-700/70 px-1.5 py-0.5 capitalize">{l}</span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 rounded bg-black/40 p-2 text-xs text-white/80 backdrop-blur-sm">
        WASD move · Mouse aim · Click attack · E to interact
      </div>

      <ShopPanel />

      {status !== "playing" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-lg bg-neutral-900 p-8 text-center text-white shadow-xl">
            <h2 className="mb-2 text-4xl font-bold">
              {status === "won" ? "Valhalla awaits!" : "The Seed has fallen..."}
            </h2>
            <p className="mb-6 text-white/70">
              {status === "won" ? "You survived all 5 nights." : `You held out for ${day} day${day === 1 ? "" : "s"}.`}
            </p>
            <button onClick={doReset} className="rounded bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500">Play again</button>
          </div>
        </div>
      )}
    </div>
  );
}
