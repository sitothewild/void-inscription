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

type AnimalKind = {
  url: string;
  scale: number;
  speed: number;
  hMin: number;
  hMax: number;
  count: number;
  yOffset?: number;
  flying?: boolean;
};

const KINDS: AnimalKind[] = [
  // New animated pack (Kevin Iglesias / Quaternius animal pack) — all rigged
  // with idle/walk/run/eat clips. CharacterModel picks the matching clip.
  { url: "/models/animals/Deer.glb",        scale: 0.9, speed: 1.8, hMin: 0.25, hMax: 0.55, count: 4 },
  { url: "/models/animals/Stag.glb",        scale: 1.0, speed: 1.9, hMin: 0.25, hMax: 0.60, count: 2 },
  { url: "/models/animals/Fox.glb",         scale: 0.7, speed: 2.4, hMin: 0.20, hMax: 0.55, count: 3 },
  { url: "/models/animals/Wolf.glb",        scale: 0.9, speed: 2.6, hMin: 0.35, hMax: 0.70, count: 2 },
  { url: "/models/animals/Cow.glb",         scale: 1.0, speed: 1.0, hMin: 0.20, hMax: 0.40, count: 3 },
  { url: "/models/animals/Bull.glb",        scale: 1.1, speed: 1.4, hMin: 0.20, hMax: 0.40, count: 1 },
  { url: "/models/animals/Horse.glb",       scale: 1.1, speed: 2.2, hMin: 0.20, hMax: 0.50, count: 2 },
  { url: "/models/animals/White_Horse.glb", scale: 1.1, speed: 2.2, hMin: 0.20, hMax: 0.50, count: 1 },
  { url: "/models/animals/Alpaca.glb",      scale: 0.9, speed: 1.4, hMin: 0.25, hMax: 0.55, count: 2 },
  { url: "/models/animals/Husky.glb",       scale: 0.8, speed: 2.4, hMin: 0.20, hMax: 0.60, count: 2 },
  { url: "/models/animals/Shiba_Inu.glb",   scale: 0.7, speed: 2.6, hMin: 0.20, hMax: 0.55, count: 2 },
  // Legacy small wildlife (still in /public)
  { url: "/models/animals/rabbit.glb",      scale: 0.6, speed: 3.0, hMin: 0.20, hMax: 0.45, count: 4 },
  {
    url: "/models/animals/bird.glb",
    scale: 0.6,
    speed: 4,
    hMin: 0,
    hMax: 1,
    count: 5,
    yOffset: 8,
    flying: true,
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
      // Pick new target (wander)
      const ang = rng() * Math.PI * 2;
      const r = 6 + rng() * 12;
      s.tx = Math.max(-half, Math.min(half, s.x + Math.cos(ang) * r));
      s.tz = Math.max(-half, Math.min(half, s.z + Math.sin(ang) * r));
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
    // Wildlife stays well outside the village pad + fence so animals don't
    // spawn pacing inside the palisade.
    const exclusion = data.villageRadius + 6;
    let seed = 1;
    for (const k of KINDS) {
      let placed = 0;
      let tries = 0;
      while (placed < k.count && tries < k.count * 40) {
        tries++;
        const x = (rng() * 2 - 1) * half * 0.85;
        const z = (rng() * 2 - 1) * half * 0.85;
        if (Math.hypot(x, z) < exclusion) continue;
        const h = data.sampleAt(x, z);
        if (!k.flying && (h < k.hMin || h > k.hMax)) continue;
        out.push({
          url: k.url,
          scale: k.scale,
          speed: k.speed,
          start: [x, z],
          flying: !!k.flying,
          yOffset: k.yOffset ?? 0,
          seed: seed++,
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