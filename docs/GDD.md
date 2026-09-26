# DAWNBOUND — The Last Lantern
Game Design Document (living document)

Platform: Android (Google Play), portrait 9:16 – 9:21. Engine: Phaser 3.90 + TypeScript, wrapped with Capacitor 8.
Genre: action roguelite (top-down, real-time) with a persistent village hub, story campaign, loot and RPG progression.

---

## 1. Pitch

The sun has not risen over the realm of **Aurelle** for a hundred nights. The Hollow King **Malachar** shattered the
**Dawnstone** into five **Embers** and buried them in the Five Depths below the village of **Emberhollow**.
The last Lanternkeeper, Elder **Maren**, dies defending the village's Lantern — and with her final breath binds the soul of her
apprentice **Rowan** to its flame: *"As long as the Lantern burns, you will wake at dawn."*

Every death sends Rowan back to the Lantern shrine. Every descent is different. Every return makes the village stronger.

## 2. Core loop

```
Village hub (talk, quests, upgrade, craft, plant, equip)
  -> Descend into the Rift (choose loadout)
     -> Floor map: pick a path through branching nodes
        -> Rooms: combat / elite / treasure / shop / shrine / event / rest / challenge / boss
        -> Gain boons (Spirits), relics, gold, gear, materials, lore
     -> Die or win -> return to village at dawn (keep gear, materials, embers; lose run boons/relics/gold)
  -> Story advances, new NPCs, quests, systems unlock
```

## 3. Controls (portrait, one or two thumbs)

| Input | Action |
|---|---|
| Floating joystick (left/lower area) | Move (8-direction analog) |
| ATTACK (hold) | Weapon combo, auto-aims nearest enemy |
| DASH | Invulnerable roll, 2 charges (upgradable) |
| SKILL | Class signature skill, cooldown |
| FLARE | Ultimate, charged by dealing / taking damage |
| POTION | Drink healing flask (charges refill at rest sites) |
| Auto-attack option | Attacks automatically when enemies are in range |

## 4. Heroes (playable)

| Hero | Weapon | Unlock | Signature skill | Passive |
|---|---|---|---|---|
| Rowan, Lanternkeeper | Sword + bow | Start | Lantern Spin (360° spin) | Dash leaves embers |
| Sera, Spearmaiden | Spear | Main quest 2 | Skewer Rush (dash-thrust) | +Reach, pierce |
| Elio, Starcaller | Staff (orbs) | Main quest 3 | Nova (AoE burst) | Projectiles, +magic |
| Kaito, Blademaster | Twin slash | Side quest "Dorran's Trial" | Crescent Wave | +Crit, fast combo |

Each hero has 5 colour skins (wardrobe).

## 5. The Five Depths (main quest order)

| # | Depth | Biome | Enemies | Boss | Ember |
|---|---|---|---|---|---|
| 1 | Whisperwood | forest | slimes, mushrooms, wasps, worms | **Gorehorn**, the Warden (Minotaur) | Ember of Growth |
| 2 | Sunken Crypt | dungeon | skeletons, zombies, ghosts, skeleton warriors | **The Twin Sisters Sseth & Ivra** (Lamias) | Ember of Memory |
| 3 | Scorchsand Dunes | desert | scorpions, sand worms, lamias, sword-slimes | **Azhar**, the Bound Djinn | Ember of Will |
| 4 | Frostveil Cathedral | ice | ghosts, frost slimes, wraiths, succubi | **Vesper**, Queen of the Frozen Heart | Ember of Love |
| 5 | Hollow Throne | lava / void | elite mix, magi, minotaurs | **Malachar**, the Hollow King (2 phases) | Ember of Dawn |

Each depth = 3 floors + boss floor. A full run passes all unlocked depths in order.
After the first victory: **Vows of Night** (heat system) and **Endless Descent** unlock.

## 6. Floor structure (why 100 runs feel different)

- Each floor is a generated **branching node map** (6–8 rows, 2–4 lanes). The player chooses the path.
- Node types: Combat, Elite, Treasure, Shop, Spirit Shrine (boon), Event (story choice), Campfire (rest/upgrade),
  Challenge (optional trial), Mystery (?), Boss.
