import type { L10n } from '@/core/i18n';
import type { SaveData } from './types';
import type { Conversation } from './dialogues';

const L = (en: string, id: string): L10n => ({ en, id });
const claimed = (s: SaveData, q: string) => s.quests[q]?.status === 'claimed';
const seen = (s: SaveData, region: string) => !!s.flags[`region_${region}`];

/** Expansion conversations: reactions to the new regions and to the new story reveals. */
export const CONVERSATIONS_EXPANSION: Conversation[] = [
  {
    id: 'c_maren_regions', npc: 'maren', priority: 70, cond: (s) => seen(s, 'drowned') || seen(s, 'forge') || seen(s, 'crystal'),
    lines: [
      { who: 'rowan', text: L('Maren, the Depths changed. The path I took yesterday led somewhere else today.', 'Maren, Kedalaman berubah. Jalan yang kulewati kemarin hari ini menuju tempat lain.') },
      { who: 'maren', text: L('The Embers you freed are waking old places — halls the Long Night buried. Each descent may open a different one.', 'Bara yang kau bebaskan membangunkan tempat-tempat lama — aula-aula yang dikubur Malam Panjang. Setiap penurunan bisa membuka yang berbeda.') },
      { who: 'maren', text: L('Different roads, same destination. The guardians still wait at the bottom of each Depth.', 'Jalan berbeda, tujuan sama. Para penjaga tetap menunggu di dasar setiap Kedalaman.') },
    ],
  },
  {
    id: 'c_ysolde_drowned', npc: 'ysolde', priority: 40, cond: (s) => seen(s, 'drowned'),
    lines: [
      { who: 'ysolde', text: L('You smell like a canal. The Drowned Catacombs? Bring me moss from down there — it grows nowhere else like that.', 'Kau bau seperti selokan. Katakomba Tenggelam? Bawakan aku lumut dari sana — tak ada tempat lain yang menumbuhkannya seperti itu.') },
      { who: 'rowan', text: L('The water tried to freeze my legs off.', 'Airnya berusaha membekukan kakiku sampai putus.') },
      { who: 'ysolde', text: L('Then drink something warm before you go back. That is a professional prescription.', 'Kalau begitu minum yang hangat sebelum kembali. Itu resep profesional.') },
    ],
  },
  {
    id: 'c_brom_forge_caverns', npc: 'brom', priority: 40, cond: (s) => seen(s, 'forge'),
    lines: [
      { who: 'brom', text: L('The Emberforge Caverns? My grandad told stories about those. Forges that never went cold, golems that guarded them.', 'Gua Tempa Bara? Kakekku sering bercerita tentang itu. Tungku yang tak pernah dingin, golem yang menjaganya.') },
      { who: 'brom', text: L('If you see a golem, hit it where the plates meet. Stone is proud, but it is never seamless.', 'Kalau kau bertemu golem, pukul di sambungan pelatnya. Batu itu angkuh, tapi tak pernah tanpa celah.') },
    ],
  },
  {
    id: 'c_liora_crystal', npc: 'liora', priority: 40, cond: (s) => seen(s, 'crystal'),
    lines: [
      { who: 'liora', text: L('You carry starlight on your cloak. The Crystal Hollows?', 'Kau membawa cahaya bintang di jubahmu. Lembah Kristal?') },
      { who: 'liora', text: L('The old texts say the stars sleep there when the sky is too dark to hold them. Tread softly — sleeping things dream.', 'Naskah lama mengatakan bintang-bintang tidur di sana saat langit terlalu gelap untuk menampungnya. Melangkahlah perlahan — yang tertidur itu bermimpi.') },
    ],
  },
  {
    id: 'c_maren_journal', npc: 'maren', priority: 75, cond: (s) => claimed(s, 'mq_journal'),
    lines: [
      { who: 'maren', text: L('Tobin tells me you found my journal. I was so young when I wrote those pages.', 'Tobin bilang kau menemukan jurnalku. Aku masih sangat muda saat menulis halaman-halaman itu.') },
      { who: 'rowan', text: L('You wrote about Malachar like he was your son.', 'Kau menulis tentang Malachar seolah ia putramu.') },
      { who: 'maren', text: L('He was, in every way that mattered. That is why this is so hard, Rowan. Every Ember you take brings you closer to him.', 'Memang begitu, dalam segala hal yang berarti. Itulah sebabnya ini begitu berat, Rowan. Setiap Bara yang kau ambil membawamu lebih dekat padanya.') },
    ],
  },
  {
    id: 'c_maren_letter', npc: 'maren', priority: 75, cond: (s) => claimed(s, 'mq_frozen_letter'),
    lines: [
      { who: 'maren', text: L('Vesper\'s letter... She was always braver than both of them. Braver than me.', 'Surat Vesper... Ia selalu lebih berani daripada mereka berdua. Lebih berani daripadaku.') },
      { who: 'rowan', text: L('She asked me to read it to him.', 'Ia memintaku membacakannya untuknya.') },
      { who: 'maren', text: L('Then do. If there is any of my boy left in that crown, he will hear her.', 'Kalau begitu lakukanlah. Jika masih ada sisa putraku di balik mahkota itu, ia akan mendengarnya.') },
    ],
  },
  {
    id: 'c_maren_nyx', npc: 'maren', priority: 72, cond: (s) => claimed(s, 'sq_nyx_mask'),
    lines: [
      { who: 'maren', text: L('Nyx. So the rumors were true... my third student never left the village at all.', 'Nyx. Jadi rumor itu benar... murid ketigaku tak pernah benar-benar meninggalkan desa.') },
      { who: 'maren', text: L('Tell them I never blamed them for running. Someone had to live long enough to remember.', 'Katakan padanya aku tak pernah menyalahkannya karena lari. Seseorang harus hidup cukup lama untuk mengingat.') },
    ],
  },
  {
    id: 'c_dorran_veteran', npc: 'dorran', priority: 30, cond: (s) => (s.stats.runs ?? 0) >= 10,
    lines: [
      { who: 'dorran', text: L('Ten descents. Most of my recruits did not survive their first.', 'Sepuluh kali turun. Kebanyakan rekrutanku tak selamat di penurunan pertama.') },
      { who: 'rowan', text: L('I did not survive most of mine either.', 'Aku juga tidak selamat di sebagian besar penurunanku.') },
      { who: 'dorran', text: L('Ha! And yet here you stand. That is the only kind of survival that counts.', 'Ha! Tapi kau tetap berdiri di sini. Hanya itu satu-satunya keselamatan yang dihitung.') },
    ],
  },
  {
    id: 'c_pip_regions', npc: 'pip', priority: 35, cond: (s) => seen(s, 'forge') && seen(s, 'crystal'),
    lines: [
      { who: 'pip', text: L('Lava caves AND crystal caves? You know what that means? New stock! Magma cores, geode dust — collectors pay a fortune.', 'Gua lava DAN gua kristal? Kau tahu artinya? Barang dagangan baru! Inti magma, debu geode — kolektor rela membayar mahal.') },
      { who: 'rowan', text: L('You could go down there yourself.', 'Kau bisa turun sendiri ke sana.') },
      { who: 'pip', text: L('And risk this face? The village needs it. For morale.', 'Dan mempertaruhkan wajah ini? Desa membutuhkannya. Demi semangat.') },
    ],
  },
];
