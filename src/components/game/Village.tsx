import { useGame } from "@/game/store";
import { GATE_ANGLES, GATE_HP, HEX_ANGLES, VILLAGE_RADIUS } from "@/game/constants";

function WallPost({ angle }: { angle: number }) {
  const x = Math.cos(angle) * VILLAGE_RADIUS;
  const z = Math.sin(angle) * VILLAGE_RADIUS;
  return (
    <mesh position={[x, 1.4, z]} castShadow rotation={[0, -angle, 0]}>
      <cylinderGeometry args={[0.3, 0.36, 2.8, 8]} />
      <meshStandardMaterial color="#6b4f2a" roughness={0.9} />
    </mesh>
  );
}

function angleInArc(am: number, a1: number, a2: number) {
  // Returns true if angle `am` lies between a1 and a2 (shortest arc).
  const norm = (x: number) => ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const A = norm(a1);
  const B = norm(a2);
  const M = norm(am);
  if (A < B) return M >= A && M <= B;
  return M >= A || M <= B;
}

function WallSegment({ a1, a2 }: { a1: number; a2: number }) {
  // Skip wall segments that contain a gate angle — the gate mesh fills that slot.
  const isGateSlot = GATE_ANGLES.some((g) => angleInArc(g, a1, a2));
  if (isGateSlot) return null;

  const x1 = Math.cos(a1) * VILLAGE_RADIUS;
  const z1 = Math.sin(a1) * VILLAGE_RADIUS;
  const x2 = Math.cos(a2) * VILLAGE_RADIUS;
  const z2 = Math.sin(a2) * VILLAGE_RADIUS;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const length = Math.hypot(x2 - x1, z2 - z1);
  const rot = Math.atan2(z2 - z1, x2 - x1);
  return (
    <mesh position={[cx, 1.1, cz]} rotation={[0, -rot, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, 2.2, 0.5]} />
      <meshStandardMaterial color="#5a3e22" roughness={0.95} />
    </mesh>
  );
}

function GateMesh({
  angle,
  hp,
  open,
  broken,
}: {
  angle: number;
  hp: number;
  open: boolean;
  broken: boolean;
}) {
  const x = Math.cos(angle) * VILLAGE_RADIUS;
  const z = Math.sin(angle) * VILLAGE_RADIUS;
  const rot = -angle + Math.PI / 2;
  if (broken) {
    return (
      <group position={[x, 0.5, z]} rotation={[0, rot, 0]}>
        <mesh rotation={[0, 0, 0.4]} position={[-1, 0, 0]}>
          <boxGeometry args={[1.6, 1, 0.3]} />
          <meshStandardMaterial color="#3a2814" />
        </mesh>
      </group>
    );
  }
  const hpRatio = hp / GATE_HP;
  const color = hpRatio > 0.5 ? "#7d5a2f" : hpRatio > 0.2 ? "#a06a30" : "#c44a2a";
  return (
    <group position={[x, 1, z]} rotation={[0, rot, 0]}>
      {open ? (
        <>
          <mesh position={[-1.6, 0, 0]} rotation={[0, -Math.PI / 2.5, 0]} castShadow>
            <boxGeometry args={[1.8, 2, 0.25]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[1.6, 0, 0]} rotation={[0, Math.PI / 2.5, 0]} castShadow>
            <boxGeometry args={[1.8, 2, 0.25]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </>
      ) : (
        <mesh castShadow>
          <boxGeometry args={[3.6, 2, 0.3]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

export function Village() {
  const gates = useGame((s) => s.gates);
  return (
    <group>
      {HEX_ANGLES.map((a, i) => (
        <WallPost key={`p${i}`} angle={a} />
      ))}
      {HEX_ANGLES.map((a, i) => (
        <WallSegment key={`s${i}`} a1={a} a2={HEX_ANGLES[(i + 1) % HEX_ANGLES.length]} />
      ))}
      {gates.map((g) => (
        <GateMesh key={g.id} angle={g.angle} hp={g.hp} open={g.open} broken={g.broken} />
      ))}
    </group>
  );
}
