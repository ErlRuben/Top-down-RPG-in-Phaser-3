// main.js — Phaser game configuration & entry point

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,           // Crisp pixel rendering — no blurring
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },   // Top-down: no gravity
      debug: false          // Set true to see hitboxes while developing
    }
  },
  // Scenes run in order: Boot → Preload → World (+ UI on top)
  scene: [BootScene, PreloadScene, WorldScene, UIScene, GameOverScene]
};

/** Entry point: waits for the browser window to finish loading before starting the Phaser instance. */
window.onload = () => {
  // Initialize the game only after all script files are loaded and parsed.
  const game = new Phaser.Game(config);
};
