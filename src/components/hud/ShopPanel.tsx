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

export function ShopPanel() {
  const openVendor = useGame((s) => s.openVendor);
  const close = useGame((s) => s.setOpenVendor);
  const inventory = useGame((s) => s.inventory);
  const day = useGame((s) => s.day);
  const phase = useGame((s) => s.phase);
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
                      <button
                        key={w.tier}
                        disabled={disabled}
                        onClick={() =>
                          dispatchAction({
                            type: "buy-weapon",
                            kind,
                            tier: w.tier,
                          })
                        }
                        className="rounded bg-slate-700 px-2 py-2 text-left text-xs hover:bg-slate-600 disabled:opacity-40"
                      >
                        <div className="font-semibold">
                          T{w.tier} {WEAPON_LABELS[kind][w.tier]}
                        </div>
                        <div className="text-white/60">{formatCost(w.cost)}</div>
                        {owned && (
                          <div className="text-emerald-300">Owned</div>
                        )}
                        {!owned && needsPrev && (
                          <div className="text-amber-400">Needs T{w.tier - 1}</div>
                        )}
                        {!owned && !needsPrev && locked && (
                          <div className="text-amber-400">Day {w.minDay}+</div>
                        )}
                      </button>
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
                  <button
                    key={item}
                    disabled={!afford}
                    onClick={() => dispatchAction({ type: "buy-shaman", item })}
                    className="flex w-full items-center justify-between rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-40"
                  >
                    <span>
                      <span className="font-semibold">{c.label}</span>{" "}
                      <span className="text-white/60">— {c.desc}</span>
                    </span>
                    <span className="text-xs text-white/70">{formatCost(c)}</span>
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
