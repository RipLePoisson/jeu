(function () {
  const SAVE_KEY = "jeu_save_v1";

  const States = {
    TITLE: "TITLE",
    ZONE_SELECT: "ZONE_SELECT",
    HANGAR: "HANGAR",
    SHOP: "SHOP",
    SETTINGS: "SETTINGS",
    RUN: "RUN", // placeholder for later
    PAUSE: "PAUSE", // later
  };

  function nowMs() { return performance.now(); }

  function defaultSave() {
    const unlockedZones = {};
    for (const z of (window.ZONES || [])) {
      if (z.unlockedByDefault) unlockedZones[z.id] = true;
    }
    return {
      version: 1,
      starbits: 0,
      weaponSlots: 3,
      passiveSlots: 3,
      unlockedZones,
      selectedZoneId: (window.ZONES && window.ZONES[0]) ? window.ZONES[0].id : null,

      settings: {
        music: true,
        sfx: true,
        screenshake: true,
      }
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const s = JSON.parse(raw);
      // minimal migrate safety
      if (!s || typeof s !== "object") return defaultSave();
      const d = defaultSave();
      return {
        ...d,
        ...s,
        settings: { ...d.settings, ...(s.settings || {}) },
        unlockedZones: { ...d.unlockedZones, ...(s.unlockedZones || {}) },
      };
    } catch {
      return defaultSave();
    }
  }

  function saveNow(save) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function rectHit(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // UI builder per screen
  function buildTitleUI(w, h) {
    const bw = Math.min(320, Math.floor(w * 0.76));
    const bh = 54;
    const gap = 14;
    const startY = Math.floor(h * 0.42);

    const cx = Math.floor((w - bw) / 2);
    return [
      { id: "play", label: "Play", x: cx, y: startY + (bh + gap) * 0, w: bw, h: bh },
      { id: "hangar", label: "Hangar", x: cx, y: startY + (bh + gap) * 1, w: bw, h: bh },
      { id: "shop", label: "Shop", x: cx, y: startY + (bh + gap) * 2, w: bw, h: bh },
      { id: "settings", label: "Settings", x: cx, y: startY + (bh + gap) * 3, w: bw, h: bh },
    ];
  }

  function buildTopBarButtons(w) {
    return [
      { id: "back", label: "Back", x: 14, y: 14, w: 96, h: 40 },
    ];
  }

  function buildZoneListUI(w, h, save) {
    const top = 70;
    const itemW = Math.min(520, Math.floor(w * 0.90));
    const itemH = 62;
    const gap = 12;
    const x = Math.floor((w - itemW) / 2);

    const zones = window.ZONES || [];
    const items = zones.map((z, i) => {
      const locked = !save.unlockedZones[z.id];
      return {
        id: z.id,
        x,
        y: top + i * (itemH + gap),
        w: itemW,
        h: itemH,
        title: z.name,
        meta: `Difficulty ${z.difficulty}  •  Reward x${z.rewardMult.toFixed(1)}`,
        locked,
        selected: save.selectedZoneId === z.id,
      };
    });

    const startBtn = {
      id: "startRun",
      label: "Start Run",
      x,
      y: top + items.length * (itemH + gap) + 18,
      w: itemW,
      h: 56,
      disabled: !save.selectedZoneId || !save.unlockedZones[save.selectedZoneId]
    };

    return { items, startBtn };
  }

  function buildHangarUI(w, h, save) {
    const top = 80;
    const panelW = Math.min(520, Math.floor(w * 0.90));
    const x = Math.floor((w - panelW) / 2);

    // Slot upgrades (simple)
    const rows = [];
    const rowH = 58;
    const gap = 12;

    function slotCost(n) {
      // cost for next slot level; simple curve
      // 3->4, 4->5, 5->6
      const step = n - 3;
      return [300, 800, 1600][step] ?? 9999;
    }

    const weaponNextCost = (save.weaponSlots >= 6) ? null : slotCost(save.weaponSlots);
    const passiveNextCost = (save.passiveSlots >= 6) ? null : slotCost(save.passiveSlots);

    rows.push({
      id: "upgradeWeaponSlots",
      title: "Weapon Slots",
      desc: `${save.weaponSlots} / 6`,
      cost: weaponNextCost,
      y: top,
    });

    rows.push({
      id: "upgradePassiveSlots",
      title: "Passive Slots",
      desc: `${save.passiveSlots} / 6`,
      cost: passiveNextCost,
      y: top + (rowH + gap),
    });

    const buttons = rows.map((r, i) => {
      const y = top + i * (rowH + gap);
      const bw = panelW;
      return {
        id: r.id,
        label: (r.cost == null) ? "MAXED" : `Upgrade • ${r.cost} $₿`,
        x,
        y,
        w: bw,
        h: rowH,
        disabled: (r.cost == null) || (save.starbits < r.cost),
        metaTitle: r.title,
        metaDesc: r.desc,
      };
    });

    return { x, top, panelW, buttons };
  }

  function buildShopUI(w, h, save) {
    const top = 80;
    const panelW = Math.min(520, Math.floor(w * 0.90));
    const x = Math.floor((w - panelW) / 2);
    const rowH = 58;
    const gap = 12;

    // For now: zone unlocks in shop (simple)
    const zones = window.ZONES || [];
    const lockedZones = zones.filter(z => !save.unlockedZones[z.id] && z.unlockCost);

    const items = lockedZones.slice(0, 6).map((z, i) => ({
      id: "unlockZone:" + z.id,
      label: `Unlock ${z.name} • ${z.unlockCost} $₿`,
      x,
      y: top + i * (rowH + gap),
      w: panelW,
      h: rowH,
      disabled: save.starbits < z.unlockCost,
      zId: z.id,
      zCost: z.unlockCost,
    }));

    if (items.length === 0) {
      items.push({
        id: "noItems",
        label: "No items available (everything unlocked)",
        x, y: top, w: panelW, h: rowH,
        disabled: true,
      });
    }

    return { x, top, panelW, items };
  }

  function buildSettingsUI(w, h, save) {
    const top = 90;
    const panelW = Math.min(520, Math.floor(w * 0.90));
    const x = Math.floor((w - panelW) / 2);
    const rowH = 54;
    const gap = 12;

    function toggleLabel(name, value) {
      return `${name}: ${value ? "ON" : "OFF"}`;
    }

    const items = [
      { id: "toggleMusic", label: toggleLabel("Music", save.settings.music) },
      { id: "toggleSfx", label: toggleLabel("SFX", save.settings.sfx) },
      { id: "toggleShake", label: toggleLabel("Screen Shake", save.settings.screenshake) },
      // dev helper (optional)
      { id: "devAddStarbits", label: "DEV: +500 Starbits" },
      { id: "resetSave", label: "Reset Save" },
    ].map((it, i) => ({
      ...it,
      x,
      y: top + i * (rowH + gap),
      w: panelW,
      h: rowH,
      disabled: false,
    }));

    return { items };
  }

  // Game object
  const Game = {
    state: States.TITLE,
    save: null,
    ui: {
      buttons: [],
      zones: null,
      hangar: null,
      shop: null,
      settings: null,
    },
    canvasW: 0,
    canvasH: 0,
    pointer: { x: 0, y: 0, down: false },
    toast: { msg: "", t: 0, tMax: 1.25 },

    init(w, h) {
      this.save = loadSave();
      this.resize(w, h);
      this.goto(States.TITLE);
    },

    resize(w, h) {
      this.canvasW = w;
      this.canvasH = h;
      // rebuild current UI on resize
      this.goto(this.state, true);
    },

    showToast(msg) {
      this.toast.msg = msg;
      this.toast.t = this.toast.tMax;
    },

    goto(next, keepState) {
      this.state = next;

      const w = this.canvasW, h = this.canvasH;

      // rebuild UI models
      this.ui.buttons = [];
      this.ui.zones = null;
      this.ui.hangar = null;
      this.ui.shop = null;
      this.ui.settings = null;

      if (next === States.TITLE) {
        this.ui.buttons = buildTitleUI(w, h);
      } else if (next === States.ZONE_SELECT) {
        this.ui.buttons = buildTopBarButtons(w);
        this.ui.zones = buildZoneListUI(w, h, this.save);
      } else if (next === States.HANGAR) {
        this.ui.buttons = buildTopBarButtons(w);
        this.ui.hangar = buildHangarUI(w, h, this.save);
      } else if (next === States.SHOP) {
        this.ui.buttons = buildTopBarButtons(w);
        this.ui.shop = buildShopUI(w, h, this.save);
      } else if (next === States.SETTINGS) {
        this.ui.buttons = buildTopBarButtons(w);
        this.ui.settings = buildSettingsUI(w, h, this.save);
      } else if (next === States.RUN) {
        // placeholder screen until we code the run
        this.ui.buttons = buildTopBarButtons(w);
      }

      if (!keepState) saveNow(this.save);
    },

    onPointerMove(x, y) {
      this.pointer.x = x;
      this.pointer.y = y;

      // hover logic (mostly for desktop)
      const all = [];
      if (this.ui.buttons) all.push(...this.ui.buttons);

      if (this.state === States.ZONE_SELECT && this.ui.zones) {
        all.push(...this.ui.zones.items);
        all.push(this.ui.zones.startBtn);
      }
      if (this.state === States.HANGAR && this.ui.hangar) all.push(...this.ui.hangar.buttons);
      if (this.state === States.SHOP && this.ui.shop) all.push(...this.ui.shop.items);
      if (this.state === States.SETTINGS && this.ui.settings) all.push(...this.ui.settings.items);

      for (const it of all) it.hovered = rectHit(it, x, y);
    },

    onPointerDown(x, y) {
      this.pointer.down = true;
      this.onPointerMove(x, y);
    },

    onPointerUp(x, y) {
      this.pointer.down = false;
      this.onPointerMove(x, y);

      // click
      const hit = (arr) => (arr || []).find(b => rectHit(b, x, y));
      let clicked = hit(this.ui.buttons);

      if (!clicked && this.state === States.ZONE_SELECT && this.ui.zones) {
        clicked = hit(this.ui.zones.items) || (rectHit(this.ui.zones.startBtn, x, y) ? this.ui.zones.startBtn : null);
      }
      if (!clicked && this.state === States.HANGAR && this.ui.hangar) clicked = hit(this.ui.hangar.buttons);
      if (!clicked && this.state === States.SHOP && this.ui.shop) clicked = hit(this.ui.shop.items);
      if (!clicked && this.state === States.SETTINGS && this.ui.settings) clicked = hit(this.ui.settings.items);

      if (!clicked || clicked.disabled) return;

      this.handleAction(clicked);
    },

    handleAction(item) {
      const id = item.id;

      if (this.state === States.TITLE) {
        if (id === "play") this.goto(States.ZONE_SELECT);
        if (id === "hangar") this.goto(States.HANGAR);
        if (id === "shop") this.goto(States.SHOP);
        if (id === "settings") this.goto(States.SETTINGS);
        return;
      }

      if (id === "back") {
        this.goto(States.TITLE);
        return;
      }

      if (this.state === States.ZONE_SELECT && this.ui.zones) {
        if (id === "startRun") {
          if (!this.save.selectedZoneId || !this.save.unlockedZones[this.save.selectedZoneId]) {
            this.showToast("Select an unlocked zone first.");
            return;
          }
          this.goto(States.RUN);
          this.showToast("Run mode is not coded yet (menus only).");
          return;
        }

        // zone item click
        const zone = (window.ZONES || []).find(z => z.id === id);
        if (zone) {
          if (!this.save.unlockedZones[zone.id]) {
            this.showToast("This zone is locked. Unlock it in the Shop.");
            return;
          }
          this.save.selectedZoneId = zone.id;
          saveNow(this.save);
          // rebuild list selection
          this.ui.zones = buildZoneListUI(this.canvasW, this.canvasH, this.save);
        }
        return;
      }

      if (this.state === States.HANGAR && this.ui.hangar) {
        if (id === "upgradeWeaponSlots") {
          this.buyWeaponSlot();
          return;
        }
        if (id === "upgradePassiveSlots") {
          this.buyPassiveSlot();
          return;
        }
      }

      if (this.state === States.SHOP && this.ui.shop) {
        if (id.startsWith("unlockZone:")) {
          const zId = id.split(":")[1];
          this.unlockZone(zId);
          return;
        }
      }

      if (this.state === States.SETTINGS && this.ui.settings) {
        if (id === "toggleMusic") this.save.settings.music = !this.save.settings.music;
        if (id === "toggleSfx") this.save.settings.sfx = !this.save.settings.sfx;
        if (id === "toggleShake") this.save.settings.screenshake = !this.save.settings.screenshake;

        if (id === "devAddStarbits") {
          this.save.starbits += 500;
          this.showToast("+500 Starbits");
        }

        if (id === "resetSave") {
          this.save = defaultSave();
          this.showToast("Save reset.");
        }

        saveNow(this.save);
        this.ui.settings = buildSettingsUI(this.canvasW, this.canvasH, this.save);
        return;
      }
    },

    buyWeaponSlot() {
      const s = this.save;
      if (s.weaponSlots >= 6) { this.showToast("Weapon Slots already maxed."); return; }
      const cost = [300, 800, 1600][s.weaponSlots - 3] ?? 9999;
      if (s.starbits < cost) { this.showToast("Not enough Starbits."); return; }
      s.starbits -= cost;
      s.weaponSlots += 1;
      saveNow(s);
      this.ui.hangar = buildHangarUI(this.canvasW, this.canvasH, s);
      this.showToast("Weapon Slot upgraded.");
    },

    buyPassiveSlot() {
      const s = this.save;
      if (s.passiveSlots >= 6) { this.showToast("Passive Slots already maxed."); return; }
      const cost = [300, 800, 1600][s.passiveSlots - 3] ?? 9999;
      if (s.starbits < cost) { this.showToast("Not enough Starbits."); return; }
      s.starbits -= cost;
      s.passiveSlots += 1;
      saveNow(s);
      this.ui.hangar = buildHangarUI(this.canvasW, this.canvasH, s);
      this.showToast("Passive Slot upgraded.");
    },

    unlockZone(zId) {
      const s = this.save;
      const z = (window.ZONES || []).find(zz => zz.id === zId);
      if (!z || !z.unlockCost) return;
      if (s.unlockedZones[zId]) { this.showToast("Already unlocked."); return; }
      if (s.starbits < z.unlockCost) { this.showToast("Not enough Starbits."); return; }

      s.starbits -= z.unlockCost;
      s.unlockedZones[zId] = true;
      saveNow(s);

      this.ui.shop = buildShopUI(this.canvasW, this.canvasH, s);
      this.showToast(`Unlocked: ${z.name}`);
    },

    update(dt) {
      // toast timer
      if (this.toast.t > 0) this.toast.t = Math.max(0, this.toast.t - dt);
    },

    render(ctx) {
      const w = this.canvasW, h = this.canvasH;
      Draw.bg(ctx, w, h);

      // Top info (Starbits)
      if (this.state !== States.TITLE) {
        Draw.smallLabel(ctx, w - 14, 16, "Starbits", "right");
        Draw.bigValue(ctx, w - 14, 34, `${this.save.starbits} $₿`, "right");
      }

      if (this.state === States.TITLE) {
        Draw.title(ctx, w, Math.floor(h * 0.22), "STARDRIFT");
        Draw.subtitle(ctx, w, Math.floor(h * 0.28), "Survive • Level up • Overlock");

        for (const b of this.ui.buttons) Draw.button(ctx, b);
        Draw.subtitle(ctx, w, h - 26, "Tap to play (menus only)");
      }

      if (this.state === States.ZONE_SELECT && this.ui.zones) {
        Draw.title(ctx, w, 36, "Select Zone");
        for (const it of this.ui.zones.items) Draw.listItem(ctx, it);
        Draw.button(ctx, this.ui.zones.startBtn);
        for (const b of this.ui.buttons) Draw.button(ctx, b);
      }

      if (this.state === States.HANGAR && this.ui.hangar) {
        Draw.title(ctx, w, 36, "Hangar");
        for (const b of this.ui.hangar.buttons) {
          // Draw meta text inside button
          Draw.button(ctx, b);
          // overlay: left aligned title + current value
          const padX = 14;
          const y1 = b.y + 16;
          const y2 = b.y + 34;
          Draw.smallLabel(ctx, b.x + padX, y1 - 6, b.metaTitle, "left");
          Draw.bigValue(ctx, b.x + padX, y2 - 6, b.metaDesc, "left");
        }
        for (const b of this.ui.buttons) Draw.button(ctx, b);
      }

      if (this.state === States.SHOP && this.ui.shop) {
        Draw.title(ctx, w, 36, "Shop");
        Draw.subtitle(ctx, w, 56, "Unlock zones with Starbits ($₿)");
        for (const it of this.ui.shop.items) Draw.button(ctx, it);
        for (const b of this.ui.buttons) Draw.button(ctx, b);
      }

      if (this.state === States.SETTINGS && this.ui.settings) {
        Draw.title(ctx, w, 36, "Settings");
        for (const it of this.ui.settings.items) Draw.button(ctx, it);
        for (const b of this.ui.buttons) Draw.button(ctx, b);
      }

      if (this.state === States.RUN) {
        Draw.title(ctx, w, 36, "Run (placeholder)");
        Draw.subtitle(ctx, w, 64, "Gameplay will be added next.");
        Draw.subtitle(ctx, w, 88, "Back to Title using the Back button.");
        for (const b of this.ui.buttons) Draw.button(ctx, b);
      }

      // Toast overlay
      if (this.toast.t > 0) {
        const t01 = this.toast.t / this.toast.tMax;
        Draw.toast(ctx, w, h, this.toast.msg, t01);
      }
    }
  };

  window.Game = Game;
})();
