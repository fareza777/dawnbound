import type { L10n } from '@/core/i18n';
import type { Mod } from './stats';
import type { EffectRef } from './types';

export type SpiritId = 'ember' | 'rime' | 'tempest' | 'venom' | 'aurora' | 'umbra';

export interface SpiritDef {
  id: SpiritId;
  name: L10n;
  title: L10n;
  color: number;
  element: string;
  greeting: L10n;
  portrait: string;
}

export const SPIRITS: Record<SpiritId, SpiritDef> = {
  ember: {
    id: 'ember', name: { en: 'Ignis', id: 'Ignis' }, title: { en: 'Spirit of Ember', id: 'Roh Bara' }, color: 0xff7a2f, element: 'fire',
    greeting: { en: 'Little flame, let me teach you to roar.', id: 'Nyala kecil, biar kuajari kau mengaum.' }, portrait: 'portraits_spirit_ember',
  },
  rime: {
    id: 'rime', name: { en: 'Nivalis', id: 'Nivalis' }, title: { en: 'Spirit of Rime', id: 'Roh Embun Beku' }, color: 0x9ee8ff, element: 'ice',
    greeting: { en: 'Stillness is a weapon. Hold it.', id: 'Keheningan adalah senjata. Genggamlah.' }, portrait: 'portraits_spirit_rime',
  },
  tempest: {
    id: 'tempest', name: { en: 'Volta', id: 'Volta' }, title: { en: 'Spirit of Tempest', id: 'Roh Badai' }, color: 0xfff27a, element: 'shock',
    greeting: { en: 'Faster! The storm waits for no one!', id: 'Lebih cepat! Badai tak menunggu siapa pun!' }, portrait: 'portraits_spirit_tempest',
  },
  venom: {
    id: 'venom', name: { en: 'Verdra', id: 'Verdra' }, title: { en: 'Spirit of Venom', id: 'Roh Racun' }, color: 0x8fdc4a, element: 'poison',
    greeting: { en: 'Patience, keeper. Rot is certain.', id: 'Sabar, penjaga. Kebusukan itu pasti.' }, portrait: 'portraits_spirit_venom',
  },
  aurora: {
    id: 'aurora', name: { en: 'Solenne', id: 'Solenne' }, title: { en: 'Spirit of Aurora', id: 'Roh Fajar' }, color: 0xfff0a0, element: 'holy',
    greeting: { en: 'You carry the dawn. Let it mend you.', id: 'Kau membawa fajar. Biarkan ia memulihkanmu.' }, portrait: 'portraits_spirit_aurora',
  },
  umbra: {
    id: 'umbra', name: { en: 'Nox', id: 'Nox' }, title: { en: 'Spirit of Umbra', id: 'Roh Bayangan' }, color: 0xb080ff, element: 'shadow',
    greeting: { en: 'Every shadow is a door. Walk through.', id: 'Setiap bayangan adalah pintu. Masuklah.' }, portrait: 'portraits_spirit_umbra',
  },
};

export const SPIRIT_IDS = Object.keys(SPIRITS) as SpiritId[];

export interface BoonDef {
  id: string;
  spirit: SpiritId;
  /** Second spirit for Duo boons. */
  duo?: SpiritId;
  name: L10n;
  /** {v} = primary value at the current rank, {v2} = secondary. */
  desc: L10n;
  maxRank: number;
  values: number[];
  values2?: number[];
  mods?: (v: number, v2: number) => Mod[];
  effects?: (v: number, v2: number) => EffectRef[];
  /** Offered only if the player owns at least one boon of the listed spirits. */
  legendary?: boolean;
  requires?: string[];
}

const pct = (stat: Mod['stat']) => (v: number): Mod[] => [{ stat, type: 'pct', value: v }];
const flat = (stat: Mod['stat']) => (v: number): Mod[] => [{ stat, type: 'flat', value: v }];

