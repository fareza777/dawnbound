import type { L10n } from '@/core/i18n';
import type { Mod } from './stats';

export interface MaterialDef {
  id: string;
  name: L10n;
  desc: L10n;
  tier: number;
  kind: 'monster' | 'ore' | 'herb' | 'essence' | 'trophy' | 'seed' | 'quest';
  icon: string;
  /** Gold value when sold to Pip. */
  value: number;
}

function mat(id: string, kind: MaterialDef['kind'], tier: number, en: string, idn: string, dEn: string, dId: string, value = 5 * tier): MaterialDef {
  return { id, kind, tier, name: { en, id: idn }, desc: { en: dEn, id: dId }, icon: `icons_mat_${id}`, value };
}

export const MATERIALS: MaterialDef[] = [
  // Monster parts
  mat('slime_gel', 'monster', 1, 'Slime Gel', 'Gel Lendir', 'Wobbly. Alchemists love it.', 'Bergoyang. Ahli ramuan menyukainya.'),
  mat('mushroom_cap', 'monster', 1, 'Sporecap', 'Topi Spora', 'Handle with gloves.', 'Pegang dengan sarung tangan.'),
  mat('wasp_stinger', 'monster', 1, 'Wasp Stinger', 'Sengat Tawon', 'Still twitching.', 'Masih berkedut.'),
  mat('bone_dust', 'monster', 2, 'Bone Dust', 'Debu Tulang', 'What remains of the restless.', 'Sisa dari mereka yang gelisah.'),
  mat('ectoplasm', 'monster', 2, 'Ectoplasm', 'Ektoplasma', 'Cold, sticky, faintly sad.', 'Dingin, lengket, samar-samar sedih.'),
  mat('grave_moss', 'monster', 2, 'Grave Moss', 'Lumut Kubur', 'Grows only where tears fell.', 'Tumbuh hanya di tempat air mata jatuh.'),
  mat('chitin', 'monster', 3, 'Scorpion Chitin', 'Kitin Kalajengking', 'Harder than bronze.', 'Lebih keras dari perunggu.'),
  mat('sand_pearl', 'monster', 3, 'Sand Pearl', 'Mutiara Pasir', 'Heat-fused glass. Pretty.', 'Kaca lebur panas. Cantik.'),
  mat('ancient_linen', 'monster', 3, 'Ancient Linen', 'Linen Kuno', 'Smells of myrrh and old kings.', 'Berbau mur dan raja-raja tua.'),
  mat('frost_crystal', 'monster', 4, 'Frost Crystal', 'Kristal Beku', 'Never melts.', 'Tak pernah mencair.'),
  mat('wraith_silk', 'monster', 4, 'Wraith Silk', 'Sutra Hantu', 'Woven from sighs.', 'Ditenun dari desahan.'),
  mat('magma_core', 'monster', 5, 'Magma Core', 'Inti Magma', 'Hot enough to forge anything.', 'Cukup panas untuk menempa apa pun.'),
  mat('void_essence', 'essence', 5, 'Void Essence', 'Esensi Hampa', 'A drop of nothing.', 'Setetes ketiadaan.'),
  // Ores / salvage
  mat('iron_ore', 'ore', 1, 'Iron Scrap', 'Rongsokan Besi', 'Salvaged from common gear.', 'Diurai dari perlengkapan biasa.', 3),
  mat('arcane_dust', 'ore', 2, 'Arcane Dust', 'Debu Arkana', 'Salvaged from magic gear.', 'Diurai dari perlengkapan sihir.', 8),
  mat('rare_shard', 'ore', 3, 'Prism Shard', 'Serpih Prisma', 'Salvaged from rare gear.', 'Diurai dari perlengkapan langka.', 20),
  mat('epic_core', 'ore', 4, 'Star Core', 'Inti Bintang', 'Salvaged from epic gear.', 'Diurai dari perlengkapan epik.', 50),
  mat('legend_ash', 'ore', 5, 'Legend Ash', 'Abu Legenda', 'Salvaged from legendary gear.', 'Diurai dari perlengkapan legendaris.', 120),
  mat('moonsteel', 'ore', 4, 'Moonsteel Ingot', 'Batangan Baja Bulan', 'Silver under moonlight, blue under stars.', 'Perak di bawah bulan, biru di bawah bintang.', 40),
  mat('dawn_shard', 'ore', 5, 'Dawn Shard', 'Serpih Fajar', 'A fragment of the Dawnstone\'s light.', 'Pecahan cahaya Batu Fajar.', 100),
  // Herbs
  mat('moonpetal', 'herb', 1, 'Moonpetal', 'Kelopak Bulan', 'Blooms only at night. Which is always, now.', 'Mekar hanya di malam hari. Yang kini selalu.'),
  mat('sunroot', 'herb', 2, 'Sunroot', 'Akar Surya', 'Warm, even in the dark.', 'Hangat, bahkan dalam gelap.'),
  mat('ghostcap', 'herb', 3, 'Ghostcap', 'Topi Hantu', 'Translucent mushroom. Do not eat raw.', 'Jamur tembus pandang. Jangan dimakan mentah.'),
  mat('frostleaf', 'herb', 4, 'Frostleaf', 'Daun Beku', 'Crunches like snow.', 'Berderak seperti salju.'),
  mat('emberbloom', 'herb', 5, 'Emberbloom', 'Bunga Bara', 'A flower that burns without being consumed.', 'Bunga yang terbakar tanpa habis.'),
  // Boss trophies
  mat('trophy_gorehorn', 'trophy', 3, 'Gorehorn\'s Horn', 'Tanduk Gorehorn', 'Proof you broke the Warden.', 'Bukti kau mengalahkan sang Penjaga.', 150),
  mat('trophy_lamia', 'trophy', 3, 'Twin Scale', 'Sisik Kembar', 'Two scales that never stop touching.', 'Dua sisik yang tak pernah berhenti bersentuhan.', 200),
  mat('trophy_azhar', 'trophy', 4, 'Empty Lamp', 'Lampu Kosong', 'The djinn is free. Is that good?', 'Sang jin bebas. Apakah itu baik?', 260),
  mat('trophy_vesper', 'trophy', 4, 'Thawed Heart', 'Hati yang Mencair', 'Still cold at the center.', 'Masih dingin di tengahnya.', 320),
  mat('trophy_malachar', 'trophy', 5, 'Hollow Crown Shard', 'Serpih Mahkota Hampa', 'The end of the Long Night.', 'Akhir dari Malam Panjang.', 500),
  // Seeds (for Mira's garden)
  mat('seed_moonpetal', 'seed', 1, 'Moonpetal Seed', 'Benih Kelopak Bulan', 'Plant in the garden. Harvest after 1 run.', 'Tanam di kebun. Panen setelah 1 run.', 4),
  mat('seed_sunroot', 'seed', 2, 'Sunroot Seed', 'Benih Akar Surya', 'Harvest after 2 runs.', 'Panen setelah 2 run.', 8),
  mat('seed_ghostcap', 'seed', 3, 'Ghostcap Spore', 'Spora Topi Hantu', 'Harvest after 2 runs.', 'Panen setelah 2 run.', 12),
  mat('seed_frostleaf', 'seed', 4, 'Frostleaf Seed', 'Benih Daun Beku', 'Harvest after 3 runs.', 'Panen setelah 3 run.', 16),
  mat('seed_emberbloom', 'seed', 5, 'Emberbloom Seed', 'Benih Bunga Bara', 'Harvest after 3 runs.', 'Panen setelah 3 run.', 25),
  mat('seed_golden', 'seed', 5, 'Golden Apple Seed', 'Benih Apel Emas', 'Legends say it grows embers.', 'Legenda berkata ia menumbuhkan bara.', 60),
  // Quest items
  mat('q_brom_hammer', 'quest', 2, 'Brom\'s Heirloom Hammer', 'Palu Pusaka Brom', 'Lost in the Sunken Crypt.', 'Hilang di Kripta Tenggelam.', 0),
  mat('q_cat_bell', 'quest', 1, 'Tiny Cat Bell', 'Lonceng Kucing Kecil', 'Belongs to Wren\'s cat, Biscuit.', 'Milik kucing Wren, Biscuit.', 0),
  mat('q_song_sheet', 'quest', 1, 'Song Sheet', 'Lembar Lagu', 'Finn\'s lost music.', 'Musik Finn yang hilang.', 0),
  mat('q_letter', 'quest', 1, 'Faded Letter', 'Surat Pudar', 'A letter from the old Lanternkeepers.', 'Surat dari para Penjaga Lentera lama.', 0),
  mat('q_recipe', 'quest', 2, 'Lost Recipe Page', 'Halaman Resep Hilang', 'Ysolde\'s grandmother\'s handwriting.', 'Tulisan tangan nenek Ysolde.', 0),
];

