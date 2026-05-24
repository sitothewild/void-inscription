import { TreePine, Mountain, Sparkles, Coins, Heart, Sun, Moon } from "lucide-react";
import { useCounts } from "@/game/world";
import { useInventory } from "@/game/inventory";
import { useHealth } from "@/game/health";
import { useGameTime } from "@/game/time";

export function HUD() {
  const c = useCounts();
  const inv = useInventory();
  const player = useHealth("player");
  const t = useGameTime();
  const isDay = t > 0.22 && t < 0.78;
  const hours = Math.floor(t * 24);
  const mins = Math.floor((t * 24 * 60) % 60);
  const clock = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid #ffffff33",
          color: "white",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
        }}
      >
        <span style={{ color: isDay ? "#ffd86b" : "#9bb7ff" }}>
          {isDay ? <Sun size={16} /> : <Moon size={16} />}
        </span>
        <span>{clock}</span>
      </div>

      {/* Player health bar pinned to top-left of the cluster. */}
      {player && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid #ff5d6c66",
            color: "white",
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            minWidth: 150,
          }}
        >
          <Heart size={16} color="#ff7a8a" />
          <div
            style={{
              flex: 1,
              height: 8,
              background: "#3a1118",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(player.hp / player.max) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ff5d6c, #ffa170)",
                transition: "width 200ms ease-out",
              }}
            />
          </div>
          <span style={{ minWidth: 50, textAlign: "right" }}>
            {Math.ceil(player.hp)}/{player.max}
          </span>
        </div>
      )}
    </div>
  );
}