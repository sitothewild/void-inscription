import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { CharacterModel } from "./CharacterModel";
import type { TerrainData } from "@/hooks/useProceduralTerrain";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Habitat band:
 *  - "village": stays inside the fence ring (dogs only).
 *  - "pasture": close to the village but outside the fence (horses, livestock).
 *  - "wild":    must be far from any settlement; wanders the open biomes.
 */
type Habitat = "village" | "pasture" | "wild";

type AnimalKind = {
  url: string;
  scale: number;
  speed: number;
  /** Normalized height band (only enforced for wild + pasture). */
  hMin: number;
  hMax: number;
  count: number;
  yOffset?: number;
  flying?: boolean;
  habitat: Habitat;
};

/** Village fence radius (matches Village.tsx). Dogs roam inside this. */
const VILLAGE_RADIUS = 14;
/** Pasture band — just outside the fence, where farm animals graze. */
const PASTURE_MIN = 18;
const PASTURE_MAX = 36;
/** Wild animals stay this far from the settlement at minimum. */
const WILD_MIN = 55;

const KINDS: AnimalKind[] = [
  // ── Village pets (inside the fence) ──────────────────────────────────────
  { url: "/models/animals/Husky.glb",       scale: 0.45, speed: 2.4, hMin: 0,    hMax: 1,    count: 2, habitat: "village" },
  { url: "/models/animals/Shiba_Inu.glb",   scale: 0.40, speed: 2.6, hMin: 0,    hMax: 1,    count: 2, habitat: "village" },
  // ── Pasture (farm) animals — just outside the village ───────────────────
  { url: "/models/animals/Horse.glb",       scale: 0.65, speed: 2.0, hMin: 0.18, hMax: 0.55, count: 2, habitat: "pasture" },
  { url: "/models/animals/White_Horse.glb", scale: 0.65, speed: 2.0, hMin: 0.18, hMax: 0.55, count: 1, habitat: "pasture" },
  { url: "/models/animals/Donkey.glb",      scale: 0.55, speed: 1.6, hMin: 0.18, hMax: 0.55, count: 2, habitat: "pasture" },
  { url: "/models/animals/Bull.glb",        scale: 0.70, speed: 1.4, hMin: 0.18, hMax: 0.50, count: 1, habitat: "pasture" },
  // ── Wild animals — must stay clear of any village ───────────────────────
  { url: "/models/animals/Deer.glb",        scale: 0.50, speed: 1.8, hMin: 0.25, hMax: 0.55, count: 5, habitat: "wild" },
  { url: "/models/animals/Stag.glb",        scale: 0.55, speed: 1.9, hMin: 0.25, hMax: 0.60, count: 3, habitat: "wild" },
  { url: "/models/animals/Fox.glb",         scale: 0.38, speed: 2.4, hMin: 0.20, hMax: 0.55, count: 4, habitat: "wild" },
  { url: "/models/animals/Wolf.glb",        scale: 0.50, speed: 2.6, hMin: 0.30, hMax: 0.70, count: 3, habitat: "wild" },
  { url: "/models/animals/rabbit.glb",      scale: 0.30, speed: 3.0, hMin: 0.20, hMax: 0.50, count: 5, habitat: "wild" },
  {
    url: "/models/animals/bird.glb",
    scale: 0.6,
    speed: 4,
    hMin: 0,
    hMax: 1,
    count: 6,
    yOffset: 8,
    flying: true,
    habitat: "wild",
  },
];

type Spec = {
  url: string;
  scale: number;
  speed: number;
  start: [number, number];
  flying: boolean;
  yOffset: number;
  seed: number;
  /** Habitat-derived bounds for wandering targets. */
  homeX: number;
  homeZ: number;
  /** Min/max distance from (homeX, homeZ) the animal may roam to. */
  rMin: number;
  rMax: number;
};

