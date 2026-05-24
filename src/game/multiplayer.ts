import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  PLAYER_COLORS,
  type ActionMsg,
  type InputMsg,
  type RemotePlayerState,
  type Snapshot,
} from "@/lib/net/codec";
import { useGame } from "./store";
import {
  ENEMY_MAX_HP,
  HERO_ATTACK_DAMAGE,
  HERO_MAX_HP,
} from "./constants";

const SNAPSHOT_HZ = 12;
const INPUT_HZ = 15;

// Module-level queue of incoming actions; drained by GameLoop on host.
export const hostActionQueue: { from: string; action: ActionMsg }[] = [];

async function ensureAnonAuth(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!signIn.user) throw new Error("Anon sign-in failed");
  return signIn.user.id;
}

export function useMultiplayer(roomCode: string | null, name: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    let snapshotTimer: ReturnType<typeof setInterval> | null = null;
    let inputTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const selfId = await ensureAnonAuth();
      if (cancelled) return;
      // Pick a stable color from selfId hash
      const colorIdx =
        Array.from(selfId).reduce((a, c) => a + c.charCodeAt(0), 0) %
        PLAYER_COLORS.length;
      const color = PLAYER_COLORS[colorIdx];

      useGame.getState().setMultiplayer({
        selfId,
        roomCode,
        name,
        color,
      });

      const channel = supabase.channel(`room:${roomCode}`, {
        config: { presence: { key: selfId } },
      });
      channelRef.current = channel;

      // ---- Presence / host election ----
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state).sort();
        const newHostId = ids[0];
        const wasHost = useGame.getState().isHost;
        const isHost = newHostId === selfId;
        if (isHost !== wasHost) {
          useGame.getState().setHost(isHost);
        }
        // Drop players who left
        const cur = useGame.getState().players;
        for (const id of Object.keys(cur)) {
          if (!ids.includes(id)) useGame.getState().removePlayer(id);
        }
      });

      // ---- Incoming messages ----
      channel.on("broadcast", { event: "input" }, ({ payload }) => {
        const msg = payload as InputMsg & { from: string };
        if (msg.from === selfId) return;
        const existing = useGame.getState().players[msg.from];
        const next: RemotePlayerState = {
          x: msg.x,
          z: msg.z,
          facing: msg.facing,
          name: msg.name,
          color: msg.color,
          hp: existing?.hp ?? HERO_MAX_HP,
        };
        useGame.getState().setPlayer(msg.from, next);
      });

      channel.on("broadcast", { event: "action" }, ({ payload }) => {
        const m = payload as ActionMsg & { from: string };
        if (!useGame.getState().isHost) return;
        hostActionQueue.push({ from: m.from, action: m });
      });

      channel.on("broadcast", { event: "snapshot" }, ({ payload }) => {
        if (useGame.getState().isHost) return;
        useGame.getState().applySnapshot(payload as Snapshot);
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ id: selfId, name, color, ts: Date.now() });
        }
      });

      // ---- Client → host: send inputs ----
      inputTimer = setInterval(() => {
        const s = useGame.getState();
        if (!s.selfId) return;
        const payload: InputMsg & { from: string } = {
          type: "input",
          from: s.selfId,
          x: s.heroX,
          z: s.heroZ,
          facing: s.heroFacing,
          name: s.selfName,
          color: s.selfColor,
        };
        // Always broadcast input — host needs others' positions, others need each others'
        channel.send({ type: "broadcast", event: "input", payload });
      }, 1000 / INPUT_HZ);

      // ---- Host → all: snapshots ----
      snapshotTimer = setInterval(() => {
        const s = useGame.getState();
        if (!s.isHost || !s.selfId) return;
        // Build player map: include self + remote players (HP from store-side)
        const players: Record<string, RemotePlayerState> = { ...s.players };
        players[s.selfId] = {
          x: s.heroX,
          z: s.heroZ,
          facing: s.heroFacing,
          name: s.selfName,
          color: s.selfColor,
          hp: s.heroHp,
        };
        const snap: Snapshot = {
          t: Date.now(),
          phase: s.phase,
          phaseTime: s.phaseTime,
          day: s.day,
          seedHp: s.seedHp,
          status: s.status,
          enemies: s.enemies,
          resources: s.resources,
          players,
          inventory: s.inventory,
          seed: s.seed,
        };
        channel.send({ type: "broadcast", event: "snapshot", payload: snap });
      }, 1000 / SNAPSHOT_HZ);
    })();

    return () => {
      cancelled = true;
      if (snapshotTimer) clearInterval(snapshotTimer);
      if (inputTimer) clearInterval(inputTimer);
      const ch = channelRef.current;
      if (ch) {
        ch.unsubscribe();
        supabase.removeChannel(ch);
      }
      useGame.getState().leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);
}

// Helper for client-side action dispatch.
// In single-player or as host: enqueue locally so GameLoop processes it.
// As client: broadcast to host via the channel.
export function dispatchAction(action: ActionMsg) {
  const s = useGame.getState();
  if (!s.roomCode || s.isHost) {
    // Local: enqueue with self as "from"
    hostActionQueue.push({ from: s.selfId ?? "self", action });
    return;
  }
  // Client: broadcast
  const ch = supabase.getChannels().find((c) => c.topic === `realtime:room:${s.roomCode}`);
  if (!ch) return;
  ch.send({
    type: "broadcast",
    event: "action",
    payload: { ...action, from: s.selfId },
  });
}

// Apply an action authoritatively (called by GameLoop on host or single-player).
export function applyAction(from: string, action: ActionMsg) {
  const s = useGame.getState();
  if (action.type === "reset") {
    s.reset();
    return;
  }
  if (action.type === "buy-weapon") {
    s.buyWeapon(action.kind, action.tier);
    return;
  }
  if (action.type === "buy-shaman") {
    s.buyShaman(action.item);
    return;
  }
  if (action.type === "attack") {
    const dmg = HERO_ATTACK_DAMAGE * action.damageMul;
    const range = action.range;
    let bestE: string | null = null;
    let bestD = range;
    for (const e of s.enemies) {
      const d = Math.hypot(e.x - action.x, e.z - action.z);
      if (d < bestD) {
        bestD = d;
        bestE = e.id;
      }
    }
    if (bestE) {
      s.damageEnemy(bestE, dmg);
      return;
    }
    let bestR: string | null = null;
    let bestRd = range;
    for (const r of s.resources) {
      const d = Math.hypot(r.x - action.x, r.z - action.z);
      if (d < bestRd) {
        bestRd = d;
        bestR = r.id;
      }
    }
    if (bestR) {
      s.damageResource(bestR, 1);
      const after = useGame.getState().resources.find((r) => r.id === bestR);
      if (after && after.hp <= 0) s.removeResource(bestR);
    }
    void ENEMY_MAX_HP;
    void from;
  }
}