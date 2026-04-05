class StartScene extends Phaser.Scene {
  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;
    this.add.text(width/2, 100, 'ELDORIA REGRESSION', { fontSize: '42px', color: '#4ade80', fontStyle: 'bold' }).setOrigin(0.5);

    const createBtn = (y, label, cb) => {
      const btn = this.add.rectangle(width/2, y, 240, 40, 0x1e293b).setInteractive({ useHandCursor: true });
      const txt = this.add.text(width/2, y, label, { fontSize: '16px', color: '#f8fafc' }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(0x334155));
      btn.on('pointerout', () => btn.setFillStyle(0x1e293b));
      btn.on('pointerdown', cb);
    };

    createBtn(250, 'START ADVENTURE', () => {
      this.scene.start('WorldScene');
      this.scene.launch('UIScene');
    });
    createBtn(300, 'LIFE HISTORY', () => this._showLeaderboard());
    createBtn(350, 'SETTINGS', () => {
      const currentVol = this.sound.volume;
      const newVol = currentVol === 1 ? 0 : 1;
      this.sound.setVolume(newVol);
      alert(`Main Sound: ${newVol === 1 ? 'ON' : 'OFF'}`);
    });
  }

  _showLeaderboard() {
    const { width, height } = this.scale;
    // Create a container for easy cleanup
    const container = this.add.container(0, 0).setDepth(100);
    
    const overlay = this.add.rectangle(width/2, height/2, 450, 480, 0x000000, 0.95);
    const title = this.add.text(width/2, 100, 'LIFE HISTORY (TOP 10)', { fontSize: '22px', color: '#fbbf24', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([overlay, title]);

    const history = JSON.parse(localStorage.getItem('lifeHistory') || '[]');
    history.forEach((score, i) => {
      const scoreTxt = this.add.text(width/2 - 180, 150 + (i*30), 
        `${i+1}. ${score.date} - Gold: ${score.gold} | Kills: ${score.kills}`, 
        { fontSize: '14px', color: '#94a3b8' });
      container.add(scoreTxt);
    });

    const close = this.add.text(width/2, 520, '[ CLICK TO CLOSE ]', { fontSize: '16px', color: '#ef4444', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    container.add(close);
    close.on('pointerdown', () => {
      overlay.destroy();
      title.destroy();
      close.destroy();
      this.scene.restart();
      container.destroy();
    });
  }
}