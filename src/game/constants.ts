export const WORLD_SIZE = 64;
export const TILE = 1;
export const ISLAND_RADIUS = 44;

// ---- Slab terrain grid ----
export const TILE_SIZE = 4;
export const LAYER_HEIGHT = 1.4;
export const GRID_RADIUS = 11; // tiles from center (covers island)

export const DAY_DURATION = 180; // seconds
export const NIGHT_DURATION = 120;

export const HERO_SPEED = 6;
export const HERO_MAX_HP = 100;
export const HERO_ATTACK_RANGE = 2.2;
export const HERO_ATTACK_DAMAGE = 25;
export const HERO_ATTACK_COOLDOWN = 0.45;

export const ENEMY_SPEED = 2.8;
export const ENEMY_MAX_HP = 40;
export const ENEMY_DAMAGE = 8;
export const ENEMY_ATTACK_COOLDOWN = 1.0;
export const ENEMY_SIGHT = 12;

export const SEED_MAX_HP = 500;

export const TREE_HP = 3;
export const ROCK_HP = 4;
export const HERB_HP = 1;

export const WAVE_BASE_COUNT = 5;
export const WAVE_GROWTH = 2;

// ---- Village ----
export const VILLAGE_RADIUS = 7; // hex circumradius
export const GATE_HP = 200;
export const GATE_CLOSE_WARNING = 30; // seconds before night that gates start closing
export const GATE_DAMAGE = 6;
// Hex corner angles for wall posts (flat-top hex: corners at N, S and 4 diagonals)
export const HEX_ANGLES = [30, 90, 150, 210, 270, 330].map((d) => (d * Math.PI) / 180);
// Gate slots are mid-side of the hex — east and west sides
export const GATE_ANGLES = [0, Math.PI];

// ---- Vendors ----
export const VENDOR_INTERACT_RANGE = 2.2;
export const SMITH_POS = { x: -3, z: -2 };
export const SHAMAN_POS = { x: 3, z: -2 };

// ---- Boss ----
export const BOSS_HP = 400;
export const BOSS_DAMAGE = 18;
export const BOSS_SPEED = 2.0;
export const BOSS_SPAWN_NIGHT = 3;

// Fang drop chance
export const FANG_DROP_CHANCE = 0.25;
