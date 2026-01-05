// Follow SPEC.md. Keep weapon names in English.

window.WEAPONS = [
  {
    id: "front_laser",
    name: "Front Laser",
    // baseline values (tune later)
    base: { damage: 10, cooldown: 0.30, projectiles: 1, area: 1.0 },
    scalesWith: ["damage_pct", "cooldown_pct", "projectile_count", "area_pct"],
    notes: "Fires forward. Extra projectiles form a cone.",
  },
  {
    id: "orbit_orbs",
    name: "Orbit Orbs",
    base: { orbs: 2, dpsPerOrb: 12, orbitRadius: 22, orbitSpeed: 1.0, area: 1.0 },
    scalesWith: ["damage_pct", "projectile_count", "move_speed", "area_pct"],
    notes: "Orbs orbit and deal contact damage + push.",
  },
  {
    id: "homing_missiles",
    name: "Homing Missiles",
    base: { damage: 22, cooldown: 0.85, missiles: 1 },
    scalesWith: ["damage_pct", "cooldown_pct", "projectile_count"],
    notes: "Missiles launch from sides and seek targets.",
  },
  {
    id: "cutting_beam",
    name: "Cutting Beam",
    base: { dps: 18, range: 34, area: 1.0 },
    scalesWith: ["damage_pct", "area_pct"],
    notes: "Short continuous beam (stable DPS).",
  },
  {
    id: "chain_lightning",
    name: "Chain Lightning",
    base: { damage: 16, cooldown: 0.55, chains: 2, range: 80 },
    scalesWith: ["damage_pct", "cooldown_pct", "projectile_count"],
    notes: "Hits multiple targets by chaining.",
  },
  {
    id: "kamikaze_drones",
    name: "Kamikaze Drones",
    base: { drones: 1, explosionDamage: 35, respawn: 3.5, detectRange: 90, blastRadius: 24 },
    scalesWith: ["damage_pct", "cooldown_pct", "projectile_count", "move_speed", "area_pct"],
    notes: "Drones rush enemies and explode. Drones are destructible (1 HP).",
  },
  {
    id: "shockwave_pulse",
    name: "Shockwave Pulse",
    base: { damage: 28, cooldown: 2.2, radius: 60, knockback: 1.0 },
    scalesWith: ["damage_pct", "cooldown_pct", "area_pct"],
    notes: "Periodic AOE pulse around the ship.",
  },
  {
    id: "gravity_well",
    name: "Gravity Well",
    base: { dps: 14, duration: 2.5, radius: 70 },
    scalesWith: ["damage_pct", "area_pct"],
    notes: "Creates a zone that pulls/slows enemies and deals continuous damage.",
  },
];
