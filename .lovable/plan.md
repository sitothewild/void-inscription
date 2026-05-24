
# Image-Driven 2km x 2km Level

Use the uploaded top-down island image as the master map for a new large level. Colors in the image drive both biome placement and base height, then procedural detail (noise + hydrology) makes the world feel alive.

## What gets built

A new **Level 3 — "Sundered Isle"** (2000m × 2000m), reachable via existing portal flow, with:

- **Snow mountain peaks** (white in source) — tallest terrain, walkable slopes, snow material
- **Deep forest** (dark green) — dense tree cover, cooler tint
- **Meadows / marshland** (light green) — flat-ish, lush grass, scattered trees
- **Swamp / dry purple zone** (purple) — murky water pools, dead trees, desaturated tint
- **Hot dry plains** (brown) — yellow grass, sparse vegetation, baked color
- **Lakes** (cyan circles in image) — true water bodies with health-bar-free ocean shader
- **Rivers** (blue lines) — carved channels flowing from mountains to coast
- **Waterfalls** — auto-generated where rivers drop steeply off mountain edges
- **Coastline** (dark blue / outer ring) — sand beach, ocean surround

## How the image becomes terrain

1. Load `public/maps/island_source.jpg` once into an offscreen canvas, read pixel RGBA.
2. For each terrain vertex, sample the corresponding pixel and classify the biome by nearest color match (snow, dark green, light green, purple, brown, water-blue, ocean-blue).
3. Derive **base height** from biome (snow = high, swamp = low, water = below sea level, etc.).
4. Add multi-octave simplex noise *masked by biome* — mountains get rugged peaks, meadows stay rolling, plains stay flat.
5. Carve **river channels**: detect cyan/blue pixels in the source, lower their height to a flowing channel, smooth neighbors.
6. Apply the same slope-cap pass as Level 1 so the player can climb mountains.

## Waterfalls

After heights are baked, walk the river path. Wherever consecutive river cells drop more than a threshold (e.g. >2m over 1 cell), spawn a `Waterfall` particle/plane prop at that point with falling-water particles and mist.

## Lakes

The two circular cyan blobs become flat water disks at a fixed lake level, with the surrounding terrain dipping into a basin.

## Biome colors & materials (vertex colors)

| Biome | Terrain tint |
|---|---|
| Snow peak | near-white, slight blue |
| Deep forest | `#234d28` |
| Meadow | `#7cbf55` |
| Swamp | muted purple-brown `#6b5a78` overlay on damp green |
| Hot plains | `#c2a85a` (yellow grass over baked dirt) |
| Beach | sand |

## Performance plan (2km world)

- Terrain mesh resolution: 400×400 verts (~5m cell). Cheaper than naïve 2000×2000.
- Heightfield collider matches mesh resolution.
- Grass and trees use the existing instanced systems but only spawn in their respective biomes (forest dense, plains sparse, swamp dead-tree variant).
- Fog stays at Level 1 distances so far terrain culls naturally.

## Files

### New
- `src/game/imageMap.ts` — loads the source image, exposes `sampleColor(x,z)`, `classifyBiome(x,z)`, `isRiver(x,z)`, `isLake(x,z)`.
- `src/hooks/useImageTerrain.ts` — produces a `TerrainData`-compatible object from the image + noise + river carving.
- `src/components/Waterfall.tsx` — billboarded falling-water plane + particle mist.
- `src/components/Lake.tsx` — flat water disk with the existing ocean shader, smaller scale.
- `src/components/Level3.tsx` — assembles terrain, lakes, waterfalls, rivers, biome-filtered Resources/Grass/Animals.

### Edited
- `src/game/biomes.ts` — add `"meadow"`, `"snow"`, `"hot_plains"` variants with matching `biomeColor` entries (keeps Level 1 working).
- `src/components/Resources.tsx` — accept biome filter so trees only spawn in forest/meadow, dead trees in swamp, cacti in hot plains.
- `src/components/Grass.tsx` — biome-aware tint (yellow in hot plains, lush in meadow, skip in swamp/snow).
- `src/components/Game.tsx` — route portals to Level 3 (alongside existing Level 2).

## Technical notes

- Image decoding happens once at level mount via `new Image()` + `<canvas>.getContext('2d').getImageData`. Cached in a module-level `Map<url, ImageData>`.
- Color classification uses squared-distance against a palette of reference colors picked from the image (sampled in code).
- River carving: after biome map is built, run a 1-cell dilation on river pixels to widen channels; lower height by `riverDepth=1.5m` and clamp neighbors with smoothstep.
- Waterfall detection runs once after height bake — collect points, dedupe nearby ones (min 8m apart), pass to `Level3` as an array.
- The flattened village pad logic from Level 1 is dropped here — Level 3 is wilderness only (no vendors/houses) per the request scope.

## Out of scope (for this pass)

- Per-biome ambient audio
- Dynamic river flow animation across the full network (waterfalls handle the visual spectacle)
- Splitting into LOD chunks — 400×400 single mesh is fine for now
