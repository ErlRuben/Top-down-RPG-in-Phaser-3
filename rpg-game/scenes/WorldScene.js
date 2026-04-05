// rpg-game/scenes/WorldScene.js
// The main game world: tilemap, player, NPCs, enemies, items, warps, camera.

class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  // ─── init() receives data from warp transitions ──────────────────
  /** Receives spawn data passed from previous scenes (e.g., warp coordinates). */
  init(data) {
    this.spawnX = data?.spawnX ?? 200;
    this.spawnY = data?.spawnY ?? 200;
  }

  // ─────────────────────────────────────────────────────────────────
  /** Orchestrates the creation of the map, player, NPCs, enemies, and physics interactions. */
  create() {
    this._buildWorld();
    this._createPlayer();
    this._createNPCs();
    this._createEnemies();
    this._createItems();
    this._createWarps();
    this._setupCamera();
    this._setupInput();
    this._setupCollisions();

    // Listen for menu closures from the UI to reset interaction cooldowns
    const ui = this.scene.get('UIScene');
    ui.events.on('menuClosed', () => {
      this._lastInteractTime = this.time.now;
    }, this);

    // Tell UIScene we're ready so it can hook into our events
    this.events.emit('worldReady');
  }

  // ─── World / tilemap ─────────────────────────────────────────────
  /** Renders the environment, grid, and static collision obstacles. */
  _buildWorld() {
    // ── Placeholder colored world (no assets needed) ──────
    this.mapWidth  = 1600;
    this.mapHeight = 1200;

    // Grass background
    this.add.rectangle(0, 0, this.mapWidth, this.mapHeight, 0x2d5a27).setOrigin(0);

    // Draw a simple grid so movement is visible
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e3d1a, 0.4);
    for (let x = 0; x < this.mapWidth; x += 32)  grid.moveTo(x, 0).lineTo(x, this.mapHeight);
    for (let y = 0; y < this.mapHeight; y += 32) grid.moveTo(0, y).lineTo(this.mapWidth, y);
    grid.strokePath();

    // Some placeholder wall blocks (act as collision objects)
    this.walls = this.physics.add.staticGroup();
    const wallPositions = [
      [300, 200, 160, 32], [600, 400, 32, 160], [900, 150, 200, 32],
      [200, 500, 32, 200], [700, 700, 160, 32], [400, 900, 32, 160],
      [1100, 300, 200, 32], [1300, 600, 32, 200], [500,  300, 32,  80],
    ];
    wallPositions.forEach(([x, y, w, h]) => {
      const wall = this.add.rectangle(x, y, w, h, 0x5c3d1a);
      this.physics.add.existing(wall, true); // true = static body
      this.walls.add(wall);
    });

    this.add.circle(500, 420, 10, 0xf59e0b).setDepth(1);
    this.add.text(500, 440, "Settlement Camp", { fontSize: '12px', color: '#fbbf24' }).setOrigin(0.5);

    // Log benches near the fire
    this.add.rectangle(500, 380, 80, 10, 0x5c3d1a).setDepth(1);
    this.add.rectangle(500, 460, 80, 10, 0x5c3d1a).setDepth(1);

    // ── NPC Settlement Camp Physics ──
    this.tents = this.physics.add.staticGroup();
    // Use the same objects for visuals and physics to avoid displacement
    const t1 = this.add.rectangle(450, 340, 60, 40, 0x7c2d12).setDepth(1);
    const t2 = this.add.rectangle(550, 340, 60, 40, 0x7c2d12).setDepth(1);
    this.tents.add(t1);
    this.tents.add(t2);
  }

  // ─── Player ──────────────────────────────────────────────────────
  /** Spawns the player character and handles dynamic texture generation if needed. */
  _createPlayer() {
    // Only generate the texture if it doesn't already exist in the manager
    if (!this.textures.exists('playerTex')) {
      const pg = this.add.graphics();
      pg.fillStyle(0x3b82f6);
      pg.fillRect(0, 0, 28, 28);
      pg.generateTexture('playerTex', 28, 28);
      pg.destroy();
    }

    // Create the player using the generated texture
    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, 'playerTex');

    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    // Track which direction the player is facing (for NPC proximity)
    this.playerFacing = 'down';
  }

  /** Defines the frame-based animations for walking and idling in 4 directions. */
  _createPlayerAnimations() {
    // Standard 4-direction sprite sheet: rows = down(0), left(1), right(2), up(3)
    // Each row has 3 frames.
    const dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach((dir, row) => {
      if (!this.anims.exists(`walk-${dir}`)) {
        this.anims.create({
          key: `walk-${dir}`,
          frames: this.anims.generateFrameNumbers('player', {
            start: row * 3, end: row * 3 + 2
          }),
          frameRate: 8,
          repeat: -1
        });
      }
      if (!this.anims.exists(`idle-${dir}`)) {
        this.anims.create({
          key: `idle-${dir}`,
          frames: this.anims.generateFrameNumbers('player', { start: row * 3, end: row * 3 }),
          frameRate: 1,
          repeat: 0
        });
      }
    });
  }

  // ─── NPCs ────────────────────────────────────────────────────────
  /** Spawns non-player characters with unique colors, names, and dialogue data. */
  _createNPCs() {
    this.npcs = this.physics.add.staticGroup();

    // Hardcoded NPC data — replace with Tiled object layer when you have a map:
    // map.getObjectLayer('NPCs').objects.forEach(obj => { ... })
    const npcData = [
      { x: 450, y: 380, color: 0xf59e0b, name: 'Villager',  text: 'Welcome to Eldoria, traveller! Press E to talk to folks like me.' },
      { x: 550, y: 380, color: 0xa78bfa, name: 'Wizard',    text: 'I sense great power in you. Seek the ancient dungeon to the east.' },
      { x: 420, y: 460, color: 0xf87171, name: 'Merchant',  text: 'I have wares if you have gold! Step right up.' },
      { x: 620, y: 430, color: 0x34d399, name: 'Guard',     text: 'Stay within the camp light. Monsters lurk in the dark corners of the map.' },
    ];

    npcData.forEach(data => {
      const texKey = `npc_${data.name}`;
      if (!this.textures.exists(texKey)) {
        const g = this.add.graphics();
        g.fillStyle(data.color);
        g.fillRect(2, 8, 24, 24);
        g.fillStyle(0xffd700);
        g.fillCircle(14, 6, 4); 
        g.generateTexture(texKey, 28, 32);
        g.destroy();
      }

      const npc = this.npcs.create(data.x, data.y, texKey);
      npc.dialogText = data.text;
      npc.npcName    = data.name;
      npc.setDepth(5);

      // "!" bubble above NPC
      this.add.text(data.x, data.y - 28, '!', {
        fontSize: '14px', color: '#ffd700', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(6);
    });
  }

  // ─── Enemies ─────────────────────────────────────────────────────
  /** Spawns enemies and initializes their AI properties like aggro range and speed. */
  _createEnemies() {
    this.enemies = this.add.group();

    const enemySpawns = [
      { x: 800,  y: 350  },
      { x: 500,  y: 600  },
      { x: 1100, y: 400  },
      { x: 350,  y: 850  },
      { x: 1200, y: 700  },
    ];

    if (!this.textures.exists('enemyTex')) {
      const eg = this.add.graphics();
      eg.fillStyle(0xef4444);
      eg.fillRect(1, 1, 26, 26);
      eg.fillStyle(0xff0000);
      eg.fillCircle(14, 14, 5);
      eg.generateTexture('enemyTex', 28, 28);
      eg.destroy();
    }

    enemySpawns.forEach(pos => {
      const enemy = this.physics.add.sprite(pos.x, pos.y, 'enemyTex');
      enemy.hp          = 30;
      enemy.maxHp       = 30;
      enemy.speed       = 55;
      enemy.aggroRange  = 130;
      enemy.attackRange = 45; // Increased so they can reach the player while colliding
      enemy.attackCooldown = 0;
      enemy.patrolOriginX  = pos.x;
      enemy.patrolOriginY  = pos.y;
      enemy.setDepth(5);
      this.enemies.add(enemy);

      // HP bar (rendered as graphics, updated in update)
      enemy.hpBar = this.add.graphics().setDepth(8);
    });
  }

  // ─── Items ───────────────────────────────────────────────────────
  /** Scatters collectible items across the map with floating labels. */
  _createItems() {
    this.items = this.physics.add.staticGroup();

    const itemDefs = [
      { x: 450,  y: 180, type: 'healthPotion', color: 0xff6b8a, label: 'HP +20'  },
      { x: 650,  y: 550, type: 'gold',         color: 0xfbbf24, label: '10g'     },
      { x: 1000, y: 250, type: 'gold',         color: 0xfbbf24, label: '10g'     },
      { x: 250,  y: 650, type: 'healthPotion', color: 0xff6b8a, label: 'HP +20'  },
    ];

    itemDefs.forEach(def => {
      const texKey = `item_${def.type}`;
      if (!this.textures.exists(texKey)) {
        const g = this.add.graphics();
        g.fillStyle(def.color);
        g.fillCircle(8, 8, 8);
        g.generateTexture(texKey, 16, 16);
        g.destroy();
      }

      const item = this.items.create(def.x, def.y, texKey);
      item.itemType  = def.type;
      item.itemLabel = def.label;
      item.setDepth(4);

      // Floating label
      item.textLabel = this.add.text(def.x, def.y - 14, def.label, {
        fontSize: '10px', color: '#ffffff'
      }).setOrigin(0.5).setDepth(4);
    });
  }

  // ─── Warp zones ──────────────────────────────────────────────────
  /** Creates invisible trigger zones that handle transitions between different map areas. */
  _createWarps() {
    this.warps = [];

    // Example warp: walking to the right edge warps to a "DungeonScene"
    // For now it just reloads WorldScene at a different spawn point.
    const warpDefs = [
      { x: 1570, y: 400, w: 30, h: 200, targetScene: 'WorldScene', spawnX: 100, spawnY: 300, label: '→ Dungeon' },
    ];

    warpDefs.forEach(def => {
      // Visual indicator
      this.add.rectangle(def.x, def.y, def.w, def.h, 0x7c3aed, 0.4).setDepth(1);
      this.add.text(def.x, def.y - def.h / 2 - 10, def.label, {
        fontSize: '11px', color: '#c4b5fd'
      }).setOrigin(0.5).setDepth(2);

      // Invisible physics zone
      const zone = this.add.zone(def.x, def.y, def.w, def.h);
      this.physics.world.enable(zone);
      zone.body.setAllowGravity(false);
      zone.body.moves = false;
      zone.warpData = def;
      this.warps.push(zone);
    });
  }

  // ─── Camera ──────────────────────────────────────────────────────
  /** Configures the camera to follow the player within the defined world boundaries. */
  _setupCamera() {
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main
      .setBounds(0, 0, this.mapWidth, this.mapHeight)
      .startFollow(this.player, true, 0.1, 0.1); // 0.1 lerp = smooth follow
  }

  // ─── Input ───────────────────────────────────────────────────────
  /** Initializes keyboard listeners for movement, combat, and interaction. */
  _setupInput() {
    this.cursors     = this.input.keyboard.createCursorKeys();
    this.wasd        = this.input.keyboard.addKeys('W,A,S,D');
    this.interactKey = this.input.keyboard.addKey('E');
    this.attackKey   = this.input.keyboard.addKey('SPACE');
    this.invKey      = this.input.keyboard.addKey('I');

    // Prevent SPACE from scrolling the page
    this.input.keyboard.addKey('SPACE').on('down', () => {});
  }

  // ─── Collisions ──────────────────────────────────────────────────
  /** Defines the physical relationships and event triggers between different game objects. */
  _setupCollisions() {
    // Player ↔ walls (procedural blocks)
    this.physics.add.collider(this.player, this.walls);

    // Player ↔ NPCs (block movement)
    this.physics.add.collider(this.player, this.npcs);

    // Player ↔ Camp Tents
    this.physics.add.collider(this.player, this.tents);

    // Player ↔ Enemies (block movement so they don't overlap)
    this.physics.add.collider(this.player, this.enemies);

    // Player ↔ items (collect on overlap)
    this.physics.add.overlap(this.player, this.items, this._collectItem, null, this);

    // Player ↔ warp zones
    this.warps.forEach(zone => {
      this.physics.add.overlap(this.player, zone, () => this._warpTo(zone.warpData));
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // update() — runs every frame
  // ─────────────────────────────────────────────────────────────────
  /** The main game loop: updates player input, AI logic, and health bar positions every frame. */
  update(time, delta) {
    // Auto-close UI if player walks away
    const ui = this.scene.get('UIScene');
    if ((ui.dialogOpen || ui.shopOpen) && this._interactingNPC) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this._interactingNPC.x, this._interactingNPC.y);
      if (dist > 120) {
        if (ui.dialogOpen) ui._closeDialogue();
        if (ui.shopOpen) ui._setShopVisible(false);
        this._interactingNPC = null;
      }
    }

    this._handlePlayerMovement();
    this._handleInteract();
    this._handleAttack(time);
    this._updateEnemies(time, delta);
    this._updateHPBars();
  }

  // ─── Player movement ─────────────────────────────────────────────
  /** Reads movement keys and applies velocity/animations to the player object. */
  _handlePlayerMovement() {
    const left   = this.cursors.left.isDown  || this.wasd.A.isDown;
    const right  = this.cursors.right.isDown || this.wasd.D.isDown;
    const up     = this.cursors.up.isDown    || this.wasd.W.isDown;
    const down   = this.cursors.down.isDown  || this.wasd.S.isDown;
    const isMoving = left || right || up || down;

    let stamina = this.registry.get('playerStamina');
    // Only consider the player "running" if they are actually moving and holding Shift
    const isRunning = (this.cursors.shift.isDown || this.input.keyboard.addKey('SHIFT').isDown) && stamina > 0 && isMoving;
    const speed = isRunning ? 220 : 130;

    if (isRunning) {
      // Drain stamina slowly (reduced further to 0.1 for better feel)
      stamina = Math.max(0, stamina - 0.1);
      this.registry.set('playerStamina', stamina);
    } else {
      // Recover stamina when not running
      const maxStm = this.registry.get('playerMaxStamina');
      if (stamina < maxStm) this.registry.set('playerStamina', Math.min(maxStm, stamina + 0.2));
    }

    this.player.setVelocity(0);

    if (left)       { this.player.setVelocityX(-speed); this.playerFacing = 'left';  }
    else if (right) { this.player.setVelocityX(speed);  this.playerFacing = 'right'; }
    if (up)         { this.player.setVelocityY(-speed); this.playerFacing = 'up';    }
    else if (down)  { this.player.setVelocityY(speed);  this.playerFacing = 'down';  }

    // Diagonal speed normalization
    if ((left || right) && (up || down)) {
      this.player.body.velocity.normalize().scale(speed);
    }

    // ── Animations (comment out the "else" blocks if using placeholder texture) ──
    // if (left)       this.player.anims.play('walk-left',  true);
    // else if (right) this.player.anims.play('walk-right', true);
    // else if (up)    this.player.anims.play('walk-up',    true);
    // else if (down)  this.player.anims.play('walk-down',  true);
    // else            this.player.anims.play(`idle-${this.playerFacing}`, true);
  }

  // ─── Interact (E key) ────────────────────────────────────────────
  /** Checks for proximity to NPCs when the interaction key is pressed. */
  _handleInteract() {
    // If a menu is already open, let UIScene handle the 'E' press to close it.
    const uiScene = this.scene.get('UIScene');
    if (uiScene && (uiScene.dialogOpen || uiScene.shopOpen)) return;

    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return;

    // Cooldown check: ensures we don't restart a dialogue immediately after closing one
    const cooldown = 400; 
    if (this.time.now < (this._lastInteractTime || 0) + cooldown) return;

    // Find closest NPC within 70px
    let closest = null;
    let closestDist = 70;

    this.npcs.getChildren().forEach(npc => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < closestDist) { closest = npc; closestDist = d; }
    });

    if (closest) {
      console.log(`Interacting with: ${closest.npcName}`);

      // Special handling for the Merchant to open the shop
      if (closest.npcName?.toLowerCase() === 'merchant') {
        this.events.emit('showDialogue', {
          name: closest.npcName,
          text: closest.dialogText,
          items: [
            { name: 'healthPotion', label: 'HP Potion', price: 15 },
            { name: 'sword',        label: 'Iron Sword', price: 60 },
            { name: 'mystery_map',  label: 'Secret Map', price: 100 }
          ]
        });
        this._lastInteractTime = this.time.now;
        return;
      }

      // Emit to UIScene via scene event bus
      this.events.emit('showDialogue', {
        name: closest.npcName,
        text: closest.dialogText
      });
      this._lastInteractTime = this.time.now;
      this._interactingNPC = closest;
    }
  }

  // ─── Attack (SPACE key) ──────────────────────────────────────────
  /** Handles player attacks, enemy damage calculations, knockback, and death logic. */
  _handleAttack(time) {
    const stamina = this.registry.get('playerStamina') ?? 100;
    if (stamina < 15) return; // Require stamina to swing

    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return;

    // Consume stamina
    this.registry.set('playerStamina', Math.max(0, stamina - 15));

    const inventory = this.registry.get('inventory') || [];
    const hasSword = inventory.some(item => item.name === 'sword');
    const dmg = hasSword ? 10 : 2;
    const attackRange = 55;

    // Flash the player white briefly
    this.tweens.add({
      targets:  this.player,
      alpha:    0.5,
      duration: 80,
      yoyo:     true
    });

    this.enemies.getChildren().forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, enemy.x, enemy.y
      );
      if (dist <= attackRange) {
        // Deal damage
        enemy.hp -= dmg;
        
        // Track lifetime damage
        const totalDmg = (this.registry.get('totalDamageDealt') || 0) + dmg;
        this.registry.set('totalDamageDealt', totalDmg);

        // Knockback: push enemy away from player
        const angle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y, enemy.x, enemy.y
        );
        enemy.body.setVelocity(
          Math.cos(angle) * 250,
          Math.sin(angle) * 250
        );

        // Flash enemy red
        this.tweens.add({
          targets: enemy, alpha: 0.3, duration: 100, yoyo: true
        });

        // Damage popup
        const popup = this.add.text(enemy.x, enemy.y - 20, `-${dmg}`, {
          fontSize: '14px', color: hasSword ? '#ef4444' : '#ffffff', fontStyle: 'bold'
        }).setDepth(20);
        this.tweens.add({
          targets: popup, y: popup.y - 30, alpha: 0, duration: 700,
          onComplete: () => popup.destroy()
        });

        // Kill enemy if HP ≤ 0
        if (enemy.hp <= 0) {
          if (enemy.hpBar) enemy.hpBar.destroy();
          
          // Drop gold on death
          const gold = this.registry.get('gold') + 5;
          this.registry.set('gold', gold);
          this.events.emit('goldChanged', gold);
          
          const coinPop = this.add.text(enemy.x, enemy.y, '+5g', { fontSize: '12px', color: '#fbbf24' });
          this.tweens.add({ targets: coinPop, y: enemy.y - 50, alpha: 0, duration: 1000, onComplete: () => coinPop.destroy() });

          // Track lifetime stats
          this.registry.set('totalGoldEarned', (this.registry.get('totalGoldEarned') || 0) + 5);
          this.registry.set('enemiesKilled', (this.registry.get('enemiesKilled') || 0) + 1);
          
          enemy.destroy();
        }
      }
    });
  }

  // ─── Enemy AI ────────────────────────────────────────────────────
  /** Simple AI state machine: switches between chasing the player or returning to a home point. */
  _updateEnemies(time, delta) {
    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, enemy.x, enemy.y
      );

      if (dist < enemy.aggroRange) {
        // Chase player
        this.physics.moveToObject(enemy, this.player, enemy.speed);

        // Attack player if in range and cooldown expired
        if (dist < enemy.attackRange && time > enemy.attackCooldown) {
          enemy.attackCooldown = time + 1000; // 1s between attacks

          let hp = this.registry.get('playerHP');
          hp = Math.max(0, hp - 8);
          
          this.registry.set('playerHP', hp);
          this.events.emit('playerDamaged', hp);

          // Check for Game Over
          if (hp <= 0) {
            this.physics.pause();
            this.player.setTint(0xff0000);
            this.time.delayedCall(1000, () => {
              this.scene.stop('UIScene');
              this.scene.start('GameOverScene');
            });
          }

          // Hurt flash
          this.cameras.main.shake(120, 0.004);
          this.tweens.add({ targets: this.player, alpha: 0.4, duration: 150, yoyo: true });
        }
      } else {
        // Wander back toward patrol origin
        const homeDist = Phaser.Math.Distance.Between(
          enemy.x, enemy.y, enemy.patrolOriginX, enemy.patrolOriginY
        );
        if (homeDist > 10) {
          this.physics.moveTo(enemy, enemy.patrolOriginX, enemy.patrolOriginY, 30);
        } else {
          enemy.body.setVelocity(0);
        }
      }
    });
  }

  // ─── HP bar rendering ────────────────────────────────────────────
  /** Redraws enemy health bars as they move to ensure they remain positioned correctly. */
  _updateHPBars() {
    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.hpBar || !enemy.active) return;
      const bar = enemy.hpBar;
      bar.clear();
      // Background
      bar.fillStyle(0x1a1a1a);
      bar.fillRect(enemy.x - 16, enemy.y - 22, 32, 4);
      // HP fill
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      const col   = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfbbf24 : 0xef4444;
      bar.fillStyle(col);
      bar.fillRect(enemy.x - 16, enemy.y - 22, 32 * ratio, 4);
    });
  }

  // ─── Item collection ─────────────────────────────────────────────
  /** Logic for processing items: heals player, adds gold, or places items in the inventory. */
  _collectItem(player, item) {
    const type = item.itemType;

    if (type === 'healthPotion') {
      const maxHP = this.registry.get('playerMaxHP');
      const hp    = Math.min(maxHP, this.registry.get('playerHP') + 20);
      this.registry.set('playerHP', hp);
      this.events.emit('playerHealed', hp);
    } else if (type === 'gold') {
      const gold = this.registry.get('gold') + 10;
      this.registry.set('gold', gold);
      this.events.emit('goldChanged', gold);
      
      // Track total gold
      const total = (this.registry.get('totalGoldEarned') || 0) + 10;
      this.registry.set('totalGoldEarned', total);
    } else {
      // Generic item → add to inventory
      const currentInv = this.registry.get('inventory') || [];
      const newInv = [...currentInv, { name: item.itemType, label: item.itemLabel }];
      this.registry.set('inventory', newInv);
      this.events.emit('inventoryUpdated');
    }

    // Collect popup
    const popup = this.add.text(item.x, item.y - 10, `+${item.itemLabel}`, {
      fontSize: '13px', color: '#fbbf24', fontStyle: 'bold'
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({
      targets: popup, y: popup.y - 40, alpha: 0, duration: 800,
      onComplete: () => popup.destroy()
    });

    // Clean up the static world label
    if (item.textLabel) item.textLabel.destroy();
    
    item.destroy();
  }

  // ─── Scene warp transition ───────────────────────────────────────
  /** Orchestrates the fade-out and scene restart/start logic when entering a warp zone. */
  _warpTo(warpData) {
    // Prevent repeat triggers
    if (this._warping) return;
    this._warping = true;

    this.cameras.main.fade(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._warping = false;
      
      // Track dungeon runs
      this.registry.set('dungeonRuns', (this.registry.get('dungeonRuns') || 0) + 1);

      // Use restart if targeting the same scene, or start for a new one
      const method = warpData.targetScene === this.scene.key ? 'restart' : 'start';
      this.scene[method](warpData.targetScene, {
        spawnX: warpData.spawnX,
        spawnY: warpData.spawnY
      });
    });
  }
}