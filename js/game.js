(function () {
  const SAVE_KEY = "jeu_save_v1";

  const States = {
    TITLE: "TITLE",
    ZONE_SELECT: "ZONE_SELECT",
    HANGAR: "HANGAR",
    SHOP: "SHOP",
    SETTINGS: "SETTINGS",
    RUN: "RUN",
  };

  const BASES = {
    maxHp: 120,
    moveSpeed: 78,
    pickupRadius: 34,
  };

  const STAT_LEVEL_VALUES = {
    damage_pct: 8,
    cooldown_pct: 6,
    projectile_count: 1,
    area_pct: 10,
    max_hp: 16,
    regen: 0.35,
    move_speed: 6,
    life_steal: 0.6,
    pickup_radius: 6,
    xp_pct: 8,
    starbits_pct: 10,
    extra_choice: 1,
  };

  const WEAPON_LEVEL_SCALE = [1, 1.12, 1.24, 1.38, 1.54, 1.72, 1.92, 2.15];

  function nowMs() { return performance.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  const Audio = {
    ctx: null,
    master: null,
    musicTimer: 0,
    musicStep: 0,
    lastShot: 0,
    init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.ctx.destination);
    },
    play(freq, duration, type) {
      if (!Game.save || !Game.save.settings.sfx || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    },
    click() { this.play(520, 0.08, "square"); },
    xp() { this.play(740, 0.1, "triangle"); },
    levelup() { this.play(320, 0.3, "sawtooth"); },
    hit() { this.play(140, 0.2, "square"); },
    death() { this.play(80, 0.5, "sawtooth"); },
    shot() {
      if (!this.ctx) return;
      const now = performance.now();
      if (now - this.lastShot < 120) return;
      this.lastShot = now;
      this.play(220, 0.06, "square");
    },
    updateMusic(dt) {
      if (!Game.save || !Game.save.settings.music || !this.ctx) return;
      this.musicTimer -= dt;
      if (this.musicTimer <= 0) {
        const pattern = [220, 247, 196, 247, 261, 247];
        const freq = pattern[this.musicStep % pattern.length];
        this.play(freq, 0.25, "sine");
        this.musicStep += 1;
        this.musicTimer = 1.2;
      }
    }
  };

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

  function getWeaponDef(id) {
    return (window.WEAPONS || []).find(w => w.id === id);
  }

  function getStatDef(id) {
    return (window.STATS || []).find(s => s.id === id);
  }

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

    const rows = [];
    const rowH = 58;
    const gap = 12;

    function slotCost(n) {
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

  function buildRunChoiceUI(w, h, choices, title) {
    const panelW = Math.min(520, Math.floor(w * 0.92));
    const panelH = Math.min(400, Math.floor(h * 0.64));
    const x = Math.floor((w - panelW) / 2);
    const y = Math.floor((h - panelH) / 2);
    const rowH = 74;
    const gap = 12;

    const buttons = choices.map((choice, i) => ({
      id: choice.id,
      label: choice.label,
      desc: choice.desc,
      x: x + 16,
      y: y + 64 + i * (rowH + gap),
      w: panelW - 32,
      h: rowH,
    }));

    return { x, y, w: panelW, h: panelH, title, buttons };
  }

  function createRun(zone, save) {
    const player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 10,
      dir: { x: 0, y: -1 },
      hp: BASES.maxHp,
      maxHp: BASES.maxHp,
      regen: 0,
      moveSpeed: BASES.moveSpeed,
      shield: 0,
      shieldMax: 0,
      shieldDelay: 0,
    };

    const weapons = [{ id: "front_laser", level: 1, cooldown: 0 }];

    return {
      active: true,
      time: 0,
      kills: 0,
      level: 1,
      xp: 0,
      xpToNext: 28,
      starbitsEarned: 0,
      zone,
      player,
      stats: {},
      passives: {},
      weapons,
      bullets: [],
      missiles: [],
      enemies: [],
      orbs: [],
      pulses: [],
      wells: [],
      drones: [],
      effects: [],
      joystick: { active: false, id: null, anchorX: 0, anchorY: 0, x: 0, y: 0, dx: 0, dy: 0, radius: 44 },
      spawn: { timer: 0, rate: 1.2 },
      overlay: null,
      overlock: { pending: false, weaponId: null },
      lastDamageAt: 0,
      shake: { time: 0, mag: 0 },
      saveRef: save,
      weaponSlots: save.weaponSlots,
      passiveSlots: save.passiveSlots,
    };
  }

  function calcStats(run) {
    const stats = {
      damage_pct: 0,
      cooldown_pct: 0,
      projectile_count: 0,
      area_pct: 0,
      max_hp: 0,
      regen: 0,
      move_speed: 0,
      life_steal: 0,
      pickup_radius: 0,
      xp_pct: 0,
      starbits_pct: 0,
      extra_choice: 0,
    };
    for (const [id, lvl] of Object.entries(run.passives)) {
      const add = STAT_LEVEL_VALUES[id] || 0;
      if (id === "extra_choice") stats[id] += Math.min(add * lvl, 2);
      else stats[id] += add * lvl;
    }
    run.stats = stats;
    run.player.maxHp = BASES.maxHp + stats.max_hp;
    run.player.regen = stats.regen;
    run.player.moveSpeed = BASES.moveSpeed * (1 + stats.move_speed / 100);
  }

  function scaleWeaponValue(base, level) {
    const scale = WEAPON_LEVEL_SCALE[level - 1] || WEAPON_LEVEL_SCALE[WEAPON_LEVEL_SCALE.length - 1];
    return base * scale;
  }

  function getWeaponPower(run, id, level) {
    const def = getWeaponDef(id);
    const stats = run.stats;
    const dmgMult = 1 + stats.damage_pct / 100;
    const areaMult = 1 + stats.area_pct / 100;
    const cooldownMult = 1 / (1 + stats.cooldown_pct / 100);
    const projBonus = stats.projectile_count;
    const base = def.base || {};
    return { def, dmgMult, areaMult, cooldownMult, projBonus, base, level };
  }

  function enemyTypes() {
    return [
      { id: "drifter", hp: 32, speed: 28, radius: 10, color: "#ff6b6b", damage: 10 },
      { id: "sprinter", hp: 20, speed: 44, radius: 8, color: "#ffb54f", damage: 8 },
      { id: "brute", hp: 70, speed: 18, radius: 13, color: "#b388ff", damage: 14 },
    ];
  }

  function spawnEnemy(run) {
    const types = enemyTypes();
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const distSpawn = 220 + Math.random() * 120;
    const enemy = {
      x: run.player.x + Math.cos(angle) * distSpawn,
      y: run.player.y + Math.sin(angle) * distSpawn,
      hp: type.hp + run.time * 0.2,
      maxHp: type.hp + run.time * 0.2,
      speed: type.speed + run.time * 0.02,
      radius: type.radius,
      type,
      damage: type.damage,
      hitCooldown: 0,
      slow: 0,
      stun: 0,
      mark: 0,
    };
    run.enemies.push(enemy);
  }

  function dropOrb(run, enemy, amount, bonusStarbits) {
    run.orbs.push({ x: enemy.x, y: enemy.y, value: amount, pull: 0, starbits: bonusStarbits || 0 });
  }

  function applyDamage(run, enemy, dmg, source, extra) {
    if (enemy.hp <= 0) return;
    enemy.hp -= dmg;
    enemy.lastHit = source || null;
    if (extra && extra.mark) enemy.mark = extra.mark;
    const lifeStealMult = run.stats.life_steal / 100;
    if (lifeStealMult > 0 && dmg > 0) {
      const zoneBoost = (run.overlock && run.overlock.drainBoost && extra && extra.inDrainZone) ? run.overlock.drainBoost : 1;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + dmg * lifeStealMult * zoneBoost);
    }
    if (enemy.hp <= 0) {
      run.kills += 1;
      const baseXp = 6 + Math.floor(run.level * 0.5);
      let xpValue = baseXp;
      let starBonus = 0;
      if (enemy.mark) {
        xpValue += 4;
        starBonus += 1;
      }
      if (source && source.starDropBonus) starBonus += 1;
      dropOrb(run, enemy, xpValue, starBonus);
    }
  }

  function updateWeapons(run, dt) {
    for (const weapon of run.weapons) {
      const power = getWeaponPower(run, weapon.id, weapon.level);
      const def = power.def;
      if (!def) continue;

      if (weapon.cooldown > 0) weapon.cooldown -= dt;

      if (weapon.id === "front_laser") {
        const cd = power.base.cooldown * power.cooldownMult * (weapon.overlock && weapon.overlock.fast ? 0.6 : 1) * (weapon.overlock && weapon.overlock.heavy ? 1.4 : 1);
        if (weapon.cooldown <= 0) {
          const count = power.base.projectiles + power.projBonus + (weapon.level >= 4 ? 1 : 0);
          const spread = 0.22 + count * 0.02;
          for (let i = 0; i < count; i++) {
            const angle = Math.atan2(run.player.dir.y, run.player.dir.x) + rand(-spread, spread);
            run.bullets.push({
              x: run.player.x + Math.cos(angle) * 8,
              y: run.player.y + Math.sin(angle) * 8,
              vx: Math.cos(angle) * 180,
              vy: Math.sin(angle) * 180,
              radius: 3,
              life: 1.2,
              damage: scaleWeaponValue(power.base.damage, weapon.level) * power.dmgMult * (weapon.overlock && weapon.overlock.heavy ? 1.4 : 1),
              splash: weapon.overlock && weapon.overlock.splash,
              source: weapon,
            });
          }
          weapon.cooldown = cd;
          Audio.shot();
        }
      }

      if (weapon.id === "orbit_orbs") {
        const baseCount = power.base.orbs + power.projBonus;
        const count = weapon.overlock && weapon.overlock.triple ? baseCount * 3 : baseCount + Math.floor(weapon.level / 3);
        const orbitRadius = power.base.orbitRadius * power.areaMult;
        const orbitSpeed = power.base.orbitSpeed * (weapon.overlock && weapon.overlock.triple ? 3 : 1);
        weapon.orbs = count;
        weapon.orbitRadius = orbitRadius;
        weapon.orbitSpeed = orbitSpeed;
      }

      if (weapon.id === "homing_missiles") {
        const cd = power.base.cooldown * power.cooldownMult;
        if (weapon.cooldown <= 0) {
          const count = power.base.missiles + power.projBonus + (weapon.level >= 4 ? 1 : 0);
          for (let i = 0; i < count; i++) {
            run.missiles.push({
              x: run.player.x,
              y: run.player.y,
              vx: rand(-20, 20),
              vy: rand(-20, 20),
              speed: 140,
              damage: scaleWeaponValue(power.base.damage, weapon.level) * power.dmgMult,
              life: 3.2,
              overlock: weapon.overlock,
              source: weapon,
            });
          }
          weapon.cooldown = cd;
          Audio.shot();
        }
      }

      if (weapon.id === "cutting_beam") {
        const dps = scaleWeaponValue(power.base.dps, weapon.level) * power.dmgMult;
        weapon.beam = {
          range: power.base.range * power.areaMult,
          dps,
          ring: weapon.overlock && weapon.overlock.ring,
        };
        if (weapon.overlock && weapon.overlock.ring) {
          weapon.ringSpeed = 1.1 + run.stats.move_speed / 120;
        }
      }

      if (weapon.id === "chain_lightning") {
        const cd = power.base.cooldown * power.cooldownMult;
        if (weapon.cooldown <= 0) {
          const range = power.base.range * (weapon.overlock && weapon.overlock.longRange ? 1.4 : 1);
          const chains = power.base.chains + power.projBonus + (weapon.level >= 5 ? 1 : 0);
          const damage = scaleWeaponValue(power.base.damage, weapon.level) * power.dmgMult;
          const targets = [];
          let current = findNearestEnemy(run, run.player.x, run.player.y, range, weapon.overlock && weapon.overlock.nearOnly);
          let lastPos = { x: run.player.x, y: run.player.y };
          let chainsLeft = chains;
          while (current && chainsLeft > 0) {
            targets.push(current);
            lastPos = { x: current.x, y: current.y };
            chainsLeft -= 1;
            current = findNearestEnemy(run, lastPos.x, lastPos.y, range, false, targets);
          }
          for (const target of targets) {
            applyDamage(run, target, damage, weapon, { mark: weapon.overlock && weapon.overlock.tag ? 4 : 0 });
            if (weapon.overlock && weapon.overlock.stun) target.stun = Math.max(target.stun, 0.5);
            if (weapon.overlock && weapon.overlock.slow) target.slow = Math.max(target.slow, 0.6);
            if (weapon.overlock && weapon.overlock.healOnKill && target.hp <= 0) {
              run.player.hp = Math.min(run.player.maxHp, run.player.hp + 4);
            }
          }
          if (targets.length > 0) {
            run.effects.push({
              type: "lightning",
              from: { x: run.player.x, y: run.player.y },
              targets: targets.map(t => ({ x: t.x, y: t.y })),
              time: 0.12,
            });
          }
          weapon.cooldown = cd;
        }
      }

      if (weapon.id === "kamikaze_drones") {
        const baseCount = power.base.drones + power.projBonus;
        const count = baseCount + (weapon.level >= 4 ? 1 : 0);
        if (!weapon.drones) weapon.drones = [];
        while (weapon.drones.length < count) {
          weapon.drones.push({
            x: run.player.x,
            y: run.player.y,
            state: "idle",
            cooldown: 0,
            hp: 1,
          });
        }
        weapon.drones.length = count;
        for (const drone of weapon.drones) {
          drone.cooldown = Math.max(0, drone.cooldown - dt);
          if (weapon.overlock && weapon.overlock.healBeam) {
            run.player.hp = Math.min(run.player.maxHp, run.player.hp + dt * 0.8);
          }
          if (weapon.overlock && weapon.overlock.gun && drone.cooldown <= 0) {
            const target = findNearestEnemy(run, drone.x, drone.y, 140);
            if (target) {
              const angle = Math.atan2(target.y - drone.y, target.x - drone.x);
              run.bullets.push({
                x: drone.x,
                y: drone.y,
                vx: Math.cos(angle) * 200,
                vy: Math.sin(angle) * 200,
                radius: 3,
                life: 1.2,
                damage: 12 * power.dmgMult,
                source: weapon,
              });
              drone.cooldown = 0.6;
            }
          }
        }
      }

      if (weapon.id === "shockwave_pulse") {
        const cd = power.base.cooldown * power.cooldownMult;
        if (weapon.cooldown <= 0) {
          const radius = power.base.radius * power.areaMult;
          if (weapon.overlock && weapon.overlock.medField) {
            run.pulses.push({ type: "heal", x: run.player.x, y: run.player.y, radius: radius * 0.6, time: 5 });
          } else {
            run.pulses.push({
              type: "damage",
              x: run.player.x,
              y: run.player.y,
              radius,
              damage: scaleWeaponValue(power.base.damage, weapon.level) * power.dmgMult * (weapon.overlock && weapon.overlock.weak ? 0.7 : 1),
              slow: weapon.overlock && weapon.overlock.frost ? 0.6 : 0,
              time: 0.2,
            });
          }
          weapon.cooldown = cd;
        }
      }

      if (weapon.id === "gravity_well") {
        const cd = power.base.cooldown * power.cooldownMult;
        if (weapon.overlock && weapon.overlock.vacuum) {
          if (weapon.cooldown <= 0) {
            run.effects.push({ type: "vacuum", time: 1.0 });
            weapon.cooldown = cd * 2.4;
          }
        } else if (weapon.cooldown <= 0) {
          const radius = power.base.radius * power.areaMult;
          run.wells.push({
            x: run.player.x + rand(-40, 40),
            y: run.player.y + rand(-40, 40),
            radius,
            time: power.base.duration,
            dps: scaleWeaponValue(power.base.dps, weapon.level) * power.dmgMult,
            burst: weapon.overlock && weapon.overlock.burst,
          });
          weapon.cooldown = cd;
        }
      }
    }
  }

  function updateBullets(run, dt) {
    for (const bullet of run.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      for (const enemy of run.enemies) {
        if (enemy.hp <= 0) continue;
        if (dist(bullet, enemy) < enemy.radius + bullet.radius) {
          applyDamage(run, enemy, bullet.damage, bullet.source);
          if (bullet.splash) {
            for (const other of run.enemies) {
              if (other === enemy || other.hp <= 0) continue;
              if (dist(enemy, other) < 26) applyDamage(run, other, bullet.damage * 0.4, bullet.source);
            }
          }
          bullet.life = 0;
          break;
        }
      }
    }
    run.bullets = run.bullets.filter(b => b.life > 0);
  }

  function updateMissiles(run, dt) {
    for (const missile of run.missiles) {
      missile.life -= dt;
      if (missile.overlock && missile.overlock.guardian) {
        const angle = nowMs() * 0.002;
        missile.x = run.player.x + Math.cos(angle) * 22;
        missile.y = run.player.y + Math.sin(angle) * 22;
      } else {
        const target = findNearestEnemy(run, missile.x, missile.y, 240);
        if (target) {
          const angle = Math.atan2(target.y - missile.y, target.x - missile.x);
          missile.vx = Math.cos(angle) * missile.speed;
          missile.vy = Math.sin(angle) * missile.speed;
        }
        missile.x += missile.vx * dt;
        missile.y += missile.vy * dt;
      }
      for (const enemy of run.enemies) {
        if (enemy.hp <= 0) continue;
        if (dist(missile, enemy) < enemy.radius + 6) {
          applyDamage(run, enemy, missile.damage, missile.source);
          if (missile.overlock && missile.overlock.cluster) {
            for (let i = 0; i < 5; i++) {
              const angle = i * (Math.PI * 2 / 5);
              run.bullets.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * 140,
                vy: Math.sin(angle) * 140,
                radius: 3,
                life: 0.8,
                damage: missile.damage * 0.35,
                source: missile.source,
              });
            }
          }
          missile.life = 0;
          break;
        }
      }
    }
    run.missiles = run.missiles.filter(m => m.life > 0);
  }

  function updateOrbitOrbs(run, dt) {
    for (const weapon of run.weapons) {
      if (weapon.id !== "orbit_orbs") continue;
      if (weapon.overlock && weapon.overlock.id === "aegis") continue;
      const power = getWeaponPower(run, weapon.id, weapon.level);
      const count = weapon.orbs || power.base.orbs;
      const radius = weapon.orbitRadius || power.base.orbitRadius;
      weapon.orbitAngle = (weapon.orbitAngle || 0) + dt * (weapon.orbitSpeed || 1) * 2;
      for (let i = 0; i < count; i++) {
        const angle = weapon.orbitAngle + (i / count) * Math.PI * 2;
        const ox = run.player.x + Math.cos(angle) * radius;
        const oy = run.player.y + Math.sin(angle) * radius;
        for (const enemy of run.enemies) {
          if (enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - ox, enemy.y - oy) < enemy.radius + 6) {
            applyDamage(run, enemy, power.base.dpsPerOrb * power.dmgMult * dt, weapon);
          }
        }
      }
    }
  }

  function updateBeam(run, dt) {
    for (const weapon of run.weapons) {
      if (weapon.id !== "cutting_beam") continue;
      const beam = weapon.beam;
      if (!beam) continue;
      if (beam.ring) {
        weapon.ringAngle = (weapon.ringAngle || 0) + dt * weapon.ringSpeed;
        const ringRadius = 26 + run.stats.area_pct * 0.2;
        for (const enemy of run.enemies) {
          if (enemy.hp <= 0) continue;
          const d = dist(run.player, enemy);
          if (Math.abs(d - ringRadius) < enemy.radius + 6) {
            applyDamage(run, enemy, beam.dps * dt, weapon);
          }
        }
      } else {
        for (const enemy of run.enemies) {
          if (enemy.hp <= 0) continue;
          const dx = enemy.x - run.player.x;
          const dy = enemy.y - run.player.y;
          const forward = run.player.dir;
          const proj = dx * forward.x + dy * forward.y;
          const perp = Math.abs(dx * -forward.y + dy * forward.x);
          if (proj > 0 && proj < beam.range && perp < 10 + run.stats.area_pct * 0.08) {
            applyDamage(run, enemy, beam.dps * dt, weapon, { mark: weapon.overlock && weapon.overlock.tag ? 4 : 0 });
          }
        }
      }
    }
  }

  function updateDrones(run, dt) {
    for (const weapon of run.weapons) {
      if (weapon.id !== "kamikaze_drones" || !weapon.drones) continue;
      const power = getWeaponPower(run, weapon.id, weapon.level);
      for (const drone of weapon.drones) {
        if (drone.state === "idle") {
          const angle = (drone.angle || 0) + dt * 1.8;
          drone.angle = angle;
          drone.x = run.player.x + Math.cos(angle) * 24;
          drone.y = run.player.y + Math.sin(angle) * 24;
          const target = findNearestEnemy(run, drone.x, drone.y, power.base.detectRange);
          if (target && !(weapon.overlock && weapon.overlock.gun)) {
            drone.state = "dive";
            drone.target = target;
          }
        } else if (drone.state === "dive" && drone.target) {
          const angle = Math.atan2(drone.target.y - drone.y, drone.target.x - drone.x);
          drone.x += Math.cos(angle) * 170 * dt;
          drone.y += Math.sin(angle) * 170 * dt;
          if (dist(drone, drone.target) < drone.target.radius + 6) {
            for (const enemy of run.enemies) {
              if (enemy.hp <= 0) continue;
              if (dist(enemy, drone) < power.base.blastRadius * (1 + run.stats.area_pct / 100)) {
                applyDamage(run, enemy, power.base.explosionDamage * power.dmgMult, weapon);
              }
            }
            drone.state = "idle";
          }
        }
      }
    }
  }

  function updatePulses(run, dt) {
    for (const pulse of run.pulses) {
      if (pulse.type === "heal") {
        pulse.time -= dt;
        if (dist(run.player, pulse) < pulse.radius) {
          run.player.hp = Math.min(run.player.maxHp, run.player.hp + dt * 2.2);
        }
      } else {
        pulse.time -= dt;
        for (const enemy of run.enemies) {
          if (enemy.hp <= 0) continue;
          if (dist(enemy, pulse) < pulse.radius) {
            applyDamage(run, enemy, pulse.damage, { id: "shockwave_pulse" }, { mark: 0 });
            if (pulse.slow) enemy.slow = Math.max(enemy.slow, pulse.slow);
          }
        }
      }
    }
    run.pulses = run.pulses.filter(p => p.time > 0);
  }

  function updateWells(run, dt) {
    for (const well of run.wells) {
      well.time -= dt;
      for (const enemy of run.enemies) {
        if (enemy.hp <= 0) continue;
        const d = dist(enemy, well);
        if (d < well.radius) {
          const pull = (1 - d / well.radius) * 40;
          const angle = Math.atan2(well.y - enemy.y, well.x - enemy.x);
          enemy.x += Math.cos(angle) * pull * dt;
          enemy.y += Math.sin(angle) * pull * dt;
          applyDamage(run, enemy, well.dps * dt, { id: "gravity_well" }, { inDrainZone: run.overlock && run.overlock.drainBoost });
        }
      }
      if (well.time <= 0 && well.burst) {
        for (const enemy of run.enemies) {
          if (enemy.hp <= 0) continue;
          if (dist(enemy, well) < well.radius) applyDamage(run, enemy, well.dps * 2.2, { id: "gravity_well" });
        }
      }
    }
    run.wells = run.wells.filter(w => w.time > 0);
  }

  function updateEffects(run, dt) {
    for (const effect of run.effects) {
      effect.time -= dt;
      if (effect.type === "vacuum") {
        for (const orb of run.orbs) {
          const angle = Math.atan2(run.player.y - orb.y, run.player.x - orb.x);
          orb.x += Math.cos(angle) * 120 * dt;
          orb.y += Math.sin(angle) * 120 * dt;
        }
      }
    }
    run.effects = run.effects.filter(e => e.time > 0);
  }

  function findNearestEnemy(run, x, y, range, nearOnly, exclude) {
    let best = null;
    let bestD = range;
    for (const enemy of run.enemies) {
      if (enemy.hp <= 0) continue;
      if (exclude && exclude.includes(enemy)) continue;
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (nearOnly && d > 120) continue;
      if (d < bestD) {
        bestD = d;
        best = enemy;
      }
    }
    return best;
  }

  function updateEnemies(run, dt) {
    for (const enemy of run.enemies) {
      if (enemy.hp <= 0) continue;
      const slowMult = enemy.slow ? 0.5 : 1;
      const speed = enemy.speed * slowMult;
      if (enemy.stun > 0) {
        enemy.stun -= dt;
      } else {
        const angle = Math.atan2(run.player.y - enemy.y, run.player.x - enemy.x);
        enemy.x += Math.cos(angle) * speed * dt;
        enemy.y += Math.sin(angle) * speed * dt;
      }
      if (enemy.slow > 0) enemy.slow = Math.max(0, enemy.slow - dt);

      enemy.hitCooldown -= dt;
      if (dist(enemy, run.player) < enemy.radius + run.player.radius) {
        if (enemy.hitCooldown <= 0) {
          damagePlayer(run, enemy.damage);
          enemy.hitCooldown = 0.8;
        }
      }
    }
  }

  function damagePlayer(run, amount) {
    if (run.player.shield > 0) {
      run.player.shield = Math.max(0, run.player.shield - amount);
      run.player.shieldDelay = 7;
      return;
    }
    if (run.overlock && run.overlock.orbShieldReady) {
      run.overlock.orbShieldReady = false;
      run.overlock.orbShieldTimer = 4;
      return;
    }
    run.player.hp -= amount;
    run.lastDamageAt = run.time;
    run.player.shieldDelay = 7;
    if (Game.save.settings.screenshake) {
      run.shake.time = 0.2;
      run.shake.mag = 4;
    }
    Audio.hit();
    if (run.player.hp <= 0) {
      run.player.hp = 0;
      endRun(run);
    }
  }

  function updateXpOrbs(run, dt) {
    const collector = run.weapons.some(w => w.overlock && w.overlock.collect);
    for (const orb of run.orbs) {
      const pickupRadius = (BASES.pickupRadius + run.stats.pickup_radius) * (collector ? 1.35 : 1);
      const d = dist(orb, run.player);
      if (d < pickupRadius + 8) {
        orb.pull = 1;
      }
      if (orb.pull) {
        const speed = 120 + run.stats.pickup_radius * 4;
        const angle = Math.atan2(run.player.y - orb.y, run.player.x - orb.x);
        orb.x += Math.cos(angle) * speed * dt;
        orb.y += Math.sin(angle) * speed * dt;
      }
      if (d < 12) {
        const xpGain = orb.value * (1 + run.stats.xp_pct / 100);
        run.xp += xpGain;
        run.starbitsEarned += orb.starbits;
        Audio.xp();
        orb.collected = true;
      }
    }
    run.orbs = run.orbs.filter(o => !o.collected);
  }

  function updateRun(run, dt) {
    if (!run.active) return;

    if (run.overlay) {
      if (run.overlay.type === "gameover") {
        return;
      }
      return;
    }

    if (run.shake.time > 0) run.shake.time = Math.max(0, run.shake.time - dt);

    run.time += dt;

    const joy = run.joystick;
    run.player.vx = joy.dx * run.player.moveSpeed;
    run.player.vy = joy.dy * run.player.moveSpeed;
    run.player.x += run.player.vx * dt;
    run.player.y += run.player.vy * dt;
    if (joy.active && (joy.dx || joy.dy)) {
      const len = Math.hypot(joy.dx, joy.dy);
      run.player.dir = { x: joy.dx / len, y: joy.dy / len };
    }

    run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.regen * dt);

    if (run.player.shieldDelay > 0) run.player.shieldDelay -= dt;
    if (run.player.shieldDelay <= 0 && run.player.shieldMax > 0) {
      run.player.shield = Math.min(run.player.shieldMax, run.player.shield + dt * run.player.shieldMax * 0.2);
    }

    if (run.overlock && run.overlock.orbShieldTimer > 0) {
      run.overlock.orbShieldTimer -= dt;
      if (run.overlock.orbShieldTimer <= 0) run.overlock.orbShieldReady = true;
    }

    run.spawn.timer -= dt;
    if (run.spawn.timer <= 0) {
      spawnEnemy(run);
      run.spawn.rate = Math.max(0.3, run.spawn.rate - 0.01);
      run.spawn.timer = run.spawn.rate;
    }

    updateWeapons(run, dt);
    updateBullets(run, dt);
    updateMissiles(run, dt);
    updateOrbitOrbs(run, dt);
    updateEnemies(run, dt);
    updateBeam(run, dt);
    updateXpOrbs(run, dt);
    updateDrones(run, dt);
    updatePulses(run, dt);
    updateWells(run, dt);
    updateEffects(run, dt);

    run.enemies = run.enemies.filter(e => e.hp > 0 && dist(e, run.player) < 900);

    while (run.xp >= run.xpToNext) {
      run.xp -= run.xpToNext;
      run.level += 1;
      run.xpToNext = Math.floor(28 + run.level * 10);
      Audio.levelup();
      if (run.level % 10 === 0) {
        startOverlock(run);
        break;
      } else {
        startLevelUp(run);
        break;
      }
    }
  }

  function startLevelUp(run) {
    const choices = buildUpgradeChoices(run);
    run.overlay = buildRunChoiceUI(Game.canvasW, Game.canvasH, choices, "Level Up");
    run.overlay.type = "levelup";
    run.overlay.choices = choices;
  }

  function startOverlock(run) {
    const choices = run.weapons.map(w => ({
      id: `overlock_weapon:${w.id}`,
      label: getWeaponDef(w.id).name,
      desc: "Select a weapon to Overlock.",
    }));
    run.overlay = buildRunChoiceUI(Game.canvasW, Game.canvasH, choices, `Overlock Level ${run.level}`);
    run.overlay.type = "overlock_weapon";
    run.overlay.choices = choices;
  }

  function buildUpgradeChoices(run) {
    const choices = [];
    const weaponOwned = run.weapons.map(w => w.id);
    const weaponsAvailable = (window.WEAPONS || []).filter(w => !weaponOwned.includes(w.id));
    const upgradesAvailable = run.weapons.filter(w => w.level < 8);
    const ownedPassives = Object.keys(run.passives);
    const slotsFull = ownedPassives.length >= run.passiveSlots;
    const statsAvailable = (window.STATS || []).filter(stat => {
      if (stat.id === "extra_choice" && (run.passives[stat.id] || 0) >= 2) return false;
      if (slotsFull && !run.passives[stat.id]) return false;
      return true;
    });

    const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];

    while (choices.length < 3 + run.stats.extra_choice) {
      const pool = [];
      if (weaponsAvailable.length > 0 && run.weapons.length < run.weaponSlots) {
        pool.push({
          type: "newWeapon",
          weight: 45,
          data: pick(weaponsAvailable),
        });
      }
      if (upgradesAvailable.length > 0) {
        pool.push({
          type: "weaponUpgrade",
          weight: 35,
          data: pick(upgradesAvailable),
        });
      }
      for (const stat of statsAvailable) {
        const rarityWeight = window.STAT_RARITY[stat.rarity] || 10;
        pool.push({ type: "stat", weight: rarityWeight, data: stat });
      }
      if (pool.length === 0) break;

      const total = pool.reduce((s, p) => s + p.weight, 0);
      let roll = Math.random() * total;
      let chosen = pool[0];
      for (const p of pool) {
        roll -= p.weight;
        if (roll <= 0) { chosen = p; break; }
      }

      let label = "";
      let desc = "";
      let id = "";
      if (chosen.type === "newWeapon") {
        label = `New Weapon: ${chosen.data.name}`;
        desc = chosen.data.notes || "";
        id = `newWeapon:${chosen.data.id}`;
      } else if (chosen.type === "weaponUpgrade") {
        label = `Upgrade Weapon: ${getWeaponDef(chosen.data.id).name}`;
        desc = `Level ${chosen.data.level} → ${chosen.data.level + 1}`;
        id = `upgradeWeapon:${chosen.data.id}`;
      } else if (chosen.type === "stat") {
        label = `Passive: ${chosen.data.name}`;
        desc = chosen.data.category;
        id = `stat:${chosen.data.id}`;
      }

      if (!choices.find(c => c.id === id)) {
        choices.push({ id, label, desc });
      }
    }
    return choices;
  }

  function applyUpgrade(run, choiceId) {
    if (choiceId.startsWith("newWeapon:")) {
      const id = choiceId.split(":")[1];
      run.weapons.push({ id, level: 1, cooldown: 0 });
    } else if (choiceId.startsWith("upgradeWeapon:")) {
      const id = choiceId.split(":")[1];
      const weapon = run.weapons.find(w => w.id === id);
      if (weapon) weapon.level = Math.min(8, weapon.level + 1);
    } else if (choiceId.startsWith("stat:")) {
      const id = choiceId.split(":")[1];
      run.passives[id] = (run.passives[id] || 0) + 1;
    }
    calcStats(run);
  }

  function applyOverlockWeapon(run, weaponId) {
    run.overlock.weaponId = weaponId;
    const ownedCategories = new Set();
    for (const statId of Object.keys(run.passives)) {
      const def = getStatDef(statId);
      if (def) ownedCategories.add(def.category.toLowerCase());
    }
    const variants = [];
    const defs = (window.OVERLOCKS || {})[weaponId] || {};
    if (ownedCategories.has("assault") && defs.assault) {
      variants.push({ id: "assault", label: defs.assault.name, desc: defs.assault.desc });
    }
    if (ownedCategories.has("aegis") && defs.aegis) {
      variants.push({ id: "aegis", label: defs.aegis.name, desc: defs.aegis.desc });
    }
    if (ownedCategories.has("prospector") && defs.prospector) {
      variants.push({ id: "prospector", label: defs.prospector.name, desc: defs.prospector.desc });
    }
    if (variants.length === 0) {
      variants.push({ id: "assault", label: defs.assault.name, desc: defs.assault.desc });
    }
    run.overlay = buildRunChoiceUI(Game.canvasW, Game.canvasH, variants, "Choose Overlock Variant");
    run.overlay.type = "overlock_variant";
    run.overlay.choices = variants;
  }

  function applyOverlockVariant(run, variantId) {
    const weapon = run.weapons.find(w => w.id === run.overlock.weaponId);
    if (!weapon) return;
    const def = (window.OVERLOCKS || {})[weapon.id] || {};
    const data = def[variantId];
    weapon.overlock = { id: variantId, name: data.name, desc: data.desc };

    if (weapon.id === "front_laser") {
      weapon.overlock.fast = variantId === "assault";
      weapon.overlock.splash = variantId === "assault";
      weapon.overlock.heavy = variantId === "aegis";
      weapon.starDropBonus = variantId === "prospector";
    }
    if (weapon.id === "orbit_orbs") {
      weapon.overlock.triple = variantId === "assault";
      if (variantId === "aegis") {
        run.overlock.orbShieldReady = true;
        run.overlock.orbShieldTimer = 0;
      }
      if (variantId === "prospector") {
        run.stats.pickup_radius += 16;
      }
    }
    if (weapon.id === "homing_missiles") {
      weapon.overlock.cluster = variantId === "assault";
      weapon.overlock.guardian = variantId === "aegis";
      weapon.starDropBonus = variantId === "prospector";
    }
    if (weapon.id === "cutting_beam") {
      weapon.overlock.ring = variantId === "assault";
      if (variantId === "aegis") {
        run.player.shieldMax = run.player.maxHp * 0.3;
        run.player.shield = run.player.shieldMax;
      }
      weapon.overlock.tag = variantId === "prospector";
    }
    if (weapon.id === "chain_lightning") {
      weapon.overlock.longRange = variantId === "assault";
      weapon.overlock.stun = variantId === "assault";
      weapon.overlock.nearOnly = variantId === "aegis";
      weapon.overlock.healOnKill = variantId === "aegis";
      weapon.overlock.tag = variantId === "prospector";
    }
    if (weapon.id === "kamikaze_drones") {
      weapon.overlock.gun = variantId === "assault";
      weapon.overlock.healBeam = variantId === "aegis";
      weapon.overlock.collect = variantId === "prospector";
    }
    if (weapon.id === "shockwave_pulse") {
      weapon.overlock.frost = variantId === "assault";
      weapon.overlock.medField = variantId === "aegis";
      weapon.overlock.weak = variantId === "prospector";
      weapon.starDropBonus = variantId === "prospector";
    }
    if (weapon.id === "gravity_well") {
      weapon.overlock.burst = variantId === "assault";
      if (variantId === "aegis") run.overlock.drainBoost = 1.5;
      weapon.overlock.vacuum = variantId === "prospector";
    }
  }

  function endRun(run) {
    run.active = false;
    Audio.death();

    const rewardMult = run.zone.rewardMult || 1;
    const baseStarbits = Math.floor((run.time * 2 + run.kills * 2 + run.level * 8) * rewardMult);
    const totalStarbits = Math.floor(baseStarbits * (1 + run.stats.starbits_pct / 100)) + run.starbitsEarned;
    run.starbitsEarned = totalStarbits;
    run.saveRef.starbits += totalStarbits;
    saveNow(run.saveRef);

    const summaryChoices = [{
      id: "returnTitle",
      label: "Return to Title",
      desc: "",
    }];
    run.overlay = buildRunChoiceUI(Game.canvasW, Game.canvasH, summaryChoices, "Run Complete");
    run.overlay.type = "gameover";
    run.overlay.choices = summaryChoices;
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
    run: null,

    init(w, h) {
      this.save = loadSave();
      this.resize(w, h);
      this.goto(States.TITLE);
    },

    resize(w, h) {
      this.canvasW = w;
      this.canvasH = h;
      this.goto(this.state, true);
    },

    showToast(msg) {
      this.toast.msg = msg;
      this.toast.t = this.toast.tMax;
    },

    goto(next, keepState) {
      this.state = next;

      const w = this.canvasW, h = this.canvasH;
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
        this.ui.buttons = [];
      }

      if (!keepState) saveNow(this.save);
    },

    onPointerMove(x, y) {
      this.pointer.x = x;
      this.pointer.y = y;

      if (this.state === States.RUN && this.run) {
        const joy = this.run.joystick;
        if (joy.active) {
          const dx = x - joy.anchorX;
          const dy = y - joy.anchorY;
          const dist = Math.hypot(dx, dy);
          const maxR = joy.radius;
          const clamped = dist > maxR ? maxR / dist : 1;
          joy.x = joy.anchorX + dx * clamped;
          joy.y = joy.anchorY + dy * clamped;
          joy.dx = (joy.x - joy.anchorX) / maxR;
          joy.dy = (joy.y - joy.anchorY) / maxR;
        }
        return;
      }

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
      if (!Audio.ctx) Audio.init();
      this.pointer.down = true;
      this.onPointerMove(x, y);

      if (this.state === States.RUN && this.run) {
        const joy = this.run.joystick;
        if (!joy.active && y > this.canvasH * 0.56) {
          joy.active = true;
          joy.anchorX = x;
          joy.anchorY = y;
          joy.x = x;
          joy.y = y;
          joy.dx = 0;
          joy.dy = 0;
        }
      }
    },

    onPointerUp(x, y) {
      this.pointer.down = false;
      this.onPointerMove(x, y);

      if (this.state === States.RUN && this.run) {
        const joy = this.run.joystick;
        joy.active = false;
        joy.dx = 0;
        joy.dy = 0;

        if (this.run.overlay) {
          const hit = this.run.overlay.buttons.find(b => rectHit(b, x, y));
          if (hit) {
            Audio.click();
            this.handleRunChoice(hit.id);
          }
        }
        return;
      }

      const hit = (arr) => (arr || []).find(b => rectHit(b, x, y));
      let clicked = hit(this.ui.buttons);

      if (!clicked && this.state === States.ZONE_SELECT && this.ui.zones) {
        clicked = hit(this.ui.zones.items) || (rectHit(this.ui.zones.startBtn, x, y) ? this.ui.zones.startBtn : null);
      }
      if (!clicked && this.state === States.HANGAR && this.ui.hangar) clicked = hit(this.ui.hangar.buttons);
      if (!clicked && this.state === States.SHOP && this.ui.shop) clicked = hit(this.ui.shop.items);
      if (!clicked && this.state === States.SETTINGS && this.ui.settings) clicked = hit(this.ui.settings.items);

      if (!clicked || clicked.disabled) return;

      Audio.click();
      this.handleAction(clicked);
    },

    handleRunChoice(id) {
      if (!this.run || !this.run.overlay) return;
      const overlay = this.run.overlay;
      if (overlay.type === "levelup") {
        applyUpgrade(this.run, id);
        this.run.overlay = null;
      } else if (overlay.type === "overlock_weapon") {
        applyOverlockWeapon(this.run, id.split(":")[1]);
      } else if (overlay.type === "overlock_variant") {
        applyOverlockVariant(this.run, id);
        this.run.overlay = null;
      } else if (overlay.type === "gameover") {
        this.run = null;
        this.goto(States.TITLE);
      }
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
          const zone = (window.ZONES || []).find(z => z.id === this.save.selectedZoneId);
          this.run = createRun(zone, this.save);
          calcStats(this.run);
          this.goto(States.RUN);
          return;
        }

        const zone = (window.ZONES || []).find(z => z.id === id);
        if (zone) {
          if (!this.save.unlockedZones[zone.id]) {
            this.showToast("This zone is locked. Unlock it in the Shop.");
            return;
          }
          this.save.selectedZoneId = zone.id;
          saveNow(this.save);
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
      if (this.toast.t > 0) this.toast.t = Math.max(0, this.toast.t - dt);

      if (this.state === States.RUN && this.run) {
        updateRun(this.run, dt);
        Audio.updateMusic(dt);
      }
    },

    render(ctx) {
      const w = this.canvasW, h = this.canvasH;

      if (this.state === States.RUN && this.run) {
        this.renderRun(ctx, w, h, this.run);
      } else {
        Draw.bg(ctx, w, h);
      }

      if (this.state !== States.TITLE && this.state !== States.RUN) {
        Draw.smallLabel(ctx, w - 14, 16, "Starbits", "right");
        Draw.bigValue(ctx, w - 14, 34, `${this.save.starbits} $₿`, "right");
      }

      if (this.state === States.TITLE) {
        Draw.title(ctx, w, Math.floor(h * 0.22), "STARDRIFT");
        Draw.subtitle(ctx, w, Math.floor(h * 0.28), "Survive • Level up • Overlock");

        for (const b of this.ui.buttons) Draw.button(ctx, b);
        Draw.subtitle(ctx, w, h - 26, "Tap to play");
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
          Draw.button(ctx, b);
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

      if (this.toast.t > 0) {
        const t01 = this.toast.t / this.toast.tMax;
        Draw.toast(ctx, w, h, this.toast.msg, t01);
      }
    },

    renderRun(ctx, w, h, run) {
      const palette = run.zone.palette || { bg: "#070a12", starsNear: "#cbd6ff", starsFar: "#6e7faa", accent: "#7dd3ff" };
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, w, h);

      const shakeX = run.shake.time > 0 ? rand(-run.shake.mag, run.shake.mag) : 0;
      const shakeY = run.shake.time > 0 ? rand(-run.shake.mag, run.shake.mag) : 0;

      const camX = run.player.x - w / 2 + shakeX;
      const camY = run.player.y - h / 2 + shakeY;

      drawParallax(ctx, w, h, camX, camY, palette);

      for (const orb of run.orbs) {
        const sx = orb.x - camX;
        const sy = orb.y - camY;
        Draw.orb(ctx, sx, sy, 4);
      }

      for (const well of run.wells) {
        Draw.ring(ctx, well.x - camX, well.y - camY, well.radius, "rgba(140,180,255,0.45)");
      }

      for (const pulse of run.pulses) {
        if (pulse.type === "heal") {
          Draw.ring(ctx, pulse.x - camX, pulse.y - camY, pulse.radius, "rgba(120,255,200,0.6)");
        }
      }

      for (const weapon of run.weapons) {
        if (weapon.id === "orbit_orbs") {
          if (weapon.overlock && weapon.overlock.id === "aegis") {
            Draw.ring(ctx, w / 2, h / 2, 22 + run.stats.area_pct * 0.2, "rgba(200,220,255,0.6)");
            continue;
          }
          const power = getWeaponPower(run, weapon.id, weapon.level);
          const count = weapon.orbs || power.base.orbs;
          const radius = weapon.orbitRadius || power.base.orbitRadius;
          for (let i = 0; i < count; i++) {
            const angle = (weapon.orbitAngle || 0) + (i / count) * Math.PI * 2;
            const ox = run.player.x + Math.cos(angle) * radius - camX;
            const oy = run.player.y + Math.sin(angle) * radius - camY;
            Draw.orb(ctx, ox, oy, 5);
          }
        }
      }

      for (const bullet of run.bullets) {
        Draw.projectile(ctx, bullet.x - camX, bullet.y - camY, 4, "#ffd166");
      }

      for (const missile of run.missiles) {
        Draw.projectile(ctx, missile.x - camX, missile.y - camY, 5, "#9bf6ff");
      }

      for (const enemy of run.enemies) {
        Draw.enemy(ctx, enemy.x - camX, enemy.y - camY, enemy.type);
      }

      for (const weapon of run.weapons) {
        if (weapon.id === "cutting_beam" && weapon.beam && !weapon.beam.ring) {
          ctx.strokeStyle = "rgba(120,200,255,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w / 2 + run.player.dir.x * 12, h / 2 + run.player.dir.y * 12);
          ctx.lineTo(w / 2 + run.player.dir.x * weapon.beam.range, h / 2 + run.player.dir.y * weapon.beam.range);
          ctx.stroke();
        }
      }

      Draw.ship(ctx, w / 2, h / 2, run.player.dir);

      Draw.joystick(ctx, run.joystick);

      Draw.hudText(ctx, 12, 12, `HP ${Math.floor(run.player.hp)} / ${Math.floor(run.player.maxHp)}`);
      Draw.hudText(ctx, 12, 28, `Level ${run.level}`);
      Draw.hudText(ctx, 12, 44, `XP ${Math.floor(run.xp)} / ${run.xpToNext}`);
      Draw.hudText(ctx, w - 12, 12, `${Math.floor(run.time)}s`, "right");

      if (run.player.shieldMax > 0) {
        const ratio = run.player.shield / run.player.shieldMax;
        ctx.fillStyle = "rgba(100,200,255,0.5)";
        ctx.fillRect(12, 60, 80 * ratio, 4);
      }

      if (run.overlay) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, w, h);
        Draw.panel(ctx, run.overlay.x, run.overlay.y, run.overlay.w, run.overlay.h);
        Draw.title(ctx, w, run.overlay.y + 30, run.overlay.title);
        for (const b of run.overlay.buttons) {
          Draw.button(ctx, b);
          if (b.desc) {
            Draw.smallLabel(ctx, b.x + 14, b.y + 36, b.desc, "left");
          }
        }
        if (run.overlay.type === "gameover") {
          Draw.subtitle(ctx, w, run.overlay.y + run.overlay.h - 68, `Time ${Math.floor(run.time)}s  •  Level ${run.level}  •  Starbits ${run.starbitsEarned}`);
        }
      }
    }
  };

  function drawParallax(ctx, w, h, camX, camY, palette) {
    const layers = [
      { speed: 0.3, count: 60, color: palette.starsFar },
      { speed: 0.6, count: 90, color: palette.starsNear },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      const size = 2;
      for (let i = 0; i < layer.count; i++) {
        const x = (i * 137) % 600;
        const y = (i * 271) % 600;
        const sx = (x - camX * layer.speed) % w;
        const sy = (y - camY * layer.speed) % h;
        const px = (sx + w) % w;
        const py = (sy + h) % h;
        ctx.fillRect(Math.round(px), Math.round(py), size, size);
      }
    }
  }

  window.Game = Game;
})();