export const BOONS: BoonDef[] = [
  // ---------------------------------------------------------------- EMBER
  { id: 'em_kindle', spirit: 'ember', name: { en: 'Kindling Strikes', id: 'Serangan Pemantik' }, desc: { en: 'Attacks have {v}% chance to Burn.', id: 'Serangan berpeluang {v}% Membakar.' }, maxRank: 5, values: [20, 30, 40, 50, 60], mods: pct('burnChance') },
  { id: 'em_blaze', spirit: 'ember', name: { en: 'Blazing Soul', id: 'Jiwa Berkobar' }, desc: { en: '+{v}% Fire damage and Burn deals more.', id: '+{v}% damage Api dan Bakar lebih kuat.' }, maxRank: 5, values: [15, 25, 35, 45, 55], mods: (v) => [{ stat: 'fireDmg', type: 'pct', value: v }, { stat: 'statusPower', type: 'flat', value: v / 2 }] },
  { id: 'em_pyre', spirit: 'ember', name: { en: 'Funeral Pyre', id: 'Api Unggun Duka' }, desc: { en: 'Burning enemies explode on death for {v}% ATK.', id: 'Musuh terbakar meledak saat mati sebesar {v}% ATK.' }, maxRank: 4, values: [80, 120, 160, 200], effects: (v) => [{ id: 'burn_explode', p: [v] }] },
  { id: 'em_flashfire', spirit: 'ember', name: { en: 'Flashfire Dash', id: 'Dash Kilat Api' }, desc: { en: 'Your dash ends in a fire blast for {v}% ATK.', id: 'Dash-mu diakhiri ledakan api {v}% ATK.' }, maxRank: 4, values: [90, 130, 170, 210], effects: (v) => [{ id: 'dash_nova', p: [v] }] },
  { id: 'em_meteor', spirit: 'ember', name: { en: 'Falling Star', id: 'Bintang Jatuh' }, desc: { en: 'Every {v2}s a meteor strikes a foe for {v}% ATK.', id: 'Tiap {v2} dtk meteor menghantam musuh {v}% ATK.' }, maxRank: 4, values: [150, 200, 250, 300], values2: [5, 4.5, 4, 3.5], effects: (v, v2) => [{ id: 'meteor', p: [v, v2] }] },
  { id: 'em_trail', spirit: 'ember', name: { en: 'Scorched Path', id: 'Jejak Hangus' }, desc: { en: 'Dashing leaves flames that deal {v}% ATK per second.', id: 'Dash meninggalkan api {v}% ATK per detik.' }, maxRank: 3, values: [60, 90, 120], effects: (v) => [{ id: 'ember_trail', p: [v] }] },
  { id: 'em_heart', spirit: 'ember', name: { en: 'Emberheart', id: 'Hati Bara' }, desc: { en: '+{v}% ATK. Burning enemies heal you 1 HP on death.', id: '+{v}% ATK. Musuh terbakar memulihkanmu 1 HP saat mati.' }, maxRank: 5, values: [8, 12, 16, 20, 24], mods: pct('atk'), effects: () => [{ id: 'burn_kill_heal', p: [1] }] },
  { id: 'em_crit', spirit: 'ember', name: { en: 'White Flame', id: 'Api Putih' }, desc: { en: 'Critical hits always Burn. +{v}% Crit Damage.', id: 'Serangan kritis selalu Membakar. +{v}% Damage Kritis.' }, maxRank: 4, values: [15, 25, 35, 45], mods: pct('critDmg'), effects: () => [{ id: 'crit_burn', p: [1] }] },
  { id: 'em_skill', spirit: 'ember', name: { en: 'Inferno Rite', id: 'Ritual Inferno' }, desc: { en: 'Your Skill deals +{v}% damage and Burns.', id: 'Skill-mu +{v}% damage dan Membakar.' }, maxRank: 4, values: [25, 40, 55, 70], mods: pct('skillDmg'), effects: () => [{ id: 'skill_burn', p: [1] }] },
  { id: 'em_wall', spirit: 'ember', name: { en: 'Ring of Cinders', id: 'Cincin Arang' }, desc: { en: 'Enemies that touch you ignite and take {v}% ATK.', id: 'Musuh yang menyentuhmu terbakar dan menerima {v}% ATK.' }, maxRank: 3, values: [60, 100, 140], effects: (v) => [{ id: 'retaliate_fire', p: [v] }] },
  { id: 'em_flare', spirit: 'ember', name: { en: 'Solar Hunger', id: 'Lapar Surya' }, desc: { en: '+{v}% Flare charge rate.', id: '+{v}% laju isi Flare.' }, maxRank: 4, values: [20, 35, 50, 65], mods: pct('flareGain') },
  { id: 'em_phoenix', spirit: 'ember', legendary: true, name: { en: 'Phoenix Rebirth', id: 'Kelahiran Phoenix' }, desc: { en: 'Once per run, rise from death with {v}% HP in a blast of fire.', id: 'Sekali per run, bangkit dari kematian dengan {v}% HP dalam ledakan api.' }, maxRank: 1, values: [50], effects: (v) => [{ id: 'second_wind', p: [v] }] },

  // ---------------------------------------------------------------- RIME
  { id: 'ri_frostbite', spirit: 'rime', name: { en: 'Frostbite', id: 'Gigitan Beku' }, desc: { en: 'Attacks have {v}% chance to Chill. 3 Chills Freeze.', id: 'Serangan berpeluang {v}% Membekukan. 3 lapis = Beku total.' }, maxRank: 5, values: [25, 35, 45, 55, 65], mods: pct('chillChance') },
  { id: 'ri_shatter', spirit: 'rime', name: { en: 'Shatterpoint', id: 'Titik Pecah' }, desc: { en: 'Frozen enemies take +{v}% damage and shatter on death.', id: 'Musuh beku menerima +{v}% damage dan pecah saat mati.' }, maxRank: 4, values: [25, 40, 55, 70], effects: (v) => [{ id: 'shatter', p: [v] }] },
  { id: 'ri_aura', spirit: 'rime', name: { en: 'Winter\'s Breath', id: 'Napas Musim Dingin' }, desc: { en: 'Enemies within {v} px are periodically Chilled.', id: 'Musuh dalam {v} px secara berkala Membeku.' }, maxRank: 3, values: [36, 48, 60], effects: (v) => [{ id: 'frost_aura', p: [v] }] },
  { id: 'ri_dash', spirit: 'rime', name: { en: 'Glacial Step', id: 'Langkah Gletser' }, desc: { en: 'Dash ends in a frost burst for {v}% ATK that Chills.', id: 'Dash berakhir dengan semburan es {v}% ATK yang Membekukan.' }, maxRank: 4, values: [70, 100, 130, 160], effects: (v) => [{ id: 'dash_frost', p: [v] }] },
  { id: 'ri_armor', spirit: 'rime', name: { en: 'Ice Mail', id: 'Zirah Es' }, desc: { en: '+{v}% Damage Reduction. Attackers are Chilled.', id: '+{v}% Reduksi Damage. Penyerang ikut Membeku.' }, maxRank: 4, values: [6, 9, 12, 15], mods: pct('dmgReduction'), effects: () => [{ id: 'chill_attackers', p: [1] }] },
  { id: 'ri_spike', spirit: 'rime', name: { en: 'Icicle Volley', id: 'Hujan Es' }, desc: { en: 'Every 4th attack launches {v} ice shards.', id: 'Setiap serangan ke-4 meluncurkan {v} serpih es.' }, maxRank: 4, values: [3, 4, 5, 6], effects: (v) => [{ id: 'ice_volley', p: [v] }] },
  { id: 'ri_power', spirit: 'rime', name: { en: 'Deep Cold', id: 'Dingin Mendalam' }, desc: { en: '+{v}% Frost damage. Freeze lasts longer.', id: '+{v}% damage Es. Beku bertahan lebih lama.' }, maxRank: 5, values: [15, 25, 35, 45, 55], mods: (v) => [{ stat: 'iceDmg', type: 'pct', value: v }, { stat: 'statusPower', type: 'flat', value: v / 2 }] },
  { id: 'ri_heart', spirit: 'rime', name: { en: 'Frozen Heart', id: 'Hati Beku' }, desc: { en: '+{v} Max HP. Heal 2 HP when an enemy Freezes.', id: '+{v} HP Maks. Pulih 2 HP saat musuh Membeku.' }, maxRank: 4, values: [15, 25, 35, 45], mods: flat('maxHp'), effects: () => [{ id: 'freeze_heal', p: [2] }] },
  { id: 'ri_skill', spirit: 'rime', name: { en: 'Hoarfrost Rite', id: 'Ritual Embun Beku' }, desc: { en: 'Skill deals +{v}% damage and Chills twice.', id: 'Skill +{v}% damage dan Membekukan dua kali.' }, maxRank: 4, values: [25, 40, 55, 70], mods: pct('skillDmg'), effects: () => [{ id: 'skill_chill', p: [2] }] },
  { id: 'ri_slow', spirit: 'rime', name: { en: 'Numbing Wind', id: 'Angin Kebas' }, desc: { en: 'Enemy projectiles near you slow by {v}%.', id: 'Proyektil musuh di dekatmu melambat {v}%.' }, maxRank: 3, values: [20, 30, 40], effects: (v) => [{ id: 'proj_slow', p: [v] }] },
  { id: 'ri_winter', spirit: 'rime', legendary: true, name: { en: 'Eternal Winter', id: 'Musim Dingin Abadi' }, desc: { en: 'All enemies start each room Chilled. Frozen enemies take +{v}% crit damage.', id: 'Semua musuh memulai ruangan dalam keadaan Membeku. Musuh beku menerima +{v}% damage kritis.' }, maxRank: 1, values: [50], effects: (v) => [{ id: 'room_chill', p: [v] }] },

  // ---------------------------------------------------------------- TEMPEST
  { id: 'te_arc', spirit: 'tempest', name: { en: 'Arc Strike', id: 'Serangan Busur Petir' }, desc: { en: 'Every {v2}rd hit chains lightning for {v}% ATK.', id: 'Setiap pukulan ke-{v2} memicu rantai petir {v}% ATK.' }, maxRank: 5, values: [60, 80, 100, 120, 140], values2: [3, 3, 3, 3, 2], effects: (v, v2) => [{ id: 'chain_lightning', p: [v, v2, 3] }] },
  { id: 'te_haste', spirit: 'tempest', name: { en: 'Quickening', id: 'Percepatan' }, desc: { en: '+{v}% Attack Speed.', id: '+{v}% Kecepatan Serang.' }, maxRank: 5, values: [10, 16, 22, 28, 34], mods: pct('atkSpeed') },
  { id: 'te_wind', spirit: 'tempest', name: { en: 'Tailwind', id: 'Angin Buritan' }, desc: { en: '+{v}% Move Speed and +1 Dash charge.', id: '+{v}% Kecepatan Gerak dan +1 muatan Dash.' }, maxRank: 3, values: [8, 12, 16], mods: (v) => [{ stat: 'moveSpeed', type: 'pct', value: v }, { stat: 'dashCharges', type: 'flat', value: 1 }] },
  { id: 'te_thunder', spirit: 'tempest', name: { en: 'Thunderhead', id: 'Kepala Guntur' }, desc: { en: 'Every {v2}s lightning strikes a foe for {v}% ATK.', id: 'Tiap {v2} dtk petir menyambar musuh {v}% ATK.' }, maxRank: 4, values: [120, 160, 200, 240], values2: [3, 2.7, 2.4, 2.1], effects: (v, v2) => [{ id: 'thunder_strike', p: [v, v2] }] },
  { id: 'te_shock', spirit: 'tempest', name: { en: 'Static Charge', id: 'Muatan Statis' }, desc: { en: 'Attacks have {v}% chance to Shock (+15% damage taken).', id: 'Serangan berpeluang {v}% Menyetrum (+15% damage diterima).' }, maxRank: 5, values: [20, 30, 40, 50, 60], mods: pct('shockChance') },
  { id: 'te_power', spirit: 'tempest', name: { en: 'High Voltage', id: 'Tegangan Tinggi' }, desc: { en: '+{v}% Storm damage.', id: '+{v}% damage Petir.' }, maxRank: 5, values: [20, 30, 40, 50, 60], mods: pct('shockDmg') },
  { id: 'te_dash', spirit: 'tempest', name: { en: 'Lightning Dash', id: 'Dash Petir' }, desc: { en: 'Enemies you dash through take {v}% ATK and are Shocked.', id: 'Musuh yang kau tembus saat dash menerima {v}% ATK dan tersetrum.' }, maxRank: 4, values: [60, 90, 120, 150], effects: (v) => [{ id: 'storm_dash', p: [v] }] },
  { id: 'te_kill', spirit: 'tempest', name: { en: 'Storm Chaser', id: 'Pemburu Badai' }, desc: { en: 'Kills grant +{v}% Move and Attack Speed for 2s.', id: 'Membunuh memberi +{v}% Kecepatan Gerak dan Serang selama 2 dtk.' }, maxRank: 3, values: [15, 25, 35], effects: (v) => [{ id: 'kill_haste', p: [v] }] },
  { id: 'te_cdr', spirit: 'tempest', name: { en: 'Surge', id: 'Lonjakan' }, desc: { en: '+{v}% Cooldown Reduction.', id: '+{v}% Pengurangan Cooldown.' }, maxRank: 4, values: [8, 13, 18, 23], mods: pct('cdr') },
  { id: 'te_skill', spirit: 'tempest', name: { en: 'Thunderclap Rite', id: 'Ritual Guntur' }, desc: { en: 'Your Skill calls {v} lightning bolts.', id: 'Skill-mu memanggil {v} sambaran petir.' }, maxRank: 4, values: [2, 3, 4, 5], effects: (v) => [{ id: 'skill_thunder', p: [v] }] },
  { id: 'te_multi', spirit: 'tempest', name: { en: 'Forked Bolts', id: 'Petir Bercabang' }, desc: { en: 'Chain lightning jumps {v} extra times.', id: 'Rantai petir melompat {v} kali lebih banyak.' }, maxRank: 3, values: [1, 2, 3], requires: ['te_arc'], effects: (v) => [{ id: 'chain_extra', p: [v] }] },
  { id: 'te_zeus', spirit: 'tempest', legendary: true, name: { en: 'Heaven\'s Wrath', id: 'Murka Langit' }, desc: { en: 'Critical hits call down lightning for {v}% ATK.', id: 'Serangan kritis memanggil petir {v}% ATK.' }, maxRank: 1, values: [150], effects: (v) => [{ id: 'crit_thunder', p: [v] }] },

  // ---------------------------------------------------------------- VENOM
  { id: 've_toxin', spirit: 'venom', name: { en: 'Toxin Coat', id: 'Lapisan Racun' }, desc: { en: 'Attacks have {v}% chance to Poison (stacks).', id: 'Serangan berpeluang {v}% Meracun (bertumpuk).' }, maxRank: 5, values: [30, 40, 50, 60, 70], mods: pct('poisonChance') },
  { id: 've_potent', spirit: 'venom', name: { en: 'Potent Venom', id: 'Bisa Kuat' }, desc: { en: '+{v}% Venom damage. Poison stacks +2.', id: '+{v}% damage Racun. Tumpukan racun +2.' }, maxRank: 5, values: [20, 30, 40, 50, 60], mods: pct('poisonDmg'), effects: () => [{ id: 'poison_stacks', p: [2] }] },
  { id: 've_burst', spirit: 'venom', name: { en: 'Plague Bloom', id: 'Mekar Wabah' }, desc: { en: 'Poisoned enemies burst into a toxic cloud on death ({v}% ATK).', id: 'Musuh teracun meledak jadi awan racun saat mati ({v}% ATK).' }, maxRank: 4, values: [60, 90, 120, 150], effects: (v) => [{ id: 'poison_burst', p: [v] }] },
  { id: 've_cloud', spirit: 'venom', name: { en: 'Miasma', id: 'Miasma' }, desc: { en: 'Every {v2}s release a poison cloud around you ({v}% ATK).', id: 'Tiap {v2} dtk lepaskan awan racun di sekitarmu ({v}% ATK).' }, maxRank: 4, values: [50, 70, 90, 110], values2: [4, 3.5, 3, 2.5], effects: (v, v2) => [{ id: 'venom_cloud', p: [v, v2] }] },
  { id: 've_weaken', spirit: 'venom', name: { en: 'Enfeeble', id: 'Pelemahan' }, desc: { en: '{v}% chance on hit to Weaken (-25% enemy damage).', id: '{v}% peluang saat memukul untuk Melemahkan (-25% damage musuh).' }, maxRank: 4, values: [20, 30, 40, 50], effects: (v) => [{ id: 'weaken_on_hit', p: [v] }] },
  { id: 've_dash', spirit: 'venom', name: { en: 'Noxious Wake', id: 'Jejak Beracun' }, desc: { en: 'Dashing through enemies Poisons them 3 times.', id: 'Dash menembus musuh meracuni mereka 3 kali.' }, maxRank: 1, values: [3], effects: (v) => [{ id: 'venom_dash', p: [v] }] },
  { id: 've_leech', spirit: 'venom', name: { en: 'Leeching Rot', id: 'Busuk Pengisap' }, desc: { en: 'Heal {v}% of poison damage dealt.', id: 'Pulihkan {v}% dari damage racun yang diberikan.' }, maxRank: 4, values: [3, 5, 7, 9], effects: (v) => [{ id: 'poison_leech', p: [v] }] },
  { id: 've_mark', spirit: 'venom', name: { en: 'Death Mark', id: 'Tanda Maut' }, desc: { en: 'Enemies with 4+ poison stacks take +{v}% damage.', id: 'Musuh dengan 4+ tumpukan racun menerima +{v}% damage.' }, maxRank: 4, values: [15, 25, 35, 45], effects: (v) => [{ id: 'poison_mark', p: [v] }] },
  { id: 've_skill', spirit: 'venom', name: { en: 'Venom Rite', id: 'Ritual Bisa' }, desc: { en: 'Skill applies {v} Poison stacks.', id: 'Skill memberi {v} tumpukan Racun.' }, maxRank: 4, values: [2, 3, 4, 5], effects: (v) => [{ id: 'skill_poison', p: [v] }] },
  { id: 've_luck', spirit: 'venom', name: { en: 'Carrion Luck', id: 'Untung Bangkai' }, desc: { en: '+{v} Luck and +{v}% Gold Find.', id: '+{v} Keberuntungan dan +{v}% Temuan Emas.' }, maxRank: 3, values: [10, 18, 26], mods: (v) => [{ stat: 'luck', type: 'flat', value: v }, { stat: 'goldFind', type: 'pct', value: v }] },
  { id: 've_hydra', spirit: 'venom', legendary: true, name: { en: 'Hydra\'s Blood', id: 'Darah Hydra' }, desc: { en: 'Poison can stack infinitely and deals +{v}% damage.', id: 'Racun bertumpuk tanpa batas dan +{v}% damage.' }, maxRank: 1, values: [50], mods: pct('poisonDmg'), effects: () => [{ id: 'poison_stacks', p: [20] }] },

  // ---------------------------------------------------------------- AURORA
  { id: 'au_vital', spirit: 'aurora', name: { en: 'Dawn\'s Vigor', id: 'Semangat Fajar' }, desc: { en: '+{v} Max HP and heal fully.', id: '+{v} HP Maks dan pulih penuh.' }, maxRank: 5, values: [20, 30, 40, 50, 60], mods: flat('maxHp'), effects: () => [{ id: 'instant_heal', p: [100] }] },
  { id: 'au_kill', spirit: 'aurora', name: { en: 'Soul Harvest', id: 'Panen Jiwa' }, desc: { en: 'Heal {v} HP on kill.', id: 'Pulih {v} HP saat membunuh.' }, maxRank: 5, values: [1, 2, 3, 4, 5], mods: flat('healOnKill') },
  { id: 'au_shield', spirit: 'aurora', name: { en: 'Sanctuary', id: 'Suaka' }, desc: { en: 'Start each room with a {v} HP shield.', id: 'Mulai setiap ruangan dengan perisai {v} HP.' }, maxRank: 5, values: [15, 25, 35, 45, 55], mods: flat('shieldOnRoom') },
  { id: 'au_regen', spirit: 'aurora', name: { en: 'Morning Light', id: 'Cahaya Pagi' }, desc: { en: 'Regenerate {v} HP per second.', id: 'Regenerasi {v} HP per detik.' }, maxRank: 4, values: [0.6, 1, 1.4, 1.8], mods: flat('regen') },
  { id: 'au_retaliate', spirit: 'aurora', name: { en: 'Judgement', id: 'Penghakiman' }, desc: { en: 'When hit, release a holy nova for {v}% ATK.', id: 'Saat terkena, lepaskan nova suci {v}% ATK.' }, maxRank: 4, values: [100, 150, 200, 250], effects: (v) => [{ id: 'retaliate', p: [v] }] },
  { id: 'au_smite', spirit: 'aurora', name: { en: 'Smite', id: 'Hantaman Suci' }, desc: { en: 'Every 5th attack smites the target for {v}% ATK.', id: 'Setiap serangan ke-5 menghantam target {v}% ATK.' }, maxRank: 5, values: [120, 170, 220, 270, 320], effects: (v) => [{ id: 'smite', p: [v, 5] }] },
  { id: 'au_potion', spirit: 'aurora', name: { en: 'Blessed Flask', id: 'Ramuan Terberkati' }, desc: { en: '+{v}% Potion power and +1 Flask charge.', id: '+{v}% kekuatan Ramuan dan +1 muatan.' }, maxRank: 3, values: [25, 45, 65], mods: pct('potionPower'), effects: () => [{ id: 'extra_flask', p: [1] }] },
  { id: 'au_holy', spirit: 'aurora', name: { en: 'Radiance', id: 'Pancaran' }, desc: { en: '+{v}% Radiant damage. Attacks deal bonus light damage.', id: '+{v}% damage Cahaya. Serangan memberi damage cahaya tambahan.' }, maxRank: 5, values: [15, 25, 35, 45, 55], mods: pct('holyDmg'), effects: (v) => [{ id: 'holy_bonus', p: [v / 5] }] },
  { id: 'au_dodge', spirit: 'aurora', name: { en: 'Grace', id: 'Rahmat' }, desc: { en: '+{v}% Evasion.', id: '+{v}% Menghindar.' }, maxRank: 4, values: [5, 8, 11, 14], mods: pct('dodge') },
  { id: 'au_boss', spirit: 'aurora', name: { en: 'Dawnbreaker', id: 'Pemecah Fajar' }, desc: { en: '+{v}% damage to bosses and elites.', id: '+{v}% damage ke bos dan elit.' }, maxRank: 4, values: [15, 25, 35, 45], mods: (v) => [{ stat: 'bossDmg', type: 'pct', value: v }, { stat: 'eliteDmg', type: 'pct', value: v }] },
  { id: 'au_orbs', spirit: 'aurora', name: { en: 'Halo', id: 'Lingkaran Cahaya' }, desc: { en: '{v} orbs of light circle you, burning enemies.', id: '{v} bola cahaya mengitarimu, membakar musuh.' }, maxRank: 3, values: [2, 3, 4], effects: (v) => [{ id: 'halo_orbs', p: [v] }] },
  { id: 'au_angel', spirit: 'aurora', legendary: true, name: { en: 'Guardian Angel', id: 'Malaikat Pelindung' }, desc: { en: 'Once per room, a lethal blow leaves you at 1 HP and grants 2s invulnerability.', id: 'Sekali per ruangan, pukulan mematikan menyisakan 1 HP dan memberi kebal 2 dtk.' }, maxRank: 1, values: [1], effects: () => [{ id: 'guardian', p: [1] }] },

  // ---------------------------------------------------------------- UMBRA
  { id: 'um_crit', spirit: 'umbra', name: { en: 'Keen Shadow', id: 'Bayangan Tajam' }, desc: { en: '+{v}% Crit Chance.', id: '+{v}% Peluang Kritis.' }, maxRank: 5, values: [6, 10, 14, 18, 22], mods: pct('critChance') },
  { id: 'um_critdmg', spirit: 'umbra', name: { en: 'Deep Cut', id: 'Luka Dalam' }, desc: { en: '+{v}% Crit Damage.', id: '+{v}% Damage Kritis.' }, maxRank: 5, values: [25, 40, 55, 70, 85], mods: pct('critDmg') },
  { id: 'um_execute', spirit: 'umbra', name: { en: 'Reaper', id: 'Pencabut Nyawa' }, desc: { en: 'Execute non-boss enemies below {v}% HP.', id: 'Eksekusi musuh non-bos di bawah {v}% HP.' }, maxRank: 4, values: [8, 12, 16, 20], mods: pct('executeBelow') },
  { id: 'um_first', spirit: 'umbra', name: { en: 'Ambush', id: 'Sergapan' }, desc: { en: 'Your first hit on each enemy always crits and deals +{v}%.', id: 'Pukulan pertamamu ke setiap musuh selalu kritis dan +{v}%.' }, maxRank: 4, values: [20, 40, 60, 80], effects: (v) => [{ id: 'first_strike', p: [v] }] },
  { id: 'um_life', spirit: 'umbra', name: { en: 'Blood Pact', id: 'Perjanjian Darah' }, desc: { en: '+{v}% Lifesteal.', id: '+{v}% Curi Nyawa.' }, maxRank: 5, values: [2, 3, 4, 5, 6], mods: pct('lifesteal') },
  { id: 'um_bleed', spirit: 'umbra', name: { en: 'Serrated Edge', id: 'Mata Bergerigi' }, desc: { en: 'Attacks have {v}% chance to Bleed.', id: 'Serangan berpeluang {v}% menyebabkan Pendarahan.' }, maxRank: 5, values: [20, 30, 40, 50, 60], mods: pct('bleedChance') },
  { id: 'um_step', spirit: 'umbra', name: { en: 'Shadow Step', id: 'Langkah Bayangan' }, desc: { en: 'Kills have {v}% chance to refund a Dash charge.', id: 'Membunuh berpeluang {v}% mengembalikan muatan Dash.' }, maxRank: 4, values: [25, 40, 55, 70], effects: (v) => [{ id: 'kill_dash', p: [v] }] },
  { id: 'um_blades', spirit: 'umbra', name: { en: 'Umbral Blades', id: 'Pedang Bayangan' }, desc: { en: '{v} shadow blades orbit you, cutting enemies.', id: '{v} pedang bayangan mengitarimu, menyayat musuh.' }, maxRank: 3, values: [2, 3, 4], effects: (v) => [{ id: 'orbit_blades', p: [v] }] },
  { id: 'um_mark', spirit: 'umbra', name: { en: 'Hunter\'s Mark', id: 'Tanda Pemburu' }, desc: { en: 'Crits Mark enemies: +20% damage taken for 5s. +{v}% Shadow damage.', id: 'Kritis menandai musuh: +20% damage diterima 5 dtk. +{v}% damage Bayangan.' }, maxRank: 4, values: [15, 25, 35, 45], mods: pct('shadowDmg'), effects: () => [{ id: 'crit_mark', p: [1] }] },
  { id: 'um_glass', spirit: 'umbra', name: { en: 'Glass Dagger', id: 'Belati Kaca' }, desc: { en: '+{v}% ATK, but -15% Max HP.', id: '+{v}% ATK, tapi -15% HP Maks.' }, maxRank: 3, values: [25, 35, 45], mods: (v) => [{ stat: 'atk', type: 'more', value: v }, { stat: 'maxHp', type: 'more', value: -15 }] },
  { id: 'um_skill', spirit: 'umbra', name: { en: 'Nightfall Rite', id: 'Ritual Senja' }, desc: { en: 'Skill always crits. +{v}% Skill damage.', id: 'Skill selalu kritis. +{v}% damage Skill.' }, maxRank: 4, values: [15, 25, 35, 45], mods: pct('skillDmg'), effects: () => [{ id: 'skill_crit', p: [1] }] },
  { id: 'um_void', spirit: 'umbra', legendary: true, name: { en: 'Void Walker', id: 'Penjelajah Hampa' }, desc: { en: 'Dashing makes your next attack deal +{v}% damage and crit.', id: 'Dash membuat seranganmu berikutnya +{v}% damage dan kritis.' }, maxRank: 1, values: [120], effects: (v) => [{ id: 'dash_empower', p: [v] }] },

  // ---------------------------------------------------------------- DUO
  { id: 'duo_steam', spirit: 'ember', duo: 'rime', name: { en: 'Steam Burst', id: 'Ledakan Uap' }, desc: { en: 'Burning an enemy that is Chilled causes a steam explosion ({v}% ATK).', id: 'Membakar musuh yang Membeku memicu ledakan uap ({v}% ATK).' }, maxRank: 1, values: [180], effects: (v) => [{ id: 'steam_burst', p: [v] }] },
  { id: 'duo_plasma', spirit: 'ember', duo: 'tempest', name: { en: 'Plasma', id: 'Plasma' }, desc: { en: 'Lightning deals +{v}% to Burning enemies.', id: 'Petir memberi +{v}% ke musuh terbakar.' }, maxRank: 1, values: [60], effects: (v) => [{ id: 'plasma', p: [v] }] },
  { id: 'duo_wildfire', spirit: 'ember', duo: 'venom', name: { en: 'Wildfire', id: 'Api Liar' }, desc: { en: 'Poison ticks have {v}% chance to ignite.', id: 'Detak racun berpeluang {v}% menyulut api.' }, maxRank: 1, values: [15], effects: (v) => [{ id: 'wildfire', p: [v] }] },
  { id: 'duo_sunfire', spirit: 'ember', duo: 'aurora', name: { en: 'Sunfire', id: 'Api Surya' }, desc: { en: 'Burn deals Radiant damage and heals you for {v}% of it.', id: 'Bakar memberi damage Cahaya dan memulihkanmu {v}% darinya.' }, maxRank: 1, values: [8], effects: (v) => [{ id: 'sunfire', p: [v] }] },
  { id: 'duo_hellfire', spirit: 'ember', duo: 'umbra', name: { en: 'Hellfire', id: 'Api Neraka' }, desc: { en: 'Crits on Burning enemies deal +{v}% damage.', id: 'Kritis pada musuh terbakar +{v}% damage.' }, maxRank: 1, values: [60], effects: (v) => [{ id: 'hellfire', p: [v] }] },
  { id: 'duo_blizzard', spirit: 'rime', duo: 'tempest', name: { en: 'Blizzard', id: 'Badai Salju' }, desc: { en: 'Every 2s hail strikes 3 enemies for {v}% ATK and Chills.', id: 'Tiap 2 dtk hujan es menghantam 3 musuh {v}% ATK dan Membekukan.' }, maxRank: 1, values: [80], effects: (v) => [{ id: 'blizzard', p: [v] }] },
  { id: 'duo_frostbite', spirit: 'rime', duo: 'venom', name: { en: 'Black Frost', id: 'Embun Hitam' }, desc: { en: 'Poison deals double damage to Chilled enemies.', id: 'Racun memberi damage ganda ke musuh yang Membeku.' }, maxRank: 1, values: [100], effects: (v) => [{ id: 'black_frost', p: [v] }] },
  { id: 'duo_aegis', spirit: 'rime', duo: 'aurora', name: { en: 'Crystal Aegis', id: 'Perisai Kristal' }, desc: { en: 'Freezing an enemy grants a {v} HP shield.', id: 'Membekukan musuh memberi perisai {v} HP.' }, maxRank: 1, values: [6], effects: (v) => [{ id: 'freeze_shield', p: [v] }] },
  { id: 'duo_blackice', spirit: 'rime', duo: 'umbra', name: { en: 'Black Ice', id: 'Es Hitam' }, desc: { en: '+{v}% Crit Chance against Chilled or Frozen enemies.', id: '+{v}% Peluang Kritis ke musuh yang Membeku.' }, maxRank: 1, values: [30], effects: (v) => [{ id: 'black_ice', p: [v] }] },
  { id: 'duo_toxicstorm', spirit: 'tempest', duo: 'venom', name: { en: 'Acid Rain', id: 'Hujan Asam' }, desc: { en: 'Lightning applies {v} Poison stacks.', id: 'Petir memberi {v} tumpukan Racun.' }, maxRank: 1, values: [2], effects: (v) => [{ id: 'acid_rain', p: [v] }] },
  { id: 'duo_divine', spirit: 'tempest', duo: 'aurora', name: { en: 'Divine Storm', id: 'Badai Ilahi' }, desc: { en: 'Each lightning strike heals you {v} HP.', id: 'Setiap sambaran petir memulihkanmu {v} HP.' }, maxRank: 1, values: [1], effects: (v) => [{ id: 'divine_storm', p: [v] }] },
  { id: 'duo_thunderblade', spirit: 'tempest', duo: 'umbra', name: { en: 'Thunder Assassin', id: 'Pembunuh Guntur' }, desc: { en: 'Crits chain lightning for {v}% ATK.', id: 'Kritis memicu rantai petir {v}% ATK.' }, maxRank: 1, values: [80], effects: (v) => [{ id: 'crit_chain', p: [v] }] },
  { id: 'duo_purify', spirit: 'venom', duo: 'aurora', name: { en: 'Purifying Rot', id: 'Busuk Penyuci' }, desc: { en: 'Killing a poisoned enemy heals {v} HP.', id: 'Membunuh musuh teracun memulihkan {v} HP.' }, maxRank: 1, values: [3], effects: (v) => [{ id: 'poison_kill_heal', p: [v] }] },
  { id: 'duo_deathbloom', spirit: 'venom', duo: 'umbra', name: { en: 'Deathbloom', id: 'Mekar Maut' }, desc: { en: 'Execute threshold +{v}% against poisoned enemies.', id: 'Ambang eksekusi +{v}% ke musuh teracun.' }, maxRank: 1, values: [10], effects: (v) => [{ id: 'deathbloom', p: [v] }] },
  { id: 'duo_twilight', spirit: 'aurora', duo: 'umbra', name: { en: 'Twilight', id: 'Senjakala' }, desc: { en: '+{v}% damage while above 50% HP, +{v}% Lifesteal below.', id: '+{v}% damage saat HP di atas 50%, +{v}% Curi Nyawa di bawahnya.' }, maxRank: 1, values: [20], effects: (v) => [{ id: 'twilight', p: [v] }] },
];

export function boonDef(id: string): BoonDef | undefined {
  return BOONS.find((b) => b.id === id);
}

export function boonValue(b: BoonDef, rank: number): { v: number; v2: number } {
  const r = Math.max(1, Math.min(b.maxRank, rank)) - 1;
  return { v: b.values[Math.min(r, b.values.length - 1)], v2: b.values2 ? b.values2[Math.min(r, b.values2.length - 1)] : 0 };
}
