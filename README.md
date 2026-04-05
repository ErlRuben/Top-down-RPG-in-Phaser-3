# Top-Down RPG — Phaser 3

A complete top-down RPG starter built with Phaser 3, served by Python's built-in HTTP server.

## File structure

```
rpg-game/
  index.html          ← entry point, loads Phaser + scenes
  main.js             ← Phaser config + registry init
  scenes/
    BootScene.js      ← initializes registry, goes to Preload
    PreloadScene.js   ← loads all assets (tilemap, sprites, audio)
    WorldScene.js     ← main game: map, player, NPCs, enemies, items
    UIScene.js        ← HUD overlay: HP bar, gold, dialogue, inventory
  assets/
    tilemaps/         ← place your Tiled .json map files here
    tilesets/         ← place tileset .png images here
    sprites/          ← place player/NPC/enemy sprite sheets here
    audio/            ← place .mp3 / .wav files here
```

## How to run

1. Open a terminal in the `rpg-game/` folder
2. Run: `python -m http.server 8000`
3. Open browser: `http://localhost:8000`

## Controls

| Key          | Action           |
|--------------|------------------|
| Arrow keys / WASD | Move player |
| SPACE        | Attack enemies   |
| E            | Talk to NPC      |
| I            | Toggle inventory |

## What works right now (no assets needed)

- Player (blue square) moves in 4 directions with WASD / arrows
- 9 wall obstacles with collision
- 4 NPCs — press E near any to read their dialogue (typewriter effect)
- 5 enemies — patrol and chase, attack player in range
- Enemy HP bars, knockback, and death with gold drop
- 5 collectible items (health potions, gold, sword)
- Inventory panel (press I)
- HUD: HP bar + gold counter
- Warp zone on the right edge (purple rectangle)
- Camera smoothly follows player across 1600×1200 world

## Adding real assets

### Tilemap (Tiled)
1. Download Tiled from mapeditor.org
2. Create a map with layers: Ground, Objects, Collision, Above
3. On collision tiles: add custom bool property `collides = true`
4. Export as JSON → `assets/tilemaps/world.json`
5. In `PreloadScene.js` uncomment the `load.tilemapTiledJSON` lines
6. In `WorldScene._buildWorld()` uncomment Option A, comment out Option B

### Sprites
- Player sheet: 4 rows × 3 frames = 12 frames, each 32×32px
  - Row 0: walk down, Row 1: walk left, Row 2: walk right, Row 3: walk up
- In `PreloadScene.js` uncomment the `load.spritesheet('player', ...)` line
- In `WorldScene._createPlayer()` uncomment Option A, comment out Option B
- In `WorldScene._handlePlayerMovement()` uncomment the animation block

### Free asset sources
- Sprites: OpenGameArt.org → search "LPC character"
- Tilesets: OpenGameArt.org → search "LPC terrain"
- Audio: freesound.org, itch.io free assets

## Next steps to expand the game

- Add a second map (DungeonScene) and update the warp zone
- Add a save/load system using localStorage
- Add a shop NPC that exchanges gold for items
- Add a quest log system
- Add turn-based battle screen as a separate scene