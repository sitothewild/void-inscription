import { useEffect, useState } from "react";
import { Sword, Crosshair as Bow, Coins, X, User } from "lucide-react";
import {
  WEAPON_CATALOG,
  inventory,
  useInventory,
  type WeaponDef,
} from "@/game/inventory";

/**
 * Character + bag window. Press "I" to toggle. Left pane is the character
 * (with equipped weapon slots), right pane lists owned items.
 */
export function InventoryWindow() {
  const inv = useInventory();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "i" || e.key === "I") setOpen((o) => !o);
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const owned: WeaponDef[] = inv.owned
    .map((id) => WEAPON_CATALOG.find((w) => w.id === id))
    .filter((w): w is WeaponDef => !!w);

  const bow = inv.equipped.bow
    ? WEAPON_CATALOG.find((w) => w.id === inv.equipped.bow)
    : null;
  const sword = inv.equipped.sword
    ? WEAPON_CATALOG.find((w) => w.id === inv.equipped.sword)
    : null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 94vw)",
          maxHeight: "82vh",
          background: "linear-gradient(180deg, #161a22 0%, #0b0e14 100%)",
          border: "1px solid #2e3a4d",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          color: "#e7eef7",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #1f2837",
          }}
        >
          <div style={{ fontWeight: 600 }}>Inventory</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "ui-monospace, monospace" }}>
              <Coins size={16} color="#ffd86b" />
              <span>{inv.gold}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "1px solid #2e3a4d",
                color: "#e7eef7",
                borderRadius: 6,
                padding: 6,
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 0 }}>
          {/* Character pane */}
          <div style={{ padding: 18, borderRight: "1px solid #1f2837" }}>
            <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
              Character
            </div>
            <div
              style={{
                marginTop: 10,
                height: 220,
                background: "radial-gradient(circle at 50% 35%, #2a3650, #0d1320)",
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                border: "1px solid #1f2837",
              }}
            >
              <User size={84} color="#7faaff" />
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <EquippedSlot label="Bow" weapon={bow} />
              <EquippedSlot label="Sword" weapon={sword} />
            </div>
          </div>

          {/* Bag pane */}
          <div style={{ padding: 18, overflow: "auto", maxHeight: "70vh" }}>
            <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
              Bag · {owned.length} item{owned.length === 1 ? "" : "s"}
            </div>
            {owned.length === 0 ? (
              <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
                Your bag is empty. Visit the Blacksmith or the Scout to buy a weapon.
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                {owned.map((w) => {
                  const equipped = inv.equipped[w.kind] === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => inventory.equip(w.id)}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderRadius: 10,
                        background: equipped ? "#1a2236" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${equipped ? "#7faaff" : w.tier === 2 ? "#7fc7ff55" : "#2e3a4d"}`,
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: `${w.color}22`,
                          color: w.color,
                          display: "grid",
                          placeItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        {w.kind === "bow" ? <Bow size={18} /> : <Sword size={18} />}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{w.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        T{w.tier} · DMG {w.damage}
                      </div>
                      {equipped && (
                        <div style={{ fontSize: 10, color: "#7faaff", marginTop: 4 }}>EQUIPPED</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EquippedSlot({ label, weapon }: { label: string; weapon: WeaponDef | null | undefined }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid #1f2837",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: weapon ? `${weapon.color}22` : "#1a2030",
          color: weapon?.color ?? "#4a5b76",
          display: "grid",
          placeItems: "center",
        }}
      >
        {label === "Bow" ? <Bow size={18} /> : <Sword size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{weapon?.name ?? "— empty —"}</div>
      </div>
      {weapon && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>DMG {weapon.damage}</div>
      )}
    </div>
  );
}