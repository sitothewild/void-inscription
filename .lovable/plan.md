# Milestone 3 — Gated Village, Vendors & Tiered Weapons

A walled village in the center protects the Seed of Yggdrasil. Vikings spend resources at vendors to upgrade gear across three tiers, where each tier unlocks a passive **Link Ability** that synergizes with the others.

---

## 1. The Village

A hexagonal palisade around the Seed at world origin.

```text
          ╔══ Gate ══╗
       ╔══╝          ╚══╗
       ║   [Smith]       ║
       ║                 ║
   Gate    [SEED]   Gate
       ║                 ║
       ║   [Shaman]      ║
       ╚══╗          ╔══╝
          ╚══ Gate ══╝
```

**Structure**
- Radius ~6 units, 6 wall segments, 4 cardinal gates.
- Walls: invisible collider + GLTF palisade mesh. Block enemies and players.
- Gates: open during **day**, auto-close **30 s before night**, reopen at dawn. HUD warning when closing.
- Gate HP (200): enemies attack gates first if closed; a broken gate stays open until a vendor repairs it at dawn (costs wood).
- Seed sits on a small altar inside; only damageable when enemies are *inside* the walls.

**Suggested tweaks**
- Add **1 watchtower** the player can climb for a damage boost (+25% attack range while standing on it).
- Pile of **stockpile crates** inside — visual indicator of stored resources (purely cosmetic, scales with inventory).

---

## 2. Vendors

Two NPCs spawn inside the village at fixed spots. Interact by walking into the radius and pressing **E** (or the new touch "Interact" button) to open a shop panel.

### Smith — Weapons & armor
Sells gear in three tiers, gated by **Day reached** and **resource cost**.

### Shaman — Consumables & utility
- **Healing Mead** — restore 30 HP. Cost: 2 herb.
- **Seed Ward** — +50 temporary Seed HP for one night. Cost: 5 stone.
- **Wolf Totem** — summons 1 friendly wolf for the night. Cost: 1 fang + 3 wood.

Vendor shops are **closed at night** — plan ahead.

---

## 3. Tiered Weapons with Link Abilities

Each weapon has **3 tiers**. Owning a tier grants its **Link Ability** passively, and link abilities **stack** across weapons — that's the build identity.

| Weapon | T1 | T2 | T3 | Link Ability (active at T1+) |
|---|---|---|---|---|
| **Sword** | Iron Sword — 1.5× dmg | Steel Sword — 2× dmg, +cleave | Yggdrasil Blade — 3× dmg, lifesteal 10% | **Edge** — basic attacks have wider arc |
| **Bow** | Hunter Bow — ranged attacks | Longbow — 2× range, pierce 1 | Stormcaller Bow — chain-lightning between 3 enemies | **Sight** — reveals enemies through walls within 12u |
| **Hammer** | Stone Hammer — slow, knockback | War Hammer — AOE on hit | Mjolnir — AOE + stun (1.5 s) | **Foundation** — gates take 50% less damage |

### Link synergy examples
- **Sword + Hammer (T1+T1)** → "Berserker": +15% move speed at night.
- **Bow + Hammer (T2+T2)** → "Warden": passive +1 wood per resource node, walls auto-repair 1 HP/s during day.
- **All three at T3** → "Allfather": night length shortened 20%, +1 max HP regen/s. (End-game goal.)

This turns weapon purchases into **build decisions**, not just numerical upgrades.

### Tier gating
| Tier | Unlocked from | Resource cost example (Sword) |
|---|---|---|
| T1 | Day 1 | 5 wood, 3 stone |
| T2 | Day 3 (and own T1) | 10 stone, 2 fang |
| T3 | Day 5 (and own T2) | 1 mythril (rare drop), 5 fang, 15 stone |

**Mythril** is a new rare resource that drops from a **mini-boss enemy** that spawns once on night 3 — gives players a clear T3 path.

---

## 4. New Resources

Add to existing wood/stone:
- **Herb** — picked from green bushes (peaceful, day-only respawn).
- **Fang** — drops from killed enemies (25% chance).
- **Mythril** — guaranteed drop from mini-boss on night 3.

---

## 5. Multiplayer rules

All host-authoritative (consistent with M2):
- Gate state (open/closed, HP) lives in snapshot.
- Vendor purchases: client sends `{ type: "purchase", vendor, itemId }` action; host validates resources, applies to **buying player's** inventory, broadcasts.
- Weapon ownership is **per-player** (each Viking buys their own tier).
- Link Abilities are **per-player passive** — affect that player only, except "Warden" wall regen which is global.

---

## 6. Suggested UX additions

- **Vendor HUD panel** — bottom-center modal with tier rows, lock icons for unmet requirements, hover tooltip explaining the Link Ability.
- **Owned-tiers HUD strip** — small icons under the HP bar showing which weapons/tiers you own and active link abilities.
- **Gate countdown** — red ring on minimap-style indicator showing time until gates close.
- **Build preview tooltip** — when hovering a weapon to buy, show which Link Abilities would activate if purchased.

---

## 7. Recommended cuts / open questions

Things to decide before building:
1. **Mini-boss on night 3** — yes, or random rare spawn instead?
2. **Should vendors be killable by enemies?** (Recommend no — village is a safe core.)
3. **Should T3 require defeating mini-boss vs. just owning T2?** (I'd vote: kill required, otherwise mythril is just a currency.)
4. **Should we replace the current single "sword" inventory flag** with the new tier system, or run them in parallel during transition? (Recommend full migration — cleaner store.)

---

## 8. Build order (if approved)

1. Village geometry + gate open/close logic + collisions.
2. Resource expansion (herb, fang, mythril) + bush + mini-boss spawn.
3. Weapon tier data + store rewrite (`inventory.weapons: { sword: 0|1|2|3, bow: ..., hammer: ... }`).
4. Vendor NPCs + shop UI + purchase action through `dispatchAction`.
5. Link Ability passive resolver (recomputed when weapons change).
6. HUD: vendor panel, owned-tier strip, gate countdown.
7. Multiplayer wiring: snapshot fields for gates + per-player weapons.

Answer the open questions in §7 and I'll execute the build.