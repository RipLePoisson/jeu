// Global zones list (menu uses this)
// Keep it simple for now.
window.ZONES = [
  {
    id: "apollo_nebula",
    name: "Apollo Nebula",
    difficulty: 1,
    rewardMult: 1.0,
    unlockedByDefault: true,
    palette: {
      bg: "#060913",
      starsNear: "#cbd6ff",
      starsFar: "#6e7faa",
      accent: "#7dd3ff",
    },
  },
  {
    id: "ares_quasar",
    name: "Ares Quasar",
    difficulty: 2,
    rewardMult: 1.2,
    unlockedByDefault: false,
    unlockCost: 250,
    palette: {
      bg: "#0b0608",
      starsNear: "#ffd1b0",
      starsFar: "#a06f6f",
      accent: "#ff9f68",
    },
  },
  {
    id: "hephaestus_belt",
    name: "Hephaestus Belt",
    difficulty: 3,
    rewardMult: 1.4,
    unlockedByDefault: false,
    unlockCost: 600,
    palette: {
      bg: "#070b0d",
      starsNear: "#bdf6ff",
      starsFar: "#5b909b",
      accent: "#88f2d6",
    },
  },
  {
    id: "hades_rift",
    name: "Hades Rift",
    difficulty: 4,
    rewardMult: 1.7,
    unlockedByDefault: false,
    unlockCost: 1200,
    palette: {
      bg: "#07060e",
      starsNear: "#d4b0ff",
      starsFar: "#7a6b9e",
      accent: "#c68bff",
    },
  },
];
