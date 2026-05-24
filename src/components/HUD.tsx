import { TreePine, Mountain, Sparkles, Coins } from "lucide-react";
import { useCounts } from "@/game/world";
import { useInventory } from "@/game/inventory";

export function HUD() {
  const c = useCounts();
  const inv = useInventory();
  const item = (icon: React.ReactNode, n: number, color: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${color}66`,
        color: "white",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 13,
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span>{n}</span>
    </div>
  );
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        display: "flex",
        gap: 8,
        zIndex: 15,
        pointerEvents: "none",
      }}
    >
      {item(<TreePine size={16} />, c.wood, "#7ad97a")}
      {item(<Mountain size={16} />, c.stone, "#c0c0c0")}
      {item(<Sparkles size={16} />, c.herbs, "#c08aff")}
      {item(<Coins size={16} />, inv.gold, "#ffd86b")}
    </div>
  );
}