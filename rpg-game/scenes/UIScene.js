// scenes/UIScene.js
// Permanent HUD overlay: HP bar, gold, inventory panel, dialogue box.
// Runs on top of WorldScene at all times (launched, not started).

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  /** Main entry point for the UI Scene. Orchestrates the creation of all interface elements. */
  create() {
    this._buildHUD();
    this._buildDialogueBox();
    this._buildInventoryPanel();
    this._buildShopPanel();
    this._hookWorldEvents();
    this._setupInput();
  }

  // ─── HUD: HP bar + gold counter ──────────────────────────────────
  /** Initializes the persistent heads-up display (HP, Gold, and Controls). */
  _buildHUD() {
    const pad = 12;

    // ── HP bar background ──
    this.add.rectangle(pad, pad, 164, 18, 0x000000, 0.55)
      .setOrigin(0).setScrollFactor(0).setDepth(50);

    // HP fill bar
    this.hpFill = this.add.rectangle(pad + 2, pad + 2, 160, 14, 0x4ade80)
      .setOrigin(0).setScrollFactor(0).setDepth(51);

    // HP text label
    this.hpText = this.add.text(pad + 82, pad + 9, 'HP  100 / 100', {
      fontSize: '10px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

    // ── Gold counter ──
    this.goldText = this.add.text(pad, pad + 24, '⬡ 0 gold', {
      fontSize: '12px', color: '#fbbf24', fontStyle: 'bold'
    }).setOrigin(0).setScrollFactor(0).setDepth(51);

    // ── Controls hint ──
    this.add.text(this.scale.width - pad, this.scale.height - pad,
      'Arrows/WASD: move   SPACE: attack   E: talk   I: inventory',
      { fontSize: '10px', color: 'rgba(255,255,255,0.45)' }
    ).setOrigin(1).setScrollFactor(0).setDepth(50);

    this._refreshHUD();
  }

  /** Synchronizes the visual HP bar and Gold text with the current values in the global Registry. */
  _refreshHUD() {
    // Safety check: if text objects are destroyed (e.g. scene stopped), don't update
    if (!this.hpText || !this.goldText) return;

    const hp    = this.registry.get('playerHP')    ?? 100;
    const maxHP = this.registry.get('playerMaxHP') ?? 100;
    const gold  = this.registry.get('gold')        ?? 0;
    const ratio = Math.max(0, hp / maxHP);

    this.hpFill.width = Math.round(160 * ratio);
    const col = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfbbf24 : 0xef4444;
    this.hpFill.fillColor = col;
    this.hpText.setText(`HP  ${hp} / ${maxHP}`);
    this.goldText.setText(`⬡ ${gold} gold`);
  }

  // ─── Dialogue box (typewriter) ────────────────────────────────────
  /** Creates the dialogue interface components and sets up the typewriter state. */
  _buildDialogueBox() {
    const boxX = 10, boxY = 490, boxW = 780, boxH = 100;

    // Background
    this.dialogBg = this.add.rectangle(boxX, boxY, boxW, boxH, 0x0d1117, 0.92)
      .setOrigin(0).setScrollFactor(0).setDepth(60);

    // Border line on top
    this.dialogBorder = this.add.rectangle(boxX, boxY, boxW, 2, 0x4ade80)
      .setOrigin(0).setScrollFactor(0).setDepth(61);

    // Speaker name
    this.dialogName = this.add.text(boxX + 14, boxY + 10, '', {
      fontSize: '13px', color: '#fbbf24', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(61);

    // Dialogue body
    this.dialogText = this.add.text(boxX + 14, boxY + 30, '', {
      fontSize: '13px', color: '#e2e8f0',
      wordWrap: { width: boxW - 28 }, lineSpacing: 4
    }).setScrollFactor(0).setDepth(61);

    // "Press E to close" hint
    this.dialogHint = this.add.text(boxX + boxW - 14, boxY + boxH - 14,
      'Press E to close', {
        fontSize: '10px', color: 'rgba(255,255,255,0.4)'
      }
    ).setOrigin(1).setScrollFactor(0).setDepth(61);

    // Hidden by default
    this._setDialogVisible(false);
    this.dialogOpen    = false;
    this._typeTimer    = null;
    this._fullText     = '';
    this._charIndex    = 0;
  }

  /** Helper function to toggle the visibility of all dialogue-related components. */
  _setDialogVisible(v) {
    this.dialogBg.setVisible(v);
    this.dialogBorder.setVisible(v);
    this.dialogName.setVisible(v);
    this.dialogText.setVisible(v);
    this.dialogHint.setVisible(v);
  }

  /** Triggers the dialogue box to appear and begins the character-by-character typewriter animation. */
  _showDialogue(data) {
    // Clear any running typewriter
    if (this._typeTimer) { this._typeTimer.remove(); this._typeTimer = null; }

    this.dialogName.setText(data.name ?? '');
    this.dialogText.setText('');
    this._fullText  = data.text ?? '';
    this._charIndex = 0;
    this._setDialogVisible(true);
    this.dialogOpen = true;

    // Typewriter effect: one character every 30ms
    this._typeTimer = this.time.addEvent({
      delay: 30,
      repeat: this._fullText.length - 1,
      callback: () => {
        this._charIndex++;
        this.dialogText.setText(this._fullText.slice(0, this._charIndex));
      }
    });
  }

  /** Closes the dialogue box or completes the typewriter text immediately if still typing. */
  _closeDialogue() {
    if (this._typeTimer) {
      // If still typing, first press shows full text immediately
      if (this._charIndex < this._fullText.length) {
        this._typeTimer.remove();
        this._typeTimer = null;
        this.dialogText.setText(this._fullText);
        this._charIndex = this._fullText.length;
        return;
      }
    }
    this._setDialogVisible(false);
    this.dialogOpen = false;
  }

  // ─── Inventory panel ─────────────────────────────────────────────
  /** Constructs the inventory grid, stats sidebar, and background panel. */
  _buildInventoryPanel() {
    const panX = 180, panY = 80, panW = 440, panH = 380;

    this.invBg = this.add.rectangle(panX, panY, panW, panH, 0x0d1117, 0.95)
      .setOrigin(0).setScrollFactor(0).setDepth(70);

    // Store reference to the top accent line so we can hide it
    this.invLine = this.add.rectangle(panX, panY, panW, 2, 0x7c3aed)
      .setOrigin(0).setScrollFactor(0).setDepth(71);

    this.invTitle = this.add.text(panX + panW / 2, panY + 18, 'Inventory', {
      fontSize: '16px', color: '#c4b5fd', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(71);

    this.invClose = this.add.text(panX + panW - 14, panY + 14, '[ I ] close', {
      fontSize: '10px', color: 'rgba(255,255,255,0.4)'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(71);

    // Item slots (4×4 grid)
    this.invSlots = [];
    const cols = 4, slotSize = 48, startX = panX + 26, startY = panY + 50;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = startX + col * (slotSize + 10);
        const sy = startY + row * (slotSize + 10);
        const slot = this.add.rectangle(sx, sy, slotSize, slotSize, 0x1e293b)
          .setOrigin(0).setScrollFactor(0).setDepth(71);
        const slotBorder = this.add.rectangle(sx, sy, slotSize, slotSize)
          .setOrigin(0).setScrollFactor(0).setDepth(71).setStrokeStyle(1, 0x334155);
        const slotLabel = this.add.text(sx + slotSize / 2, sy + slotSize / 2, '', {
          fontSize: '10px', color: '#94a3b8', wordWrap: { width: slotSize - 4 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(72);
        this.invSlots.push({ slot, slotBorder, slotLabel });
      }
    }

    // Stats sidebar
    this.invStats = this.add.text(panX + 26 + 4 * 58 + 10, panY + 50, '', {
      fontSize: '12px', color: '#94a3b8', lineSpacing: 6
    }).setScrollFactor(0).setDepth(71);

    this._setInvVisible(false);
    this.invOpen = false;
  }

  /** Helper function to toggle the visibility of the inventory panel and all 16 slots. */
  _setInvVisible(v) {
    this.invBg.setVisible(v);
    this.invLine.setVisible(v);
    this.invTitle.setVisible(v);
    this.invClose.setVisible(v);
    this.invStats.setVisible(v);
    this.invSlots.forEach(s => {
      s.slot.setVisible(v);
      s.slotBorder.setVisible(v);
      s.slotLabel.setVisible(v);
    });
  }

  /** Updates the text inside inventory slots and the stats sidebar with current registry data. */
  _renderInventory() {
    const inv   = this.registry.get('inventory') ?? [];
    const hp    = this.registry.get('playerHP')  ?? 100;
    const maxHP = this.registry.get('playerMaxHP') ?? 100;
    const gold  = this.registry.get('gold') ?? 0;
    
    // Lifetime Stats
    const totalGold = this.registry.get('totalGoldEarned') ?? 0;
    const totalDmg  = this.registry.get('totalDamageDealt') ?? 0;
    const kills     = this.registry.get('enemiesKilled') ?? 0;
    const runs      = this.registry.get('dungeonRuns') ?? 0;

    // Check if sword is in inventory
    const hasSword = inv.some(item => item.name === 'sword');

    this.invSlots.forEach((s, i) => {
      s.slotLabel.setText(inv[i] ? inv[i].label ?? inv[i].name : '');
    });

    this.invStats.setText(
      `[ CURRENT ]\n` +
      `HP:     ${hp}/${maxHP}\n` +
      `Gold:   ${gold}\n` +
      `Weapon: ${hasSword ? 'Sword' : 'None'}\n\n` +
      `[ LIFETIME ]\n` +
      `Earned: ${totalGold}g\n` +
      `Damage: ${totalDmg}\n` +
      `Kills:  ${kills}\n` +
      `Runs:   ${runs}\n\n` +
      `Items ${inv.length} / 16\n\n` +
      `Controls:\n` +
      `SPACE: attack\n` +
      `E: talk to NPC\n` +
      `I: inventory`
    );
  }

  _toggleInventory() {
    this.invOpen = !this.invOpen;
    this._setInvVisible(this.invOpen);
    if (this.invOpen) this._renderInventory();
  }

  // ─── Shop Panel ──────────────────────────────────────────────────
  /** Constructs the shop overlay for buying items. */
  _buildShopPanel() {
    const panX = 180, panY = 80, panW = 440, panH = 380;

    this.shopBg = this.add.rectangle(panX, panY, panW, panH, 0x0d1117, 0.98)
      .setOrigin(0).setScrollFactor(0).setDepth(80).setVisible(false);

    this.shopTitle = this.add.text(panX + panW / 2, panY + 20, 'Merchant Shop', {
      fontSize: '18px', color: '#fbbf24', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(81).setVisible(false);

    this.shopItemContainer = this.add.container(panX + 40, panY + 60).setDepth(81);
    this.shopOpen = false;
    this._lastShopData = null; // Cache for UI refreshes
  }

  /** Toggles the shop visibility and populates items. */
  _setShopVisible(v, data = null) {
    this.shopOpen = v;
    if (data) this._lastShopData = data;

    this.shopBg.setVisible(v);
    this.shopTitle.setVisible(v);
    this.shopItemContainer.removeAll(true);

    const inv = this.registry.get('inventory') ?? [];

    if (v && data) {
      data.items.forEach((item, i) => {
        const y = i * 50;

        // Check if item is already owned (for unique items like swords/maps)
        const isOwned = inv.some(owned => owned.name === item.name);
        const isUnique = item.name === 'sword' || item.name === 'mystery_map';
        const isSoldOut = isUnique && isOwned;
        
        // Item Row Background
        const row = this.add.rectangle(0, y, 360, 40, isSoldOut ? 0x0f172a : 0x1e293b).setOrigin(0);
        
        const nameText = this.add.text(15, y + 12, item.label, { fontSize: '14px', color: isSoldOut ? '#475569' : '#f8fafc' });
        const priceLabel = isSoldOut ? 'SOLD OUT' : `${item.price}g`;
        const priceText = this.add.text(280, y + 12, priceLabel, { 
          fontSize: '14px', 
          color: isSoldOut ? '#ef4444' : '#fbbf24', 
          fontStyle: 'bold' 
        });

        if (!isSoldOut) {
          row.setInteractive({ useHandCursor: true });
          row.on('pointerover', () => row.setFillStyle(0x334155));
          row.on('pointerout',  () => row.setFillStyle(0x1e293b));
          row.on('pointerdown', () => this._buyItem(item));
        }

        this.shopItemContainer.add([row, nameText, priceText]);
      });

      const hint = this.add.text(180, 280, 'Click item to buy • Press E to close', { 
        fontSize: '11px', color: 'rgba(255,255,255,0.4)' 
      }).setOrigin(0.5);
      this.shopItemContainer.add(hint);
    }
  }

  /** Processes the purchase: checks gold, updates inventory, and refreshes UI. */
  _buyItem(item) {
    const currentGold = this.registry.get('gold') ?? 0;
    const inv = this.registry.get('inventory') ?? [];

    // Guard clause: Prevent purchase of unique items already in inventory
    const isUnique = item.name === 'sword' || item.name === 'mystery_map';
    if (isUnique && inv.some(owned => owned.name === item.name)) return;

    if (currentGold >= item.price) {
      // Update Gold
      const newGold = currentGold - item.price;
      this.registry.set('gold', newGold);
      
      // Update Inventory
      inv.push({ name: item.name, label: item.label });
      this.registry.set('inventory', inv);

      // Trigger updates across scenes
      this._refreshHUD();
      this.events.emit('inventoryUpdated');
      
      // Immediately refresh the shop UI to show the "SOLD OUT" state
      if (isUnique) this._setShopVisible(true, this._lastShopData);

      // Feedback (optional: you could add a sound effect here)
      console.log(`Bought ${item.label}!`);
    } else {
      // Visual feedback for insufficient funds
      this.cameras.main.shake(100, 0.002);
    }
  }

  // ─── Hook into WorldScene events ─────────────────────────────────
  _hookWorldEvents() {
    const world = this.scene.get('WorldScene');

    const setupListeners = (targetScene) => {
      // Clean up existing listeners to prevent memory leaks/duplicates
      targetScene.events.off('showDialogue');
      targetScene.events.off('playerDamaged');
      targetScene.events.off('playerHealed');
      targetScene.events.off('goldChanged');
      targetScene.events.off('inventoryUpdated');
      targetScene.events.off('openShop');

      // Attach fresh listeners
      targetScene.events.on('showDialogue', (data) => this._showDialogue(data), this);
      targetScene.events.on('playerDamaged', () => this._refreshHUD(), this);
      targetScene.events.on('playerHealed', () => this._refreshHUD(), this);
      targetScene.events.on('goldChanged', () => this._refreshHUD(), this);
      targetScene.events.on('inventoryUpdated', () => {
        if (this.invOpen) this._renderInventory();
      }, this);
      targetScene.events.on('openShop', (data) => this._setShopVisible(true, data), this);
    };

    // If WorldScene is already active, hook now. Otherwise, wait for its create event.
    if (world.scene.isActive()) {
      setupListeners(world);
    } else {
      world.events.once('create', () => setupListeners(world));
    }

    // Use the global game event bus to detect when WorldScene starts or restarts
    const onSceneStart = (scene) => {
      if (scene.sys.settings.key === 'WorldScene') {
        scene.events.once('create', () => setupListeners(scene));
      }
    };

    this.game.events.on('start', onSceneStart);

    // Clean up global listeners when this UI scene is stopped/shutdown
    this.events.once('shutdown', () => {
      this.game.events.off('start', onSceneStart);
    });
  }

  // ─── Input ───────────────────────────────────────────────────────
  /** Sets up UI-specific keyboard listeners that aren't tied to physical world movement. */
  _setupInput() {
    this.invKey   = this.input.keyboard.addKey('I');
    this.closeKey = this.input.keyboard.addKey('E');

    this.invKey.on('down', () => this._toggleInventory());
  }

  // ─── update ──────────────────────────────────────────────────────
  /** UI update loop. Currently empty as the HUD uses an efficient event-based update system. */
  update() {
    // Handle closing menus in update so WorldScene has a chance to ignore the input first
    if (Phaser.Input.Keyboard.JustDown(this.closeKey)) {
      if (this.dialogOpen) this._closeDialogue();
      else if (this.shopOpen) this._setShopVisible(false);
    }
  }
}