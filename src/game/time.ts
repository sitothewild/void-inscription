import { useSyncExternalStore } from "react";

/**
 * Day/night cycle. `t` is in [0, 1) where:
 *   0.00 = midnight
 *   0.25 = sunrise
 *   0.50 = noon
 *   0.75 = sunset
 * Period is `dayLengthMs` milliseconds.
 */

export const DAY_LENGTH_MS = 4 * 60 * 1000; // 4 real minutes per day

let t = 0.32; // start a bit after sunrise so the world is lit on load
let speed = 1;
let lastTick = performance.now();

const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

/** Advance time. Called once per frame by the scene. */
export function tickTime(now = performance.now()) {
  const dt = (now - lastTick) / DAY_LENGTH_MS;
  lastTick = now;
  t = (t + dt * speed) % 1;
  if (t < 0) t += 1;
  emit();
}

export const time = {
  get(): number {
    return t;
  },
  set(v: number) {
    t = ((v % 1) + 1) % 1;
    emit();
  },
  setSpeed(s: number) {
    speed = s;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useGameTime(): number {
  return useSyncExternalStore(
    (cb) => time.subscribe(cb),
    () => time.get(),
    () => time.get(),
  );
}

// ---------- Derived environment values ----------

export type SkyEnv = {
  /** Sun direction (unit-ish) — also used as Sky's sunPosition. */
  sunDir: [number, number, number];
  /** Moon direction (opposite-ish to sun). */
  moonDir: [number, number, number];
  /** 0 = full night, 1 = full day. Smooth blend across dawn/dusk. */
  daylight: number;
  /** Sun light intensity. */
  sunIntensity: number;
  /** Moon light intensity (only meaningful at night). */
  moonIntensity: number;
  /** Ambient light intensity. */
  ambientIntensity: number;
  /** Hex color for sun light. */
  sunColor: string;
  /** Hex color for moon light. */
  moonColor: string;
  /** Ambient color. */
  ambientColor: string;
  /** Fog color (matches sky horizon). */
  fogColor: string;
  /** Background color when used as fallback. */
  bgColor: string;
};

/**
 * Compute lighting / colors from `t` in [0, 1). Sun travels a circle:
 *   t=0.25 → sun at +X horizon (sunrise)
 *   t=0.50 → sun overhead
 *   t=0.75 → sun at -X horizon (sunset)
 *   t=0.00 → sun below at -Y (midnight)
 */
export function computeSkyEnv(tt: number): SkyEnv {
  const ang = tt * Math.PI * 2 - Math.PI / 2; // sun angle, 0 at sunrise
  const sunY = Math.sin(ang);
  const sunX = Math.cos(ang);
  // Slight Z bias so the sun doesn't sit exactly in the camera axis.
  const sunDir: [number, number, number] = [sunX, sunY, 0.25];
  const moonDir: [number, number, number] = [-sunX, -sunY, 0.25];

  // Daylight 0..1 — smoothly rises around sunrise/sunset.
  const daylight = clamp01(sunY * 3 + 0.4);

  const sunIntensity = clamp01(sunY * 1.6) * 1.4; // 0 at horizon → 1.4 at noon
  // Brighter moonlight so the painted island is still readable at night.
  const moonIntensity = clamp01(-sunY * 1.2 + 0.15) * 1.1;
  const ambientIntensity = 0.45 + daylight * 0.35;

  // Colors: cool moonlight at night, warm orange near horizon, neutral midday.
  const horizonness = 1 - Math.abs(sunY); // 1 at horizon, 0 at zenith/nadir
  const sunsetMix = clamp01(horizonness * 1.2) * clamp01(daylight + 0.1);
  const sunColor = mixHex("#ffffff", "#ff8a3c", sunsetMix * 0.85);
  const moonColor = "#9bb7ff";
  const ambientColor = mixHex(
    mixHex("#1a2540", "#bcd9ff", daylight), // night → day
    "#ffb060",
    sunsetMix * 0.5,
  );
  const fogColor = mixHex(
    mixHex("#0a1428", "#9fc2e6", daylight),
    "#f0a866",
    sunsetMix * 0.6,
  );
  const bgColor = mixHex(
    mixHex("#06101e", "#87b8e0", daylight),
    "#f29a55",
    sunsetMix * 0.55,
  );

  return {
    sunDir,
    moonDir,
    daylight,
    sunIntensity,
    moonIntensity,
    ambientIntensity,
    sunColor,
    moonColor,
    ambientColor,
    fogColor,
    bgColor,
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mixHex(a: string, b: string, m: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * m, ag + (bg - ag) * m, ab + (bb - ab) * m);
}