- Rooms are generated arenas: layout template × obstacles × hazards × biome decoration × lighting.
- **Room modifiers** (random, telegraphed): Darkness, Poison Fog, Cracked Floor, Haste, Blood Moon (elites), Treasure Goblin.
- **Elite affixes**: Swift, Shielded, Volatile, Vampiric, Splitting, Blink, Frenzied, Frozen, Burning, Summoner.
- **Six Spirits** grant boons: Ember (burn), Rime (chill/freeze), Tempest (shock/chain), Venom (poison), Aurora (holy/heal),
  Umbra (crit/execute). 12+ boons each, rarities, and **Duo boons** between spirit pairs.
- **Relics** (100+) with synergies, **cursed relics** with trade-offs.
- Run seeds, Daily Run (fixed seed + mutators), Weekly challenge.

## 7. RPG systems

- **Stats**: HP, ATK, DEF, Crit %, Crit Dmg, Attack speed, Move speed, Dodge charges, Luck, Lifesteal, Cooldown,
  Elemental damage, Status chance, Gold find, Magic find.
- **Status effects**: Burn, Chill→Freeze, Shock, Poison (stacks), Bleed, Stun, Weaken, Vulnerable, Slow, Haste, Shield, Regen.
- **Equipment** (persistent): Weapon, Helm, Armor, Boots, Ring, Amulet, Charm.
  Rarity: Common, Magic, Rare, Epic, Legendary, Mythic. Rolled affixes, item level, upgrade level (+0..+15),
  **sets** (bonus at 2/4 pieces), **uniques** with special powers.
- **Inventory** with sorting, compare, lock, salvage, bulk salvage.
- **Materials** from runs: ore, herbs, essences, ember shards, boss trophies.
- **Village upgrades**: Blacksmith (upgrade, forge, reforge), Alchemist (flask upgrades, elixirs),
  Lantern Tree (permanent talents), Garden (plant seeds between runs), Merchant (daily stock), Hunter's Board (bounties).
- **Codex**: bestiary (kills, lore), items, relics, boons, lore pages, achievements.

## 8. Quests

- **Main quest**: 12 chapters following the Depth order, with story scenes in the village after each boss.
- **Side quests** (15+ fixed chains): Lost Cat (Wren), Brom's Hammer, Ysolde's Recipes, Hunter's Oath, Letters of the
  Dead, Mira's First Harvest, Liora's Pilgrimage, Pip's Debt, The Bard's Songs, Nyx's Riddle, Dorran's Trial,
  Tobin's Atlas, and more.
- **Bounties**: rotating daily objectives from the Hunter's Board.
- **Memory Shards** (hidden in events/lore) unlock the **true ending**.

## 9. Village NPCs (each with a unique portrait)

Maren (spirit of the Lantern, main quest), Brom (blacksmith), Ysolde (alchemist), Pip (merchant), Sister Liora (shrine),
Kael (hunter, bounties), Tobin (scholar, codex), Nyx (hooded stranger, Vows), Mira (farmer, garden),
Captain Dorran (training), Wren (child), Finn (bard, jukebox).

## 10. App flow

```
Launch -> Splash (studio + title) -> [first launch] Language + Onboarding (3 cards) -> Intro cinematic (skippable)
       -> Main menu: Continue / New Game / Settings / Codex / About / Share / Rate
       -> Village -> Descend -> Run -> Results -> Village
```

Settings: music volume, SFX volume, vibration, screen shake, damage numbers, auto-attack, joystick mode
(floating/fixed), language (EN/ID), graphics quality (particles, lighting), reset save.

## 11. Presentation

- 16×16 pixel art (Super Retro Collection), world camera zoom 2×, integer-scaled canvas.
- Dynamic darkness with light sources (lantern, torches, projectiles), bloom/vignette post-FX, particles.
- Juice: hit-stop, white flash, knockback, screen shake, damage numbers, slow-motion boss kills.
- Audio: adaptive music per location (village, each depth, boss, victory), 60+ SFX, UI sounds, haptics.
