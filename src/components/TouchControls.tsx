import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Footprints, Hand, Sparkles, Wind, Zap } from "lucide-react";
import { emitEdge, mobileAxis, runState } from "@/game/inputStore";

type Vec = { x: number; y: number };

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<Vec>({ x: 0, y: 0 });
  const activeId = useRef<number | null>(null);
  const center = useRef<Vec>({ x: 0, y: 0 });
  const radius = 56;

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    activeId.current = e.pointerId;
    base.setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: React.PointerEvent) => {
    if (activeId.current !== e.pointerId) return;
    let dx = e.clientX - center.current.x;
    let dy = e.clientY - center.current.y;
    const d = Math.hypot(dx, dy);
    if (d > radius) {
      dx = (dx / d) * radius;
      dy = (dy / d) * radius;
    }
    setKnob({ x: dx, y: dy });
    mobileAxis.x = dx / radius;
    mobileAxis.y = dy / radius;
  };
  const end = (e: React.PointerEvent) => {
    if (activeId.current !== e.pointerId) return;
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    mobileAxis.x = 0;
    mobileAxis.y = 0;
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      style={{
        position: "absolute",
        left: 20,
        bottom: 20,
        width: 140,
        height: 140,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.12), rgba(0,0,0,0.35))",
        border: "2px solid rgba(255,255,255,0.25)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 56,
          height: 56,
          marginLeft: -28,
          marginTop: -28,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.85), rgba(180,180,200,0.6))",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          transition: activeId.current === null ? "transform 0.18s" : "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function ActionButton({
  label,
  size = 60,
  color = "#ffb060",
  icon,
  onPress,
  style,
}: {
  label: string;
  size?: number;
  color?: string;
  icon: React.ReactNode;
  onPress: () => void;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  const handle = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setPressed(true);
      onPress();
      setTimeout(() => setPressed(false), 140);
    },
    [onPress],
  );
  return (
    <button
      onPointerDown={handle}
      aria-label={label}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}aa`,
        background: pressed
          ? `radial-gradient(circle, ${color}, ${color}88)`
          : `radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0.4))`,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: pressed
          ? `0 0 24px ${color}, inset 0 0 12px ${color}`
          : "0 4px 12px rgba(0,0,0,0.4)",
        touchAction: "none",
        userSelect: "none",
        transition: "all 0.12s",
        ...style,
      }}
    >
      {icon}
    </button>
  );
}

export function TouchControls() {
  // Show on touch devices OR small viewports; also show via dev hint.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const has = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
    setShow(has);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <Joystick />
      </div>

      <div style={{ pointerEvents: "auto" }}>
        <RunToggle />
      </div>

      {/* Right-side ability cluster (Genshin layout) */}
      <div style={{ pointerEvents: "auto" }}>
        {/* Ability 1 — top */}
        <ActionButton
          label="Ability 1"
          size={48}
          color="#6aa6ff"
          icon={<Wind size={22} />}
          onPress={() => emitEdge("ability1")}
          style={{ right: 140, bottom: 170 }}
        />
        {/* Ability 2 — upper-left of attack */}
        <ActionButton
          label="Ability 2"
          size={48}
          color="#a26aff"
          icon={<Sparkles size={22} />}
          onPress={() => emitEdge("ability2")}
          style={{ right: 200, bottom: 110 }}
        />
        {/* Ability 3 — lower */}
        <ActionButton
          label="Ability 3"
          size={48}
          color="#ff7aa2"
          icon={<Zap size={22} />}
          onPress={() => emitEdge("ability3")}
          style={{ right: 60, bottom: 170 }}
        />
        {/* Big attack button — bottom-right */}
        <ActionButton
          label="Attack"
          size={84}
          color="#ffb060"
          icon={<Crosshair size={36} />}
          onPress={() => emitEdge("attack")}
          style={{ right: 28, bottom: 28 }}
        />
        {/* Action / interact — left of attack */}
        <ActionButton
          label="Action"
          size={64}
          color="#7ae0a8"
          icon={<Hand size={28} />}
          onPress={() => emitEdge("action")}
          style={{ right: 130, bottom: 40 }}
        />
      </div>
    </div>
  );
}

function RunToggle() {
  const [on, setOn] = useState(false);
  const toggle = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const next = !runState.toggled;
    runState.toggled = next;
    setOn(next);
  }, []);
  const color = on ? "#ffd166" : "#9ad0ff";
  return (
    <button
      onPointerDown={toggle}
      aria-label={on ? "Running (tap to walk)" : "Walking (tap to run)"}
      style={{
        position: "absolute",
        left: 180,
        bottom: 90,
        width: 58,
        height: 58,
        borderRadius: "50%",
        border: `2px solid ${color}aa`,
        background: on
          ? `radial-gradient(circle, ${color}, ${color}88)`
          : `radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0.4))`,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: on
          ? `0 0 20px ${color}, inset 0 0 10px ${color}`
          : "0 4px 12px rgba(0,0,0,0.4)",
        touchAction: "none",
        userSelect: "none",
        fontSize: 11,
        fontWeight: 600,
        gap: 2,
        flexDirection: "column",
      }}
    >
      <Footprints size={22} />
      <span>{on ? "RUN" : "WALK"}</span>
    </button>
  );
}