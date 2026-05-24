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
import { Orb } from "./Orb";

const RESOURCE_ICONS: Record<string, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
  fang: "🦷",
  mythril: "✨",
};

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 " +
        className
      }
    >
      {children}
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
  const phasePct = Math.max(0, Math.min(1, 1 - phaseTime / phaseMax));

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top center: phase clock */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <GlassPanel className="min-w-[220px] px-5 py-2 text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
            <span>{phase === "day" ? "☀" : "🌙"}</span>
            <span>Day {day}</span>
            <span className="text-white/30">·</span>
            <span className={phase === "day" ? "text-amber-300" : "text-indigo-300"}>{phase}</span>
          </div>
          <div className="font-mono text-3xl font-bold tracking-wider text-white drop-shadow">
            {mm}:{ss}
          </div>
          <div className="relative mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              className={
                "h-full rounded-full transition-[width] duration-300 " +
                (phase === "day"
                  ? "bg-gradient-to-r from-amber-300 to-orange-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                  : "bg-gradient-to-r from-indigo-300 to-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]")
              }
              style={{ width: `${phasePct * 100}%` }}
            />
          </div>
          {gatesClosing && (
            <div className="mt-1.5 animate-pulse text-[11px] font-bold uppercase tracking-widest text-red-400">
              ⚠ Gates closing
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Top right: resources + weapons + links */}
      <div className="absolute right-4 top-4 w-64">
        <GlassPanel>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-white/90">
            {(["wood", "stone", "herb", "fang"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between rounded-md bg-black/25 px-2 py-1">
                <span className="flex items-center gap-1.5 capitalize text-white/70">
                  <span>{RESOURCE_ICONS[k]}</span>
                  {k}
                </span>
                <span className="font-mono font-semibold tabular-nums">{inventory[k]}</span>
              </div>
            ))}
            {inventory.mythril > 0 && (
              <div className="col-span-2 flex items-center justify-between rounded-md bg-cyan-500/20 px-2 py-1 text-cyan-200">
                <span className="flex items-center gap-1.5">
                  <span>{RESOURCE_ICONS.mythril}</span>
                  Mythril
                </span>
                <span className="font-mono font-semibold tabular-nums">{inventory.mythril}</span>
              </div>
            )}
          </div>
          {(["sword", "bow", "hammer"] as const).some((k) => inventory.weapons[k] > 0) && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-2">
              {(["sword", "bow", "hammer"] as const).map((k) => {
                const t = inventory.weapons[k];
                if (t === 0) return null;
                return (
                  <span
                    key={k}
                    className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-amber-200"
                  >
                    {k} T{t}
                  </span>
                );
              })}
            </div>
          )}
          {activeLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {activeLinks.map((l) => (
                <span
                  key={l}
                  className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-emerald-200"
                >
                  ⚡ {l}
                </span>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Bottom left: HP + Seed orbs (Diablo-style) */}
      <div className="absolute bottom-4 left-4 flex items-end gap-4">
        <Orb value={heroHp} max={HERO_MAX_HP} label="Health" hue="crimson" />
        <Orb
          value={seedHp + inventory.seedWard}
          max={SEED_MAX_HP + inventory.seedWard}
          label="Yggdrasil"
          hue="emerald"
        />
        {inventory.seedWard > 0 && (
          <div className="mb-7 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200 backdrop-blur-md">
            Ward +{inventory.seedWard}
          </div>
        )}
      </div>

      {/* Bottom right: controls hint */}
      <div className="absolute bottom-4 right-4">
        <GlassPanel className="px-3 py-2 text-[11px] text-white/70">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-[10px]">WASD</kbd> move</span>
            <span><kbd className="rounded border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-[10px]">Click</kbd> attack</span>
            <span><kbd className="rounded border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-[10px]">E</kbd> interact</span>
          </div>
        </GlassPanel>
      </div>

      <ShopPanel />

      {status !== "playing" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-10 text-center text-white shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <h2 className={"mb-3 text-5xl font-bold tracking-tight " + (status === "won" ? "text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" : "text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]")}>
              {status === "won" ? "Valhalla awaits!" : "The Seed has fallen..."}
            </h2>
            <p className="mb-8 text-white/70">
              {status === "won" ? "You survived all 5 nights." : `You held out for ${day} day${day === 1 ? "" : "s"}.`}
            </p>
            <button
              onClick={doReset}
              className="rounded-lg border border-emerald-400/50 bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3 font-semibold uppercase tracking-widest shadow-[0_8px_24px_rgba(16,185,129,0.4)] transition hover:from-emerald-400 hover:to-emerald-600"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
