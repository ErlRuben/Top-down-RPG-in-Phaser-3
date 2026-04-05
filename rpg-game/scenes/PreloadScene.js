// rpg-game/scenes/PreloadScene.js
// scenes/PreloadScene.js
// Loads ALL assets (tilemap, tilesets, sprites, audio) with a progress bar.
// Once done, starts WorldScene and launches UIScene on top.

class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  /** Loads all external image and audio files while updating a visual progress bar. */
  preload() {
    // ─── Progress bar UI ───────────────────────────────────────────
    const { width, height } = this.scale;

    const barBg = this.add.rectangle(width / 2, height / 2, 320, 20, 0x333333);
    const bar   = this.add.rectangle(width / 2 - 160, height / 2, 0, 20, 0x4ade80);
    bar.setOrigin(0, 0.5);

    const label = this.add.text(width / 2, height / 2 + 30, 'Loading...', {
      fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 320 * value;
      label.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    // ─── Tilemap ────────────────────────────────────────────────────
    // Export your Tiled map as JSON and place it here.
    // this.load.tilemapTiledJSON('map', 'assets/tilemaps/world.json');

    // ─── Tilesets ───────────────────────────────────────────────────
    // this.load.image('tiles', 'assets/tilesets/tileset.png');

    // ─── Sprite sheets ──────────────────────────────────────────────
    // Player: 4 rows (down / left / right / up), 3 frames each = 12 frames total
    // this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 });

    // NPC sprite sheet (same layout as player, or a static image)
    // this.load.spritesheet('npc', 'assets/sprites/npc.png', { frameWidth: 32, frameHeight: 32 });

    // Enemy sprite sheet
    // this.load.spritesheet('enemy', 'assets/sprites/enemy.png', { frameWidth: 32, frameHeight: 32 });

    // Item icons (single sprite sheet, 1 row, each icon 16×16)
    // this.load.spritesheet('items', 'assets/sprites/items.png', { frameWidth: 16, frameHeight: 16 });

    // ─── Audio ──────────────────────────────────────────────────────
    // this.load.audio('bgm',    'assets/audio/town.mp3');
    // this.load.audio('attack', 'assets/audio/attack.wav');
    // this.load.audio('pickup', 'assets/audio/pickup.wav');
    // this.load.audio('hurt',   'assets/audio/hurt.wav');
  }

  /** Transitions to the WorldScene and initializes the UI overlay once assets are ready. */
  create() {
    // Start the world and keep the HUD overlay running permanently on top
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }
}