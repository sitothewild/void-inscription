import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, X } from "lucide-react";
import { playerPos } from "@/game/inputStore";

const WORLD_SIZE = 2000; // matches Level1 useImageTerrain worldSize
const MAP_URL = "/maps/island_source.jpg";

/**
 * Press M to toggle a full-screen world map. Renders the source island
 * image with a live player marker.
 */
export function MapOverlay() {
  const [open, setOpen] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyM") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.code === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Animate the player dot without re-renders.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const d = dotRef.current;
      if (d) {
        const u = (playerPos.x + WORLD_SIZE / 2) / WORLD_SIZE; // 0..1 east
        const v = (playerPos.z + WORLD_SIZE / 2) / WORLD_SIZE; // 0..1 south
        d.style.left = `${u * 100}%`;
        d.style.top = `${v * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(86vh, 86vw)",
          height: "min(86vh, 86vw)",
          borderRadius: 14,
          overflow: "hidden",
          border: "2px solid #ffd86b88",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 0 40px #00000088",
          background: `#1a1a1a url(${MAP_URL}) center / cover no-repeat`,
        }}
      >
        {/* Title chip */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.6)",
            color: "white",
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <MapIcon size={14} /> World Map · 2 km × 2 km
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close map"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid #ffffff55",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        {/* Player marker */}
        <div
          ref={dotRef}
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            marginLeft: -8,
            marginTop: -8,
            borderRadius: "50%",
            background: "#ff5d6c",
            border: "2px solid white",
            boxShadow: "0 0 12px #ff5d6c, 0 0 24px #ff5d6caa",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.6)",
            color: "#ddd",
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
          }}
        >
          M or Esc to close
        </div>
      </div>
    </div>
  );
}