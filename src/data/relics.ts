import type { L10n } from '@/core/i18n';
import type { Mod, StatKey } from './stats';
import type { EffectRef } from './types';

export type RelicTier = 'common' | 'rare' | 'epic' | 'legendary' | 'cursed';

export interface RelicDef {
  id: string;
  name: L10n;
  desc: L10n;
  tier: RelicTier;
  mods: Mod[];
  effects: EffectRef[];
  /** Only drops from bosses / specific sources. */
  special?: boolean;
  icon: string;
}

const mods = (...m: [StatKey, 'flat' | 'pct' | 'more', number][]): Mod[] => m.map(([stat, type, value]) => ({ stat, type, value }));
const fx = (id: string, ...p: number[]): EffectRef => ({ id, p });

function r(id: string, tier: RelicTier, en: string, idn: string, dEn: string, dId: string, m: Mod[] = [], e: EffectRef[] = [], special = false): RelicDef {
  return { id, name: { en, id: idn }, desc: { en: dEn, id: dId }, tier, mods: m, effects: e, special, icon: `icons_relic_${id}` };
}

export const RELICS: RelicDef[] = [
  // ---------------------------------------------------------------- common (stat)
  r('whetstone', 'common', 'Whetstone', 'Batu Asah', '+12% ATK.', '+12% ATK.', mods(['atk', 'pct', 12])),
  r('iron_heart', 'common', 'Iron Heart', 'Jantung Besi', '+30 Max HP.', '+30 HP Maks.', mods(['maxHp', 'flat', 30])),
  r('feather', 'common', 'Swift Feather', 'Bulu Gesit', '+10% Move Speed.', '+10% Kecepatan Gerak.', mods(['moveSpeed', 'pct', 10])),
  r('lucky_clover', 'common', 'Four-Leaf Clover', 'Semanggi Empat', '+15 Luck.', '+15 Keberuntungan.', mods(['luck', 'flat', 15])),
  r('hourglass', 'common', 'Sand Hourglass', 'Jam Pasir', '+12% Cooldown Reduction.', '+12% Pengurangan Cooldown.', mods(['cdr', 'pct', 12])),
  r('eagle_eye', 'common', 'Eagle Eye', 'Mata Elang', '+8% Crit Chance.', '+8% Peluang Kritis.', mods(['critChance', 'pct', 8])),
  r('heavy_pommel', 'common', 'Heavy Pommel', 'Gagang Berat', '+30% Crit Damage.', '+30% Damage Kritis.', mods(['critDmg', 'pct', 30])),
  r('coin_purse', 'common', 'Coin Purse', 'Kantong Koin', '+30% Gold Find.', '+30% Temuan Emas.', mods(['goldFind', 'pct', 30])),
  r('prism', 'common', 'Prism Shard', 'Serpih Prisma', '+25% Magic Find.', '+25% Temuan Sihir.', mods(['magicFind', 'pct', 25])),
  r('buckler', 'common', 'Old Buckler', 'Perisai Tua', '+12 Defense.', '+12 Pertahanan.', mods(['def', 'flat', 12])),
  r('gloves', 'common', 'Quick Gloves', 'Sarung Tangan Cekatan', '+12% Attack Speed.', '+12% Kecepatan Serang.', mods(['atkSpeed', 'pct', 12])),
  r('magnet', 'common', 'Lodestone', 'Batu Magnet', '+20 Pickup Radius.', '+20 Radius Ambil.', mods(['pickupRadius', 'flat', 20])),
  r('herb_pouch', 'common', 'Herb Pouch', 'Kantong Herbal', '+40% Potion power.', '+40% kekuatan Ramuan.', mods(['potionPower', 'pct', 40])),
  r('ember_stone', 'common', 'Ember Stone', 'Batu Bara', '+20% Fire damage, +10% Burn chance.', '+20% damage Api, +10% peluang Bakar.', mods(['fireDmg', 'pct', 20], ['burnChance', 'pct', 10])),
  r('frost_stone', 'common', 'Frost Stone', 'Batu Es', '+20% Frost damage, +10% Chill chance.', '+20% damage Es, +10% peluang Beku.', mods(['iceDmg', 'pct', 20], ['chillChance', 'pct', 10])),
  r('storm_stone', 'common', 'Storm Stone', 'Batu Badai', '+20% Storm damage, +10% Shock chance.', '+20% damage Petir, +10% peluang Setrum.', mods(['shockDmg', 'pct', 20], ['shockChance', 'pct', 10])),
  r('venom_stone', 'common', 'Venom Stone', 'Batu Bisa', '+20% Venom damage, +10% Poison chance.', '+20% damage Racun, +10% peluang Racun.', mods(['poisonDmg', 'pct', 20], ['poisonChance', 'pct', 10])),
  r('sun_stone', 'common', 'Sun Stone', 'Batu Surya', '+20% Radiant damage, +1 HP/s regen.', '+20% damage Cahaya, +1 regen HP/dtk.', mods(['holyDmg', 'pct', 20], ['regen', 'flat', 1])),
  r('night_stone', 'common', 'Night Stone', 'Batu Malam', '+20% Shadow damage, +10% Bleed chance.', '+20% damage Bayangan, +10% peluang Pendarahan.', mods(['shadowDmg', 'pct', 20], ['bleedChance', 'pct', 10])),
  r('lens', 'common', 'Focusing Lens', 'Lensa Fokus', '+20% Skill damage.', '+20% damage Skill.', mods(['skillDmg', 'pct', 20])),
  r('boots_wind', 'common', 'Wind Anklet', 'Gelang Angin', '+1 Dash charge.', '+1 muatan Dash.', mods(['dashCharges', 'flat', 1])),
  r('bandage', 'common', 'Clean Bandages', 'Perban Bersih', 'Heal 1 HP on kill.', 'Pulih 1 HP saat membunuh.', mods(['healOnKill', 'flat', 1])),
  r('thorn_vest', 'common', 'Thorn Vest', 'Rompi Duri', 'Reflect 12 damage when hit.', 'Pantulkan 12 damage saat terkena.', mods(['thorns', 'flat', 12])),
  r('ward_charm', 'common', 'Ward Charm', 'Jimat Pelindung', 'Start each room with 15 shield.', 'Mulai setiap ruangan dengan perisai 15.', mods(['shieldOnRoom', 'flat', 15])),
  r('long_haft', 'common', 'Long Haft', 'Gagang Panjang', '+15% Range.', '+15% Jangkauan.', mods(['range', 'pct', 15])),
  r('big_book', 'common', 'Tome of Breadth', 'Buku Keluasan', '+20% Area size.', '+20% Luas area.', mods(['areaSize', 'pct', 20])),
  r('fletching', 'common', 'Fine Fletching', 'Bulu Panah Halus', '+25% Projectile speed, +10% ATK.', '+25% Laju proyektil, +10% ATK.', mods(['projSpeed', 'pct', 25], ['atk', 'pct', 5])),
  r('tonic', 'common', 'Bitter Tonic', 'Tonik Pahit', '+8% Evasion.', '+8% Menghindar.', mods(['dodge', 'pct', 8])),
  r('boss_tooth', 'common', 'Giant\'s Tooth', 'Gigi Raksasa', '+20% Boss damage.', '+20% damage Bos.', mods(['bossDmg', 'pct', 20])),
  r('elite_badge', 'common', 'Hunter\'s Badge', 'Lencana Pemburu', '+25% Elite damage.', '+25% damage Elit.', mods(['eliteDmg', 'pct', 25])),

  // ---------------------------------------------------------------- rare (mechanics)
  r('twin_arrows', 'rare', 'Twin Fletch', 'Panah Kembar', '+1 projectile on attacks.', '+1 proyektil pada serangan.', mods(['extraProjectiles', 'flat', 1])),
  r('vampire_fang', 'rare', 'Vampire Fang', 'Taring Vampir', '+4% Lifesteal.', '+4% Curi Nyawa.', mods(['lifesteal', 'pct', 4])),
  r('reaper_coin', 'rare', 'Reaper\'s Coin', 'Koin Pencabut Nyawa', 'Execute enemies below 10% HP.', 'Eksekusi musuh di bawah 10% HP.', mods(['executeBelow', 'pct', 10])),
  r('ember_core', 'rare', 'Ember Core', 'Inti Bara', 'Burning enemies explode on death (100% ATK).', 'Musuh terbakar meledak saat mati (100% ATK).', [], [fx('burn_explode', 100)]),
  r('frost_core', 'rare', 'Frozen Core', 'Inti Beku', 'Frozen enemies take +30% damage and shatter.', 'Musuh beku menerima +30% damage dan pecah.', [], [fx('shatter', 30)]),
  r('storm_core', 'rare', 'Storm Core', 'Inti Badai', 'Every 4th hit chains lightning (70% ATK).', 'Setiap pukulan ke-4 memicu rantai petir (70% ATK).', [], [fx('chain_lightning', 70, 4, 3)]),
  r('rot_core', 'rare', 'Rot Core', 'Inti Busuk', 'Poisoned enemies burst on death (80% ATK).', 'Musuh teracun meledak saat mati (80% ATK).', [], [fx('poison_burst', 80)]),
  r('holy_relic', 'rare', 'Saint\'s Knuckle', 'Buku Jari Santo', 'Every 6th attack smites for 150% ATK.', 'Setiap serangan ke-6 menghantam 150% ATK.', [], [fx('smite', 150, 6)]),
  r('shadow_cloak', 'rare', 'Shade Cloak', 'Jubah Bayang', 'Kills have 35% chance to refund a Dash.', 'Membunuh berpeluang 35% mengembalikan Dash.', [], [fx('kill_dash', 35)]),
  r('berserker_mask', 'rare', 'Berserker Mask', 'Topeng Berserker', '+40% damage while below 40% HP.', '+40% damage saat HP di bawah 40%.', [], [fx('low_hp_dmg', 40)]),
  r('paragon_crown', 'rare', 'Paragon Circlet', 'Diadem Teladan', '+25% damage while at full HP.', '+25% damage saat HP penuh.', [], [fx('full_hp_dmg', 25)]),
  r('gold_idol', 'rare', 'Midas Idol', 'Berhala Midas', '+1% damage per 25 gold carried (max 40%).', '+1% damage per 25 emas dibawa (maks 40%).', [], [fx('gold_dmg', 25, 40)]),
  r('first_blood', 'rare', 'First Blood', 'Darah Pertama', 'First hit on each enemy deals +50% and crits.', 'Pukulan pertama ke tiap musuh +50% dan kritis.', [], [fx('first_strike', 50)]),
  r('echo_bell', 'rare', 'Echo Bell', 'Lonceng Gema', 'Skill cooldown -1s on kill.', 'Cooldown skill -1 dtk saat membunuh.', [], [fx('kill_cdr', 1)]),
  r('spiked_boots', 'rare', 'Spiked Boots', 'Sepatu Paku', 'Dashing through enemies deals 80% ATK.', 'Dash menembus musuh memberi 80% ATK.', [], [fx('dash_hit', 80)]),
  r('lantern_oil', 'rare', 'Lantern Oil', 'Minyak Lentera', 'Flare charges 40% faster.', 'Flare terisi 40% lebih cepat.', mods(['flareGain', 'pct', 40])),
  r('mirror_shield', 'rare', 'Mirror Shield', 'Perisai Cermin', '15% chance to reflect enemy projectiles.', '15% peluang memantulkan proyektil musuh.', [], [fx('reflect', 15)]),
  r('momentum', 'rare', 'Momentum Charm', 'Jimat Momentum', 'Kills grant +20% Attack/Move speed for 2s.', 'Membunuh memberi +20% kecepatan serang/gerak 2 dtk.', [], [fx('kill_haste', 20)]),
  r('meteor_map', 'rare', 'Star Chart', 'Peta Bintang', 'A meteor falls every 6s (180% ATK).', 'Meteor jatuh tiap 6 dtk (180% ATK).', [], [fx('meteor', 180, 6)]),
  r('thunder_rod', 'rare', 'Thunder Rod', 'Tongkat Guntur', 'Lightning strikes a foe every 4s (140% ATK).', 'Petir menyambar musuh tiap 4 dtk (140% ATK).', [], [fx('thunder_strike', 140, 4)]),
  r('frost_bell', 'rare', 'Frost Bell', 'Lonceng Beku', 'Nearby enemies are periodically Chilled.', 'Musuh di dekat secara berkala Membeku.', [], [fx('frost_aura', 44)]),
  r('censer', 'rare', 'Plague Censer', 'Pedupaan Wabah', 'Release a poison cloud every 4s (60% ATK).', 'Lepaskan awan racun tiap 4 dtk (60% ATK).', [], [fx('venom_cloud', 60, 4)]),
  r('halo_ring', 'rare', 'Halo Ring', 'Cincin Halo', '2 orbs of light circle you.', '2 bola cahaya mengitarimu.', [], [fx('halo_orbs', 2)]),
  r('dancing_knives', 'rare', 'Dancing Knives', 'Pisau Menari', '2 blades orbit you.', '2 pedang mengitarimu.', [], [fx('orbit_blades', 2)]),
  r('phylactery', 'rare', 'Cracked Phylactery', 'Filakteri Retak', 'Heal 25% HP when you clear a room below 30% HP.', 'Pulih 25% HP saat membersihkan ruangan dengan HP di bawah 30%.', [], [fx('clutch_heal', 25)]),
  r('chest_key', 'rare', 'Skeleton Key', 'Kunci Tengkorak', 'Treasure chests drop an extra item.', 'Peti harta menjatuhkan item tambahan.', [], [fx('extra_chest', 1)]),
  r('merchant_seal', 'rare', 'Merchant\'s Seal', 'Segel Pedagang', 'Shop prices -20%.', 'Harga toko -20%.', [], [fx('shop_discount', 20)]),
  r('dice', 'rare', 'Loaded Dice', 'Dadu Curang', '+2 Boon rerolls.', '+2 kesempatan acak ulang Anugerah.', [], [fx('rerolls', 2)]),
  r('scholar_quill', 'rare', 'Scholar\'s Quill', 'Pena Cendekia', '+30% Ember XP.', '+30% XP Bara.', mods(['xpGain', 'pct', 30])),
  r('iron_skin', 'rare', 'Troll Hide', 'Kulit Troll', '+8% Damage Reduction, +2 HP/s regen.', '+8% Reduksi Damage, +2 regen HP/dtk.', mods(['dmgReduction', 'pct', 8], ['regen', 'flat', 2])),
  r('pierce_tip', 'rare', 'Piercing Tip', 'Ujung Tembus', 'Projectiles pierce 2 enemies.', 'Proyektil menembus 2 musuh.', [], [fx('pierce', 2)]),
  r('rubber_ball', 'rare', 'Bouncing Ball', 'Bola Memantul', 'Projectiles bounce off walls once.', 'Proyektil memantul dari dinding sekali.', [], [fx('bounce', 1)]),
  r('homing_eye', 'rare', 'Seeker\'s Eye', 'Mata Pencari', 'Projectiles gently home in.', 'Proyektil sedikit mengejar musuh.', [], [fx('homing', 2)]),
  r('retaliation', 'rare', 'Wrath Totem', 'Totem Amarah', 'When hit, release a nova (120% ATK).', 'Saat terkena, lepaskan nova (120% ATK).', [], [fx('retaliate', 120)]),
  r('elixir_vial', 'rare', 'Endless Vial', 'Botol Tanpa Dasar', '+1 Flask charge.', '+1 muatan Ramuan.', [], [fx('extra_flask', 1)]),
  r('overkill', 'rare', 'Butcher\'s Hook', 'Kait Jagal', 'Excess damage on kill splashes to nearby enemies.', 'Kelebihan damage saat membunuh memercik ke musuh sekitar.', [], [fx('overkill', 100)]),
  r('frenzy_idol', 'rare', 'Frenzy Idol', 'Berhala Amukan', 'Each consecutive hit +2% damage (max 30%), resets when hit.', 'Setiap pukulan beruntun +2% damage (maks 30%), reset saat terkena.', [], [fx('combo_dmg', 2, 30)]),

  // ---------------------------------------------------------------- epic
  r('phoenix_feather', 'epic', 'Phoenix Feather', 'Bulu Phoenix', 'Revive once with 40% HP.', 'Bangkit sekali dengan 40% HP.', [], [fx('second_wind', 40)]),
  r('crown_thorns', 'epic', 'Crown of Thorns', 'Mahkota Duri', 'Reflect 40 damage, +40 Max HP.', 'Pantulkan 40 damage, +40 HP Maks.', mods(['thorns', 'flat', 40], ['maxHp', 'flat', 40])),
  r('storm_heart', 'epic', 'Heart of the Storm', 'Jantung Badai', 'Crits chain lightning (90% ATK). +10% Crit.', 'Kritis memicu rantai petir (90% ATK). +10% Kritis.', mods(['critChance', 'pct', 10]), [fx('crit_chain', 90)]),
  r('dragon_scale', 'epic', 'Dragon Scale', 'Sisik Naga', '+20% Damage Reduction, immune to Burn.', '+20% Reduksi Damage, kebal Bakar.', mods(['dmgReduction', 'pct', 20]), [fx('immune_burn', 1)]),
  r('winter_crown', 'epic', 'Winter Crown', 'Mahkota Musim Dingin', 'Enemies start rooms Chilled. Immune to Chill.', 'Musuh memulai ruangan Membeku. Kebal Beku.', [], [fx('room_chill', 20), fx('immune_chill', 1)]),
  r('assassin_blade', 'epic', 'Assassin\'s Blade', 'Pedang Pembunuh', '+15% Crit, +60% Crit Damage.', '+15% Kritis, +60% Damage Kritis.', mods(['critChance', 'pct', 15], ['critDmg', 'pct', 60])),
  r('sun_disk', 'epic', 'Sun Disk', 'Cakram Surya', 'Every 5th attack smites (250% ATK) and heals 3.', 'Setiap serangan ke-5 menghantam (250% ATK) dan pulih 3.', [], [fx('smite', 250, 5), fx('smite_heal', 3)]),
  r('hydra_tooth', 'epic', 'Hydra Tooth', 'Gigi Hydra', 'Poison stacks +6 and deals +40%.', 'Tumpukan racun +6 dan +40%.', mods(['poisonDmg', 'pct', 40]), [fx('poison_stacks', 6)]),
  r('quiver', 'epic', 'Endless Quiver', 'Tabung Panah Abadi', '+2 projectiles.', '+2 proyektil.', mods(['extraProjectiles', 'flat', 2])),
  r('time_gear', 'epic', 'Clockwork Gear', 'Roda Gigi Jam', '+25% Attack Speed, +15% CDR.', '+25% Kecepatan Serang, +15% CDR.', mods(['atkSpeed', 'pct', 25], ['cdr', 'pct', 15])),
  r('blood_chalice', 'epic', 'Blood Chalice', 'Piala Darah', '+8% Lifesteal, crits heal 2.', '+8% Curi Nyawa, kritis memulihkan 2.', mods(['lifesteal', 'pct', 8]), [fx('crit_heal', 2)]),
  r('titan_belt', 'epic', 'Titan Belt', 'Sabuk Titan', '+80 Max HP, +20 Defense.', '+80 HP Maks, +20 Pertahanan.', mods(['maxHp', 'flat', 80], ['def', 'flat', 20])),
  r('war_drum', 'epic', 'War Drum', 'Genderang Perang', '+30% ATK, +10% Move Speed.', '+30% ATK, +10% Kecepatan Gerak.', mods(['atk', 'pct', 30], ['moveSpeed', 'pct', 10])),
  r('void_lens', 'epic', 'Void Lens', 'Lensa Hampa', 'Dashing empowers your next attack (+100%, crit).', 'Dash memperkuat serangan berikutnya (+100%, kritis).', [], [fx('dash_empower', 100)]),
  r('lucky_star', 'epic', 'Lucky Star', 'Bintang Keberuntungan', '+40 Luck, +50% Magic Find.', '+40 Keberuntungan, +50% Temuan Sihir.', mods(['luck', 'flat', 40], ['magicFind', 'pct', 50])),

  // ---------------------------------------------------------------- legendary (boss drops)
  r('gorehorn_horn', 'legendary', 'Gorehorn\'s Horn', 'Tanduk Gorehorn', 'Dash through enemies for 200% ATK and stun them.', 'Dash menembus musuh 200% ATK dan membuat mereka pingsan.', [], [fx('dash_hit', 200), fx('dash_stun', 1)], true),
  r('twin_scales', 'legendary', 'Twin Scales', 'Sisik Kembar', 'Attacks hit twice at 60% power.', 'Serangan mengenai dua kali dengan 60% kekuatan.', [], [fx('double_hit', 60)], true),
  r('djinn_lamp', 'legendary', 'Djinn\'s Lamp', 'Lampu Jin', 'Grants 3 random common Boons.', 'Memberi 3 Anugerah acak.', [], [fx('grant_boons', 3)], true),
  r('frozen_heart', 'legendary', 'Vesper\'s Frozen Heart', 'Hati Beku Vesper', 'Freeze on crit. Frozen enemies take +60% damage.', 'Beku saat kritis. Musuh beku menerima +60% damage.', [], [fx('crit_freeze', 1), fx('shatter', 60)], true),
  r('hollow_crown', 'legendary', 'The Hollow Crown', 'Mahkota Hampa', '+50% all damage. You cannot heal from potions.', '+50% semua damage. Ramuan tidak bisa memulihkan.', mods(['atk', 'more', 50]), [fx('no_potion', 1)], true),
  r('lantern_shard', 'legendary', 'Shard of the Dawnstone', 'Serpih Batu Fajar', 'Flare recharges on room clear. +50% Flare damage.', 'Flare terisi saat ruangan bersih. +50% damage Flare.', [], [fx('flare_room', 100), fx('flare_dmg', 50)], true),

  // ---------------------------------------------------------------- cursed (trade-offs)
  r('cursed_blade', 'cursed', 'Cursed Blade', 'Pedang Terkutuk', '+60% ATK. Lose 1 HP per second in combat.', '+60% ATK. Kehilangan 1 HP per detik saat bertarung.', mods(['atk', 'more', 60]), [fx('hp_drain', 1)]),
  r('glass_heart', 'cursed', 'Glass Heart', 'Hati Kaca', '+40% damage, -40% Max HP.', '+40% damage, -40% HP Maks.', mods(['atk', 'more', 40], ['maxHp', 'more', -40])),
  r('greed_idol', 'cursed', 'Idol of Greed', 'Berhala Serakah', '+100% Gold Find, enemies +20% HP.', '+100% Temuan Emas, musuh +20% HP.', mods(['goldFind', 'pct', 100]), [fx('enemy_hp', 20)]),
  r('blind_eye', 'cursed', 'Blindfold', 'Penutup Mata', '+30% Crit Chance, darkness deepens.', '+30% Peluang Kritis, kegelapan makin pekat.', mods(['critChance', 'pct', 30]), [fx('darker', 25)]),
  r('lead_boots', 'cursed', 'Lead Boots', 'Sepatu Timah', '+30% Damage Reduction, -20% Move Speed.', '+30% Reduksi Damage, -20% Kecepatan Gerak.', mods(['dmgReduction', 'pct', 30], ['moveSpeed', 'pct', -20])),
  r('blood_price', 'cursed', 'Blood Price', 'Harga Darah', 'Shops cost HP instead of gold.', 'Toko meminta HP, bukan emas.', [], [fx('blood_shop', 1)]),
  r('wild_magic', 'cursed', 'Wild Magic', 'Sihir Liar', 'Every room, gain a random boon but lose a random one.', 'Setiap ruangan, dapat anugerah acak tapi kehilangan satu acak.', [], [fx('wild_magic', 1)]),
  r('berserk_chain', 'cursed', 'Berserk Chain', 'Rantai Berserk', '+40% Attack Speed, cannot Dash.', '+40% Kecepatan Serang, tidak bisa Dash.', mods(['atkSpeed', 'pct', 40]), [fx('no_dash', 1)]),
];

export function relicDef(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

export const RELIC_TIER_COLOR: Record<RelicTier, number> = {
  common: 0xd8d4e6, rare: 0x5fa8ff, epic: 0xb77cff, legendary: 0xff9a3c, cursed: 0xe0304a,
};
