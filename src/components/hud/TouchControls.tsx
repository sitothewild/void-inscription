import { useEffect, useRef, useState } from "react";
import { touchInput } from "@/game/touchInput";
import { useGame } from "@/game/store";
import {
  HERO_ATTACK_RANGE,
  SHAMAN_POS,
  SMITH_POS,
  VENDOR_INTERACT_RANGE,
} from "@/game/constants";
import { rangeMultiplier } from "@/game/weapons";

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

const PAD_SIZE = 128;
const KNOB_SIZE = 56;
const MAX_R = (PAD_SIZE - KNOB_SIZE) / 2;

export function TouchControls() {
  const [enabled, setEnabled] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const padRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const status = useGame((s) => s.status);
  const heroX = useGame((s) => s.heroX);
  const heroZ = useGame((s) => s.heroZ);
  const resources = useGame((s) => s.resources);
  const weapons = useGame((s) => s.inventory.weapons);

  useEffect(() => {
    setEnabled(isTouchDevice());
  }, []);

  if (!enabled || status !== "playing") return null;

  // Determine contextual interactable
  const dSmith = Math.hypot(heroX - SMITH_POS.x, heroZ - SMITH_POS.z);
  const dShaman = Math.hypot(heroX - SHAMAN_POS.x, heroZ - SHAMAN_POS.z);
  let interactLabel: string | null = null;
  if (dSmith < VENDOR_INTERACT_RANGE) interactLabel = "Smith";
  else if (dShaman < VENDOR_INTERACT_RANGE) interactLabel = "Shaman";
  else {
    const range = HERO_ATTACK_RANGE * rangeMultiplier(weapons);
    let bestKind: string | null = null;
    let bestD = range;
    for (const r of resources) {
      const d = Math.hypot(r.x - heroX, r.z - heroZ);
      if (d < bestD) {
        bestD = d;
        bestKind = r.kind;
      }
    }
    if (bestKind === "tree") interactLabel = "Chop";
    else if (bestKind === "rock") interactLabel = "Mine";
    else if (bestKind === "herb") interactLabel = "Pick";
  }

  const updateFromPoint = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const r = Math.hypot(dx, dy);
    if (r > MAX_R) {
      dx = (dx / r) * MAX_R;
      dy = (dy / r) * MAX_R;
    }
    setKnob({ x: dx, y: dy });
    touchInput.active = true;
    touchInput.dx = dx / MAX_R;
    // Screen Y down = world +z (camera looks from +y down at top-down)
    touchInput.dz = dy / MAX_R;
  };

  const reset = () => {
    touchInput.active = false;
    touchInput.dx = 0;
    touchInput.dz = 0;
    setKnob({ x: 0, y: 0 });
    touchIdRef.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchIdRef.current = t.identifier;
    updateFromPoint(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === touchIdRef.current) {
        updateFromPoint(t.clientX, t.clientY);
      }
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === touchIdRef.current) reset();
    }
  };

  return (
    <>
      <div
        ref={padRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="fixed bottom-6 left-6 z-30 touch-none select-none rounded-full border border-white/20 bg-black/40 backdrop-blur-sm"
        style={{ width: PAD_SIZE, height: PAD_SIZE }}
      >
        <div
          className="absolute rounded-full bg-white/80 shadow-lg"
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            left: `calc(50% - ${KNOB_SIZE / 2}px)`,
            top: `calc(50% - ${KNOB_SIZE / 2}px)`,
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          touchInput.attack = true;
        }}
        className="fixed bottom-10 right-8 z-30 flex h-24 w-24 touch-none select-none items-center justify-center rounded-full border-2 border-white/30 bg-red-600/80 text-lg font-bold uppercase text-white shadow-xl active:scale-95"
      >
        Attack
      </button>
      {interactLabel && (
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchInput.interact = true;
          }}
          className="fixed bottom-36 right-10 z-30 flex h-20 w-20 touch-none select-none items-center justify-center rounded-full border-2 border-white/40 bg-amber-500/90 text-sm font-bold uppercase text-white shadow-xl active:scale-95"
        >
          {interactLabel}
        </button>
      )}
    </>
  );
}