function WanderingAnimal({ spec, data }: { spec: Spec; data: TerrainData }) {
  const ref = useRef<Group>(null);
  const rng = useMemo(() => mulberry32(spec.seed), [spec.seed]);
  const state = useRef({
    x: spec.start[0],
    z: spec.start[1],
    tx: spec.start[0],
    tz: spec.start[1],
    facing: 0,
    cooldown: 0,
  });

  useFrame((_, dt) => {
    const s = state.current;
    const g = ref.current;
    if (!g) return;
    const half = data.worldSize / 2 - 4;

    s.cooldown -= dt;
    const dxT = s.tx - s.x;
    const dzT = s.tz - s.z;
    const dist = Math.hypot(dxT, dzT);
    if (dist < 1 || s.cooldown <= 0) {
      // Pick a new target inside the animal's habitat band relative to its
      // home anchor (village center for pets/farm animals, spawn point for
      // wildlife). This keeps dogs in town and wolves in the forest.
      const ang = rng() * Math.PI * 2;
      const r = spec.rMin + rng() * Math.max(0.5, spec.rMax - spec.rMin);
      let tx = spec.homeX + Math.cos(ang) * r;
      let tz = spec.homeZ + Math.sin(ang) * r;
      tx = Math.max(-half, Math.min(half, tx));
      tz = Math.max(-half, Math.min(half, tz));
      s.tx = tx;
      s.tz = tz;
      s.cooldown = 4 + rng() * 4;
    }

    const moveLen = Math.max(0.0001, Math.hypot(dxT, dzT));
    const vx = (dxT / moveLen) * spec.speed;
    const vz = (dzT / moveLen) * spec.speed;
    s.x += vx * dt;
    s.z += vz * dt;

    const groundY = data.sampleWorldY(s.x, s.z);
    const y = spec.flying ? Math.max(groundY + 6, spec.yOffset) : groundY;

    const desired = Math.atan2(vx, vz);
    let delta = desired - s.facing;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    s.facing += delta * Math.min(1, dt * 6);

    g.position.set(s.x, y, s.z);
    g.rotation.y = s.facing;
  });

  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        <CharacterModel url={spec.url} scale={spec.scale} animation="run" moving rate={spec.speed * 0.6} />
      </Suspense>
    </group>
  );
}

export function Animals({ data }: { data: TerrainData }) {
  const specs = useMemo<Spec[]>(() => {
    const rng = mulberry32(7777);
    const out: Spec[] = [];
    const half = data.worldSize / 2;
    let seed = 1;
    for (const k of KINDS) {
      let placed = 0;
      let tries = 0;
      const maxTries = k.count * 80;
      while (placed < k.count && tries < maxTries) {
        tries++;
        let x: number;
        let z: number;
        if (k.habitat === "village") {
          // Inside the fence: tight ring around the campfire, avoiding the
          // pylon at center.
          const ang = rng() * Math.PI * 2;
          const r = 3 + rng() * (VILLAGE_RADIUS - 4);
          x = Math.cos(ang) * r;
          z = Math.sin(ang) * r;
        } else if (k.habitat === "pasture") {
          const ang = rng() * Math.PI * 2;
          const r = PASTURE_MIN + rng() * (PASTURE_MAX - PASTURE_MIN);
          x = Math.cos(ang) * r;
          z = Math.sin(ang) * r;
        } else {
          x = (rng() * 2 - 1) * half * 0.9;
          z = (rng() * 2 - 1) * half * 0.9;
          if (Math.hypot(x, z) < WILD_MIN) continue;
        }
        const h = data.sampleAt(x, z);
        // Pets/farm animals don't filter by height — the village pad is flat.
        if (k.habitat === "wild" && !k.flying && (h < k.hMin || h > k.hMax)) continue;

        // Each spec roams around its spawn point (its "home"). Village dogs
        // anchor on the village center so they don't drift off the pad.
        const homeX = k.habitat === "village" ? 0 : x;
        const homeZ = k.habitat === "village" ? 0 : z;
        const rMin = k.habitat === "village" ? 0 : k.habitat === "pasture" ? 0 : 0;
        const rMax =
          k.habitat === "village" ? VILLAGE_RADIUS - 3 :
          k.habitat === "pasture" ? 10 :
          16;
        out.push({
          url: k.url,
          scale: k.scale,
          speed: k.speed,
          start: [x, z],
          flying: !!k.flying,
          yOffset: k.yOffset ?? 0,
          seed: seed++,
          homeX,
          homeZ,
          rMin,
          rMax,
        });
        placed++;
      }
    }
    return out;
  }, [data]);

  return (
    <group>
      {specs.map((s, i) => (
        <WanderingAnimal key={i} spec={s} data={data} />
      ))}
    </group>
  );
}