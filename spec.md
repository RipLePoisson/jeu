# Game Spec (WIP) — Survivor-like Mobile (Portrait)

## Core concept
A simple Vampire Survivors-like game for Android, played in portrait mode.
- One-hand controls: movement only.
- No dash.
- Weapons fire automatically.
- Infinite space map with parallax background.
- Enemies spawn continuously around the player.
- Kill enemies/comets to gain XP, level up, and pick upgrades.
- The game is FULL ENGLISH (UI + names).

## Controls (mobile)
- Virtual joystick appears only when the player touches the bottom part of the screen.
- The joystick is anchored where the thumb first touches.
- Releasing the touch hides the joystick.
- Movement vector is continuous (normalized) from the joystick.
- No other active controls for now (no shooting button, no dash).

## Art direction
- Pixel art only.
- Sprites are generated in code (pixel-by-pixel / small rectangles in JS).
- UI and text should be pixel-styled (simple bitmap/pixel font later).

## Run structure
- Infinite scrolling world (player centered camera).
- Spawns: enemies + obstacles (asteroids) + loot (XP orbs) + occasional chests.
- XP orbs drop from enemies/comets and are picked up with a pickup radius.
- Level ups pause (or slow) the action briefly and show upgrade choices.

## Persistent progression (meta)
Persistent currency: Starbits ($₿).
- Starbits are earned at the end of a run.
- Prospector stat can multiply Starbits gained.

Meta menu includes:
- Zone unlocks (using Starbits).
- Slot upgrades:
  - Start: 3 weapon slots, 3 passive slots.
  - Upgradable (Starbits) up to 6 weapon slots and 6 passive slots.

## Stats (passives)
3 categories:

### Assault
- Damage %
- Cooldown %
- Projectile Count (+1)
- Area %

### Aegis
- Max HP
- Regen (hp/sec)
- Move Speed
- Life Steal

### Prospector
- Pickup Radius
- +XP%
- +$₿%
- +1 Choice (max +2)

Rules:
- No pierce stat.
- No duration stat.
- No hard stat caps (immortal runs are OK).
- Projectile Count is rare.
- Life Steal is rare/very rare.
- +1 Choice is rare/epic (max +2).

## Weapons (auto)
1. Front Laser
2. Orbit Orbs
3. Homing Missiles
4. Cutting Beam
5. Chain Lightning
6. Kamikaze Drones
7. Shockwave Pulse
8. Gravity Well

## Overlock system (MANDATORY at level 10+)
- Overlock is mandatory at level 10, then every 10 levels after (20, 30, 40...).
- Player must choose 1 of up to 3 Overlocks based on owned categories:
  - Assault Overlock (if at least one Assault passive)
  - Aegis Overlock (if at least one Aegis passive)
  - Prospector Overlock (if at least one Prospector passive)

## UI / Menus (English)
Menus:
- Title: Play, Hangar, Shop, Settings
- Zone Select: select zone, start run
- Hangar: slot upgrades
- Shop: unlock zones
- Settings: Music, SFX, Screen Shake

Save data:
- total Starbits, unlocked zones, selected zone,
- weapon slots, passive slots, settings toggles
