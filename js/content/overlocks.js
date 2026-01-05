// Follow SPEC.md.
// Overlock is mandatory at level 10, then every 10 levels.
// Player sees only the variants whose category is owned.

window.OVERLOCKS = {
  front_laser: {
    assault: {
      name: "Prism Barrage",
      desc: "Fires rapid micro-salvos; hits build small splash bursts.",
    },
    aegis: {
      name: "Leech Lance",
      desc: "Slower, heavier shots with strong sustain synergy (life steal friendly).",
    },
    prospector: {
      name: "Mining Array",
      desc: "Deals bonus vs comets/asteroids/chests; increased chance of XP/Starbits drops from them.",
    },
  },

  orbit_orbs: {
    assault: {
      name: "Trinity Orbs",
      desc: "Triple orb count and triple rotation speed.",
    },
    aegis: {
      name: "Mirror Plate",
      desc: "Replaces orbs with a protective plate that blocks all damage and reflects projectiles.",
    },
    prospector: {
      name: "Tractor Satellites",
      desc: "Satellites pull XP/Starbits from farther away and improve economy during the run.",
    },
  },

  homing_missiles: {
    assault: {
      name: "Cluster Hounds",
      desc: "Missiles burst into mini-missiles on impact (AOE).",
    },
    aegis: {
      name: "Guardian Interceptors",
      desc: "Missiles orbit close and intercept nearby threats instead of seeking far targets.",
    },
    prospector: {
      name: "Salvage Payload",
      desc: "Prioritizes comets/asteroids; higher chance to drop XP/Starbits caches.",
    },
  },

  cutting_beam: {
    assault: {
      name: "Plasma Ring",
      desc: "A rotating flamethrower ring around the ship. Rotation scales with Move Speed, range with Area.",
    },
    aegis: {
      name: "Aegis Shield Core",
      desc: "Adds a rechargeable shield based on Max HP. Recharges after 7s without taking damage.",
    },
    prospector: {
      name: "Bounty Cutter",
      desc: "Marks targets hit by the beam; marked kills grant extra XP and have a Starbits bonus chance.",
    },
  },

  chain_lightning: {
    assault: {
      name: "Stun Conduit",
      desc: "Chains have longer range and stun enemies for 0.5s.",
    },
    aegis: {
      name: "Static Ward",
      desc: "Prioritizes enemies near the ship; adds mild slow and sustain on affected kills.",
    },
    prospector: {
      name: "Survey Arc",
      desc: "Tagged chain targets drop more XP/Starbits and pickups drift slightly toward the player.",
    },
  },

  kamikaze_drones: {
    assault: {
      name: "Gun Drones",
      desc: "Drones stay near the ship and shoot at range (stable DPS). Drones still have 1 HP.",
    },
    aegis: {
      name: "Repair Drones",
      desc: "Drones stay near the ship and beam-heal, increasing regen. Drones still have 1 HP.",
    },
    prospector: {
      name: "Collector Drones",
      desc: "Drones fetch XP/Starbits from far away and return. Drones still have 1 HP.",
    },
  },

  shockwave_pulse: {
    assault: {
      name: "Frost Bursts",
      desc: "Creates icy fog on enemies: small damage + slow.",
    },
    aegis: {
      name: "Med Fields",
      desc: "Replaces the pulse with healing zones near the ship (5s duration).",
    },
    prospector: {
      name: "Salvage Ping",
      desc: "Weakens damage but breaks small nearby debris and improves pickup/Starbits convenience.",
    },
  },

  gravity_well: {
    assault: {
      name: "Event Horizon",
      desc: "The well alternates pull → implosion burst → relocates (high burst potential).",
    },
    aegis: {
      name: "Drain Zone",
      desc: "Inside the zone, life steal effectiveness is increased.",
    },
    prospector: {
      name: "Vacuum Pulse",
      desc: "Removes the well. Periodically pulls ALL uncollected XP/Starbits to the player (very slow cooldown).",
    },
  },
};
