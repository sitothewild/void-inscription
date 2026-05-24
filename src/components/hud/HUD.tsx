import {
  DAY_DURATION,
  HERO_MAX_HP,
  NIGHT_DURATION,
  SEED_MAX_HP,
} from "@/game/constants";
import { useGame } from "@/game/store";
import { dispatchAction } from "@/game/multiplayer";

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-semibold text-white drop-shadow">
        <span>{label}</span>
        <span>
          {Math.ceil(value)} / {max}
        </span>
      </div>
      <div className="h-3 w-56 overflow-hidden rounded-sm border border-black/40 bg-black/60">
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function HUD() {
  const { heroHp, seedHp, day, phase, phaseTime, inventory, status } =
    useGame();
  const doCraft = (item: "axe" | "sword" | "palisade") =>
    dispatchAction({ type: "craft", item });
  const doReset = () => dispatchAction({ type: "reset" });
  const phaseMax = phase === "day" ? DAY_DURATION : NIGHT_DURATION;
  const mm = Math.floor(phaseTime / 60);
  const ss = Math.floor(phaseTime % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute left-4 top-4 flex flex-col gap-2 rounded-md bg-black/40 p-3 backdrop-blur-sm">
        <Bar label="Health" value={heroHp} max={HERO_MAX_HP} color="#e04040" />
        <Bar label="Seed of Yggdrasil" value={seedHp} max={SEED_MAX_HP} color="#3fa83f" />
      </div>

      <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-black/50 px-4 py-2 text-center backdrop-blur-sm">
        <div className="text-xs uppercase tracking-widest text-white/70">
          Day {day} · {phase}
        </div>
        <div className="font-mono text-2xl font-bold text-white">
          {mm}:{ss}
        </div>
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-white/20">
          <div
            className={phase === "day" ? "h-full bg-yellow-300" : "h-full bg-indigo-300"}
            style={{ width: `${(1 - phaseTime / phaseMax) * 100}%` }}
          />
        </div>
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2 rounded-md bg-black/40 p-3 text-sm text-white backdrop-blur-sm">
        <div className="flex gap-3">
          <span>Wood {inventory.wood}</span>
          <span>Stone {inventory.stone}</span>
        </div>
        <div className="flex gap-1 text-xs">
          {inventory.axe && (
            <span className="rounded bg-amber-700 px-2 py-0.5">Axe</span>
          )}
          {inventory.sword && (
            <span className="rounded bg-slate-500 px-2 py-0.5">Sword</span>
          )}
          {inventory.palisade > 0 && (
            <span className="rounded bg-stone-600 px-2 py-0.5">
              Palisade x{inventory.palisade}
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-md bg-black/50 p-2 backdrop-blur-sm">
        <button
          disabled={inventory.axe || inventory.wood < 5 || inventory.stone < 2}
          onClick={() => doCraft("axe")}
          className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Axe (5W 2S)
        </button>
        <button
          disabled={inventory.sword || inventory.wood < 3 || inventory.stone < 5}
          onClick={() => doCraft("sword")}
          className="rounded bg-slate-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Sword (3W 5S)
        </button>
        <button
          disabled={inventory.wood < 4}
          onClick={() => doCraft("palisade")}
          className="rounded bg-stone-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Palisade (4W)
        </button>
      </div>

      <div className="absolute bottom-4 right-4 rounded bg-black/40 p-2 text-xs text-white/80 backdrop-blur-sm">
        WASD move - Mouse aim - Click attack/chop
      </div>

      {status !== "playing" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-lg bg-neutral-900 p-8 text-center text-white shadow-xl">
            <h2 className="mb-2 text-4xl font-bold">
              {status === "won" ? "Valhalla awaits!" : "The Seed has fallen..."}
            </h2>
            <p className="mb-6 text-white/70">
              {status === "won"
                ? "You survived all 5 nights."
                : `You held out for ${day} day${day === 1 ? "" : "s"}.`}
            </p>
            <button
              onClick={doReset}
              className="rounded bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}