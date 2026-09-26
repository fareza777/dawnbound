import type { L10n } from '@/core/i18n';
import type { SaveData } from './types';

export interface AchievementDef {
  id: string;
  name: L10n;
  desc: L10n;
  embers: number;
  /** Checked against the save after relevant events. */
  check: (s: SaveData) => boolean;
}

const L = (en: string, id: string): L10n => ({ en, id });
const st = (s: SaveData, k: string) => s.stats[k] ?? 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_first_run', name: L('First Descent', 'Penurunan Pertama'), desc: L('Start your first run.', 'Mulai run pertamamu.'), embers: 10, check: (s) => st(s, 'runs') >= 1 },
  { id: 'a_first_death', name: L('Wake at Dawn', 'Bangun Saat Fajar'), desc: L('Die for the first time.', 'Mati untuk pertama kalinya.'), embers: 10, check: (s) => st(s, 'deaths') >= 1 },
  { id: 'a_kills_100', name: L('Slayer', 'Pembantai'), desc: L('Defeat 100 enemies.', 'Kalahkan 100 musuh.'), embers: 30, check: (s) => st(s, 'kills') >= 100 },
  { id: 'a_kills_1000', name: L('Legend of the Rift', 'Legenda Celah'), desc: L('Defeat 1,000 enemies.', 'Kalahkan 1.000 musuh.'), embers: 150, check: (s) => st(s, 'kills') >= 1000 },
  { id: 'a_gorehorn', name: L('Hornbreaker', 'Pematah Tanduk'), desc: L('Defeat Gorehorn.', 'Kalahkan Gorehorn.'), embers: 50, check: (s) => s.unlocks.bossesDefeated.includes('gorehorn') },
  { id: 'a_twins', name: L('Silence the Song', 'Bungkam Lagunya'), desc: L('Defeat the Twin Sisters.', 'Kalahkan Saudari Kembar.'), embers: 70, check: (s) => s.unlocks.bossesDefeated.includes('twin_lamias') },
  { id: 'a_azhar', name: L('Wish Granted', 'Permintaan Terkabul'), desc: L('Defeat Azhar.', 'Kalahkan Azhar.'), embers: 90, check: (s) => s.unlocks.bossesDefeated.includes('azhar') },
  { id: 'a_vesper', name: L('Thaw', 'Mencair'), desc: L('Defeat Vesper.', 'Kalahkan Vesper.'), embers: 110, check: (s) => s.unlocks.bossesDefeated.includes('vesper') },
  { id: 'a_malachar', name: L('Dawnbringer', 'Pembawa Fajar'), desc: L('Defeat the Hollow King.', 'Kalahkan Raja Hampa.'), embers: 200, check: (s) => s.unlocks.bossesDefeated.includes('malachar') },
  { id: 'a_win_3', name: L('Tireless', 'Tak Kenal Lelah'), desc: L('Win 3 runs.', 'Menangkan 3 run.'), embers: 150, check: (s) => st(s, 'wins') >= 3 },
  { id: 'a_legendary', name: L('Legendary!', 'Legendaris!'), desc: L('Find a legendary item.', 'Temukan item legendaris.'), embers: 40, check: (s) => s.inventory.some((i) => i.rarity >= 4) },
  { id: 'a_mythic', name: L('Myth Made Real', 'Mitos Menjadi Nyata'), desc: L('Find a mythic item.', 'Temukan item mitos.'), embers: 120, check: (s) => s.inventory.some((i) => i.rarity >= 5) },
  { id: 'a_plus10', name: L('Master Smith', 'Pandai Besi Ulung'), desc: L('Upgrade an item to +10.', 'Tingkatkan item hingga +10.'), embers: 60, check: (s) => s.inventory.some((i) => i.plus >= 10) },
  { id: 'a_full_set', name: L('Matching Outfit', 'Pakaian Serasi'), desc: L('Equip 4 pieces of one set.', 'Pakai 4 bagian dari satu set.'), embers: 60, check: (s) => {
    const c = new Map<string, number>();
    for (const uid of Object.values(s.equipped)) {
      const it = s.inventory.find((i) => i.uid === uid);
      if (it?.setId) c.set(it.setId, (c.get(it.setId) ?? 0) + 1);
    }
    return [...c.values()].some((n) => n >= 4);
  } },
  { id: 'a_boons_30', name: L('Spirit Friend', 'Sahabat Roh'), desc: L('Discover 30 Boons.', 'Temukan 30 Anugerah.'), embers: 50, check: (s) => s.codex.boons.length >= 30 },
  { id: 'a_relics_30', name: L('Collector', 'Kolektor'), desc: L('Discover 30 Relics.', 'Temukan 30 Relik.'), embers: 50, check: (s) => s.codex.relics.length >= 30 },
  { id: 'a_events_15', name: L('Storyteller', 'Pendongeng'), desc: L('Witness 15 different encounters.', 'Saksikan 15 pertemuan berbeda.'), embers: 50, check: (s) => s.codex.events.length >= 15 },
  { id: 'a_talents_10', name: L('Lantern Scholar', 'Cendekia Lentera'), desc: L('Buy 10 talent ranks.', 'Beli 10 peringkat bakat.'), embers: 40, check: (s) => Object.values(s.talents).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'a_harvest', name: L('Green Thumb', 'Tangan Dingin'), desc: L('Harvest a crop in Mira\'s garden.', 'Panen tanaman di kebun Mira.'), embers: 20, check: (s) => st(s, 'harvests') >= 1 },
  { id: 'a_heroes', name: L('Fellowship', 'Persekutuan'), desc: L('Unlock all four heroes.', 'Buka keempat pahlawan.'), embers: 100, check: (s) => s.unlocks.heroes.length >= 4 },
  { id: 'a_shards', name: L('Memories of Maren', 'Kenangan Maren'), desc: L('Collect 10 Memory Shards.', 'Kumpulkan 10 Serpihan Memori.'), embers: 100, check: (s) => s.currency.shards >= 10 },
  { id: 'a_vow5', name: L('Night Sworn', 'Bersumpah pada Malam'), desc: L('Win with 5 or more Heat.', 'Menang dengan Heat 5 atau lebih.'), embers: 200, check: (s) => (s.flags.heatWin ?? 0) >= 5 },
  { id: 'a_daily', name: L('Daily Devotion', 'Pengabdian Harian'), desc: L('Complete a Daily Run.', 'Selesaikan Run Harian.'), embers: 30, check: (s) => s.daily.best > 0 },
  { id: 'a_quests_10', name: L('Village Hero', 'Pahlawan Desa'), desc: L('Complete 10 quests.', 'Selesaikan 10 misi.'), embers: 80, check: (s) => Object.values(s.quests).filter((q) => q.status === 'claimed').length >= 10 },
];
