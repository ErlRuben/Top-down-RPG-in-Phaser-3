class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Darken background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    this.add.text(width / 2, height / 2 - 100, 'GAME OVER', {
      fontSize: '48px', color: '#ef4444', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Summary of stats from the run
    const statsText = 
      `Enemies Defeated: ${this.registry.get('enemiesKilled')}\n` +
      `Total Damage: ${this.registry.get('totalDamageDealt')}\n` +
      `Dungeon Runs: ${this.registry.get('dungeonRuns')}\n` +
      `Total Gold: ${this.registry.get('totalGoldEarned')}`;

    this.add.text(width / 2, height / 2, statsText, {
      fontSize: '18px', color: '#94a3b8', align: 'center', lineSpacing: 10
    }).setOrigin(0.5);

    // Retry Button
    const btnBg = this.add.rectangle(width / 2, height / 2 + 120, 200, 50, 0x4ade80)
      .setInteractive({ useHandCursor: true });
    
    const btnText = this.add.text(width / 2, height / 2 + 120, 'RETRY ADVENTURE', {
      fontSize: '16px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Button Hover Effects
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x22c55e));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x4ade80));

    btnBg.on('pointerdown', () => {
      this._resetGame();
    });

    // Press Space to retry too
    this.input.keyboard.once('keydown-SPACE', () => this._resetGame());
  }

  _resetGame() {
    // Reset only vital stats for a fresh run, but keep lifetime stats if you want!
    // For a true retry, we'll reset HP and current gold.
    this.registry.set('playerHP', 100);
    this.registry.set('gold', 0);
    this.registry.set('inventory', []);
    
    this.scene.start('WorldScene', { spawnX: 200, spawnY: 200 });
    this.scene.launch('UIScene');
  }
}