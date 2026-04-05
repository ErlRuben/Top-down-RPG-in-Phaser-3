// scenes/BootScene.js
// First scene to run. Sets up game-wide registry defaults then moves to PreloadScene.

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /** Sets up the initial global variables for the game (HP, Gold, Inventory) then passes to Preloader. */
  create() {
    // Reset all shared game state to defaults for a fresh start on refresh.
    this.registry.set('playerHP',    100);
    this.registry.set('playerMaxHP', 100);
    this.registry.set('gold',        0);
    this.registry.set('inventory',   []);

    // Initialize Lifetime Stats
    this.registry.set('totalGoldEarned',  this.registry.get('totalGoldEarned') ?? 0);
    this.registry.set('totalDamageDealt', this.registry.get('totalDamageDealt') ?? 0);
    this.registry.set('enemiesKilled',    this.registry.get('enemiesKilled') ?? 0);
    this.registry.set('dungeonRuns',      this.registry.get('dungeonRuns') ?? 0);

    // Move on to asset loading
    this.scene.start('PreloadScene');
  }
}