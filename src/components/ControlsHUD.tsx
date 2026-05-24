import { useEffect, useState } from "react";
import { Crosshair, Hand, ArrowUp, Map as MapIcon, Backpack, Plane } from "lucide-react";

/**
 * Desktop ability cluster, bottom-right. Mirrors the mobile touch buttons
 * but shows the keyboard binding instead. Hidden on touch / small screens
 * (TouchControls handles those).
 */
export function ControlsHUD() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setShow(!isTouch && window.innerWidth >= 900);
  }, []);
  if (!show) return null;

  const Item = ({
    icon,
    label,
    keyCap,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    keyCap: string;
    color: string;
  }) => (
    <div
      style={{
        position: "relative",
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: `2px solid ${color}aa`,
        background: `radial-gradient(circle, rgba(255,255,255,0.10), rgba(0,0,0,0.55))`,
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        fontFamily: "ui-monospace, monospace",
        fontSize: 9,
        gap: 2,
      }}
      title={label}
    >
      <span style={{ color }}>{icon}</span>
      <span
        style={{
          position: "absolute",
          bottom: -8,
          padding: "1px 6px",
          background: "rgba(0,0,0,0.85)",
          border: `1px solid ${color}66`,
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        {keyCap}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        display: "flex",
        gap: 14,
        alignItems: "flex-end",
        zIndex: 18,
        pointerEvents: "none",
      }}
    >
      <Item icon={<MapIcon size={22} />} label="World map" keyCap="M" color="#6aa6ff" />
      <Item icon={<Backpack size={22} />} label="Inventory" keyCap="I" color="#a26aff" />
      <Item icon={<Plane size={22} />} label="Admin / fly" keyCap="`" color="#7ae0a8" />
      <Item icon={<Hand size={22} />} label="Interact" keyCap="E" color="#ffe066" />
      <Item icon={<ArrowUp size={22} />} label="Jump" keyCap="Space" color="#ffd86b" />
      <Item icon={<Crosshair size={24} />} label="Shoot (hold = charge)" keyCap="LMB" color="#ffb060" />
    </div>
  );
}