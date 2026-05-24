import { useGame } from "@/game/store";
import {
  WEAPONS,
  WEAPON_LABELS,
  LINK_LABELS,
  SHAMAN_COSTS,
  canAfford,
  formatCost,
  type WeaponKind,
} from "@/game/weapons";
import { dispatchAction } from "@/game/multiplayer";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function ShopPanel() {
  const openVendor = useGame((s) => s.openVendor);
  const close = useGame((s) => s.setOpenVendor);
  const inventory = useGame((s) => s.inventory);
  const day = useGame((s) => s.day);
  const phase = useGame((s) => s.phase);

  // Toast when weapon tier increases or hp/ward goes up after a shaman buy.
  const prevWeapons = useRef(inventory.weapons);
  const prevHp = useRef(useGame.getState().heroHp);
  const prevWard = useRef(inventory.seedWard);
  useEffect(() => {
    const w = inventory.weapons;
    (["sword", "bow", "hammer"] as const).forEach((k) => {
      if (w[k] > prevWeapons.current[k]) {
        toast.success(
          `Purchased ${WEAPON_LABELS[k][w[k] as 1 | 2 | 3]} (T${w[k]})`,
        );
      }
    });
    prevWeapons.current = w;
  }, [inventory.weapons]);
  useEffect(() => {
    if (inventory.seedWard > prevWard.current) {
      toast.success(`Seed Ward applied (+${inventory.seedWard - prevWard.current} Seed HP)`);
    }
    prevWard.current = inventory.seedWard;
  }, [inventory.seedWard]);
  // Detect mead via HP jumping while shop open
  useEffect(() => {
    const unsub = useGame.subscribe((s) => {
      if (s.heroHp > prevHp.current && s.openVendor === "shaman") {
        toast.success(`Drank Healing Mead (+${Math.round(s.heroHp - prevHp.current)} HP)`);
      }
      prevHp.current = s.heroHp;
    });
    return unsub;
  }, []);

  if (!openVendor) return null;

  const closedAtNight = phase === "night";

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[min(560px,92vw)] max-h-[85vh] overflow-y-auto rounded-lg border border-white/10 bg-neutral-900 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold capitalize">{openVendor}</h2>
          <button
            onClick={() => close(null)}
            className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            Close
          </button>
        </div>

        {closedAtNight ? (
          <p className="py-8 text-center text-white/60">Shop closed at night.</p>
        ) : openVendor === "smith" ? (
          <div className="space-y-4">
            {(Object.keys(WEAPONS) as WeaponKind[]).map((kind) => (
              <div key={kind} className="rounded border border-white/10 p-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-semibold capitalize">{kind}</span>
                  <span className="text-xs text-emerald-300">
                    Link: {LINK_LABELS[kind]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {WEAPONS[kind].map((w) => {
                    const cur = inventory.weapons[kind];
                    const owned = cur >= w.tier;
                    const needsPrev = cur < w.tier - 1;
                    const locked = day < w.minDay;
                    const afford = canAfford(w.cost, inventory);
                    const disabled = owned || needsPrev || locked || !afford;
                    return (
                      <div
                        key={w.tier}
                        className="flex flex-col gap-1 rounded bg-slate-800 p-2 text-xs"
                      >
                        <div className="font-semibold">
                          T{w.tier} {WEAPON_LABELS[kind][w.tier]}
                        </div>
                        <div className="text-white/60">{formatCost(w.cost)}</div>
                        {owned ? (
                          <div className="mt-auto rounded bg-emerald-700/60 px-2 py-1 text-center font-semibold text-emerald-100">
                            ✓ Owned
                          </div>
                        ) : (
                          <button
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              dispatchAction({ type: "buy-weapon", kind, tier: w.tier });
                            }}
                            className="mt-auto rounded bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-white/40"
                          >
                            {needsPrev
                              ? `Needs T${w.tier - 1}`
                              : locked
                                ? `Day ${w.minDay}+`
                                : !afford
                                  ? "Can't afford"
                                  : "Buy"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(Object.keys(SHAMAN_COSTS) as (keyof typeof SHAMAN_COSTS)[]).map(
              (item) => {
                const c = SHAMAN_COSTS[item];
                const afford = canAfford(c, inventory);
                return (
                  <div
                    key={item}
                    className="flex items-center justify-between gap-3 rounded bg-slate-800 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{c.label}</span>
                      <span className="text-xs text-white/60">{c.desc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/70">{formatCost(c)}</span>
                      <button
                        disabled={!afford}
                        onClick={() => dispatchAction({ type: "buy-shaman", item })}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-white/40"
                      >
                        {afford ? "Buy" : "Can't afford"}
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
