// Follow SPEC.md. Keep everything in English. No pierce/duration stats.

window.STAT_CATEGORIES = {
  ASSAULT: "Assault",
  AEGIS: "Aegis",
  PROSPECTOR: "Prospector",
};

// Rarity weights (higher = more common)
window.STAT_RARITY = {
  COMMON: 60,
  UNCOMMON: 30,
  RARE: 10,
  EPIC: 4,
};

window.STATS = [
  // Assault
  { id: "damage_pct", name: "Damage %", category: "Assault", rarity: "COMMON" },
  { id: "cooldown_pct", name: "Cooldown %", category: "Assault", rarity: "UNCOMMON" },
  { id: "projectile_count", name: "Projectile Count", category: "Assault", rarity: "RARE" },
  { id: "area_pct", name: "Area %", category: "Assault", rarity: "COMMON" },

  // Aegis
  { id: "max_hp", name: "Max HP", category: "Aegis", rarity: "COMMON" },
  { id: "regen", name: "Regen (HP/sec)", category: "Aegis", rarity: "UNCOMMON" },
  { id: "move_speed", name: "Move Speed", category: "Aegis", rarity: "COMMON" },
  { id: "life_steal", name: "Life Steal", category: "Aegis", rarity: "EPIC" },

  // Prospector
  { id: "pickup_radius", name: "Pickup Radius", category: "Prospector", rarity: "COMMON" },
  { id: "xp_pct", name: "+XP%", category: "Prospector", rarity: "COMMON" },
  { id: "starbits_pct", name: "+$₿%", category: "Prospector", rarity: "RARE" },
  { id: "extra_choice", name: "+1 Choice", category: "Prospector", rarity: "EPIC", max: 2 }, // max +2
];
