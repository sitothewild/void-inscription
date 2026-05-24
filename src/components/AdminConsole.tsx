import { useEffect, useState } from "react";
import { Plane, Gauge } from "lucide-react";
import { admin, useAdmin } from "@/game/admin";

/**
 * Admin / debug console. Toggle visibility with the backtick (`) key.
 * Provides a flight toggle. While flying:
 *   - WASD moves horizontally
 *   - Ctrl = ascend, Alt = descend
 *   - Mouse wheel = increase / decrease fly speed
 */
export function AdminConsole() {
  const [open, setOpen] = useState(false);
  const s = useAdmin();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Backquote" && !e.repeat) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.code === "KeyF" && e.altKey && !e.repeat) {
        e.preventDefault();
        admin.toggleFlying();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Mouse wheel adjusts fly speed while flying (anywhere on screen).
  useEffect(() => {
    if (!s.flying) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      admin.bumpSpeed(e.deltaY < 0 ? +2 : -2);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [s.flying]);

  return (
    <>
      {/* Persistent fly indicator */}
      {s.flying && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(20,40,80,0.7)",
            border: "1px solid #6aa6ffaa",
            color: "#cfe1ff",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 25,
            pointerEvents: "none",
          }}
        >
          <Plane size={14} /> FLY · {s.flySpeed.toFixed(0)} u/s ·
          Ctrl ↑ / Alt ↓ · Wheel speed
        </div>
      )}

      {open && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: 12,
            width: 280,
            padding: 14,
            borderRadius: 10,
            background: "rgba(0,0,0,0.78)",
            border: "1px solid #ffffff22",
            color: "white",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            zIndex: 30,
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.8 }}>
            ADMIN CONSOLE
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
              background: s.flying ? "#1e3a6e" : "#1a1a1a",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={s.flying}
              onChange={(e) => admin.setFlying(e.target.checked)}
            />
            <Plane size={14} /> Enable flight
          </label>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.85,
            }}
          >
            <Gauge size={14} /> Fly speed
            <input
              type="range"
              min={2}
              max={120}
              step={1}
              value={s.flySpeed}
              onChange={(e) => admin.setSpeed(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 32, textAlign: "right" }}>
              {s.flySpeed.toFixed(0)}
            </span>
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, lineHeight: 1.5 }}>
            <div>` toggle console · Alt+F toggle flight</div>
            <div>Ctrl ↑ · Alt ↓ · Wheel = speed</div>
          </div>
        </div>
      )}
    </>
  );
}