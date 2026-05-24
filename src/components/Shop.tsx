import { useEffect, useState } from "react";
import { Sword, Crosshair as Bow, Coins, X } from "lucide-react";
import {
  WEAPON_CATALOG,
  inventory,
  useInventory,
  useNearbyVendor,
  type WeaponDef,
} from "@/game/inventory";
import { onEdge } from "@/game/inputStore";

/**
 * Vendor shop window. Opens when the player presses "E" / "action" while
 * standing near a vendor. Lists only the weapons that vendor sells, grouped
 * by tier.
 */
export function Shop() {
  const nearby = useNearbyVendor();
  const inv = useInventory();
  const [openVendor, setOpenVendor] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Toggle shop with E / action edge — only when a vendor is in range.
  useEffect(() => {
    return onEdge("action", () => {
      setOpenVendor((cur) => {
        if (cur) return null;
        const v = inventory.get();
        void v;
        return null; // updated by effect below using latest nearby
      });
    });
  }, []);
  // Use a ref-like effect to honour latest nearby vendor.
  useEffect(() => {
    const off = onEdge("action", () => {
      if (openVendor) {
        setOpenVendor(null);
      } else if (nearby) {
        setOpenVendor(nearby.label);
      }
    });
    return off;
  }, [nearby, openVendor]);

  // Auto-close if we walked away from the vendor we were trading with.
  useEffect(() => {
    if (openVendor && (!nearby || nearby.label !== openVendor)) {
      setOpenVendor(null);
    }
  }, [nearby, openVendor]);

  // ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openVendor) setOpenVendor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openVendor]);

  // Floating "Press E" prompt when near a vendor.
  if (!openVendor) {
    if (!nearby) return null;
    return (
      <div
        style={{
          position: "fixed",
          bottom: 110,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "8px 14px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          border: "1px solid rgba(255,216,107,0.6)",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          zIndex: 30,
          pointerEvents: "none",
          boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
        }}
      >
        Press <b style={{ color: "#ffd86b" }}>E</b> to trade with {nearby.label}
      </div>
    );
  }

  const items = WEAPON_CATALOG.filter((w) => w.vendor === openVendor);
  const tier1 = items.filter((w) => w.tier === 1);
  const tier2 = items.filter((w) => w.tier === 2);

  const buy = (w: WeaponDef) => {
    const res = inventory.buy(w.id);
    setFlash(res.ok ? `Purchased ${w.name}` : (res.reason ?? "Cannot buy"));
    setTimeout(() => setFlash(null), 1600);
  };

  return (
    <div
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
      onClick={() => setOpenVendor(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)",
          maxHeight: "82vh",
          overflow: "auto",
          background: "linear-gradient(180deg, #1c1410 0%, #0f0b08 100%)",
          border: "1px solid #6b4a23",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          color: "#f5e9d2",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #3a2a18",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{openVendor}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>“What’ll it be, friend?”</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              <Coins size={16} color="#ffd86b" />
              <span>{inv.gold}</span>
            </div>
            <button
              onClick={() => setOpenVendor(null)}
              style={{
                background: "transparent",
                border: "1px solid #6b4a23",
                color: "#f5e9d2",
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

        <ShopSection title="Tier I — Apprentice" items={tier1} inv={inv} onBuy={buy} />
        <ShopSection title="Tier II — Journeyman" items={tier2} inv={inv} onBuy={buy} />

        {flash && (
          <div
            style={{
              padding: "10px 18px",
              borderTop: "1px solid #3a2a18",
              fontSize: 13,
              color: "#ffd86b",
            }}
          >
            {flash}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopSection({
  title,
  items,
  inv,
  onBuy,
}: {
  title: string;
  items: WeaponDef[];
  inv: ReturnType<typeof useInventory>;
  onBuy: (w: WeaponDef) => void;
}) {
  if (!items.length) return null;
  return (
    <section style={{ padding: "12px 18px" }}>
      <h3 style={{ fontSize: 13, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{title}</h3>
      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {items.map((w) => {
          const owned = inv.owned.includes(w.id);
          const canAfford = inv.gold >= w.price;
          return (
            <div
              key={w.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${w.tier === 2 ? "#7fc7ff55" : "#6b4a2355"}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: `${w.color}22`,
                  display: "grid",
                  placeItems: "center",
                  color: w.color,
                  flexShrink: 0,
                }}
              >
                {w.kind === "bow" ? <Bow size={22} /> : <Sword size={22} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{w.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{w.description}</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>DMG {w.damage}</div>
              </div>
              <button
                disabled={owned || !canAfford}
                onClick={() => onBuy(w)}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #6b4a23",
                  background: owned
                    ? "#2a2418"
                    : canAfford
                      ? "linear-gradient(180deg, #c98b3b, #8a5a22)"
                      : "#2a2418",
                  color: owned || !canAfford ? "#7d6c4d" : "#fff5dd",
                  fontWeight: 600,
                  cursor: owned || !canAfford ? "not-allowed" : "pointer",
                }}
              >
                {owned ? (
                  "Owned"
                ) : (
                  <>
                    <Coins size={14} />
                    {w.price}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}