export const SEED_GROWTH: Record<string, { runs: number; yields: [string, number][]; bonus?: string }> = {
  seed_moonpetal: { runs: 1, yields: [['moonpetal', 3]] },
  seed_sunroot: { runs: 2, yields: [['sunroot', 3]] },
  seed_ghostcap: { runs: 2, yields: [['ghostcap', 3]] },
  seed_frostleaf: { runs: 3, yields: [['frostleaf', 3]] },
  seed_emberbloom: { runs: 3, yields: [['emberbloom', 3]] },
  seed_golden: { runs: 3, yields: [['dawn_shard', 1]], bonus: 'embers' },
};

export const SEED_PLANT: Record<string, number> = {
  seed_moonpetal: 2, seed_sunroot: 3, seed_ghostcap: 4, seed_frostleaf: 5, seed_emberbloom: 6, seed_golden: 7,
};

export function materialDef(id: string): MaterialDef | undefined {
  return MATERIALS.find((x) => x.id === id);
}

export interface ElixirDef {
  id: string;
  name: L10n;
  desc: L10n;
  cost: [string, number][];
  gold: number;
  mods: Mod[];
  unlockDepth: number;
  icon: string;
}

export const ELIXIRS: ElixirDef[] = [
  { id: 'el_might', name: { en: 'Elixir of Might', id: 'Eliksir Kekuatan' }, desc: { en: '+15% ATK for the next run.', id: '+15% ATK untuk run berikutnya.' }, cost: [['slime_gel', 3], ['moonpetal', 1]], gold: 60, mods: [{ stat: 'atk', type: 'pct', value: 15 }], unlockDepth: 0, icon: 'icons_elixir_red' },
  { id: 'el_vigor', name: { en: 'Elixir of Vigor', id: 'Eliksir Stamina' }, desc: { en: '+40 Max HP for the next run.', id: '+40 HP Maks untuk run berikutnya.' }, cost: [['mushroom_cap', 3], ['moonpetal', 1]], gold: 60, mods: [{ stat: 'maxHp', type: 'flat', value: 40 }], unlockDepth: 0, icon: 'icons_elixir_green' },
  { id: 'el_swift', name: { en: 'Elixir of Swiftness', id: 'Eliksir Kelincahan' }, desc: { en: '+12% Move and Attack speed.', id: '+12% Kecepatan Gerak dan Serang.' }, cost: [['wasp_stinger', 3], ['sunroot', 1]], gold: 90, mods: [{ stat: 'moveSpeed', type: 'pct', value: 12 }, { stat: 'atkSpeed', type: 'pct', value: 12 }], unlockDepth: 1, icon: 'icons_elixir_yellow' },
  { id: 'el_fortune', name: { en: 'Elixir of Fortune', id: 'Eliksir Keberuntungan' }, desc: { en: '+50% Gold and Magic Find.', id: '+50% Temuan Emas dan Sihir.' }, cost: [['sand_pearl', 2], ['sunroot', 1]], gold: 120, mods: [{ stat: 'goldFind', type: 'pct', value: 50 }, { stat: 'magicFind', type: 'pct', value: 50 }], unlockDepth: 2, icon: 'icons_elixir_gold' },
  { id: 'el_ghost', name: { en: 'Elixir of the Veil', id: 'Eliksir Selubung' }, desc: { en: '+12% Evasion and +1 Dash.', id: '+12% Menghindar dan +1 Dash.' }, cost: [['ectoplasm', 3], ['ghostcap', 1]], gold: 140, mods: [{ stat: 'dodge', type: 'pct', value: 12 }, { stat: 'dashCharges', type: 'flat', value: 1 }], unlockDepth: 2, icon: 'icons_elixir_purple' },
  { id: 'el_frost', name: { en: 'Elixir of Winter', id: 'Eliksir Musim Dingin' }, desc: { en: '+15% Damage Reduction.', id: '+15% Reduksi Damage.' }, cost: [['frost_crystal', 2], ['frostleaf', 1]], gold: 180, mods: [{ stat: 'dmgReduction', type: 'pct', value: 15 }], unlockDepth: 3, icon: 'icons_elixir_blue' },
  { id: 'el_dawn', name: { en: 'Elixir of Dawn', id: 'Eliksir Fajar' }, desc: { en: '+20% all damage and +2 HP/s regen.', id: '+20% semua damage dan +2 regen HP/dtk.' }, cost: [['magma_core', 2], ['emberbloom', 1]], gold: 260, mods: [{ stat: 'atk', type: 'more', value: 20 }, { stat: 'regen', type: 'flat', value: 2 }], unlockDepth: 4, icon: 'icons_elixir_orange' },
];
