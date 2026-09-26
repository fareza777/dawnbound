import type { L10n } from '@/core/i18n';
import type { SaveData } from './types';
import { CONVERSATIONS_EXPANSION } from './dialogues2';

export interface Line {
  who: string;
  text: L10n;
}

export interface Conversation {
  id: string;
  npc: string;
  /** Higher plays first. */
  priority: number;
  cond: (s: SaveData) => boolean;
  lines: Line[];
}

const L = (en: string, id: string): L10n => ({ en, id });
const claimed = (s: SaveData, q: string) => s.quests[q]?.status === 'claimed';
const boss = (s: SaveData, b: string) => s.unlocks.bossesDefeated.includes(b);
const runs = (s: SaveData) => s.stats.runs ?? 0;

/** Story conversations — each plays once, in priority order, when its condition is met. */
const BASE_CONVERSATIONS: Conversation[] = [
  {
    id: 'c_maren_wake', npc: 'maren', priority: 100, cond: () => true,
    lines: [
      { who: 'maren', text: L('Rowan. Rowan, wake up. There — the flame took hold.', 'Rowan. Rowan, bangun. Nah — nyalanya sudah menyatu.') },
      { who: 'rowan', text: L('Elder Maren? You\'re... glowing. And see-through.', 'Tetua Maren? Kau... bercahaya. Dan tembus pandang.') },
      { who: 'maren', text: L('I gave my life to the Lantern, child. What remains of me lives in its light — and now, so does part of you.', 'Aku memberikan hidupku pada Lentera, nak. Yang tersisa dariku hidup dalam cahayanya — dan kini, sebagian dirimu juga.') },
      { who: 'maren', text: L('Every time you fall in the Depths, you will wake here, at dawn. It will hurt. It will not stop you.', 'Setiap kali kau gugur di Kedalaman, kau akan terbangun di sini, saat fajar. Itu akan menyakitkan. Tapi tak akan menghentikanmu.') },
      { who: 'rowan', text: L('Then I\'ll go down there and bring back the Embers. All five.', 'Kalau begitu aku akan turun dan membawa kembali para Bara. Kelimanya.') },
      { who: 'maren', text: L('Brave. Foolish. Exactly like I was. First, find Captain Dorran at the training yard.', 'Berani. Bodoh. Persis sepertiku dulu. Pertama, temui Kapten Dorran di lapangan latihan.') },
    ],
  },
  {
    id: 'c_dorran_intro', npc: 'dorran', priority: 90, cond: (s) => claimed(s, 'mq_awaken'),
    lines: [
      { who: 'dorran', text: L('So Maren\'s last spark picked the apprentice who can\'t hold a sword straight.', 'Jadi percikan terakhir Maren memilih murid yang tak bisa memegang pedang dengan lurus.') },
      { who: 'rowan', text: L('I can hold it straight. Mostly.', 'Aku bisa memegangnya lurus. Kebanyakan.') },
      { who: 'dorran', text: L('Prove it. See the dummy? Hit it ten times. Hold ATTACK and keep your feet moving. Tap DASH to roll — you\'re untouchable mid-roll.', 'Buktikan. Lihat boneka itu? Pukul sepuluh kali. Tahan SERANG dan terus gerakkan kakimu. Ketuk DASH untuk berguling — kau tak tersentuh saat berguling.') },
    ],
  },
  {
    id: 'c_maren_after_first_death', npc: 'maren', priority: 80, cond: (s) => (s.stats.deaths ?? 0) >= 1,
    lines: [
      { who: 'rowan', text: L('I... died. I felt it. And then I was here.', 'Aku... mati. Aku merasakannya. Lalu aku ada di sini.') },
      { who: 'maren', text: L('Yes. The Lantern remembers you even when you forget yourself. Rest a moment. Then go again — a little wiser.', 'Ya. Lentera mengingatmu bahkan saat kau lupa dirimu sendiri. Istirahatlah sejenak. Lalu pergi lagi — sedikit lebih bijak.') },
      { who: 'maren', text: L('The embers you carried back can feed the Lantern Tree. Every branch you grow stays with you.', 'Bara yang kau bawa pulang bisa memberi makan Pohon Lentera. Setiap cabang yang kau tumbuhkan akan tetap bersamamu.') },
    ],
  },
  {
    id: 'c_maren_gorehorn', npc: 'maren', priority: 85, cond: (s) => boss(s, 'gorehorn'),
    lines: [
      { who: 'rowan', text: L('Gorehorn fell. He said the Ember "was never his to keep."', 'Gorehorn tumbang. Dia bilang Bara itu "memang bukan miliknya."') },
      { who: 'maren', text: L('He was a gentle beast once. The Embers twist whoever holds them without love. Remember that.', 'Dulu dia makhluk yang lembut. Para Bara memutarbalikkan siapa pun yang memegangnya tanpa cinta. Ingat itu.') },
      { who: 'sera', text: L('So you\'re the keeper everyone\'s whispering about. I held the North Gate. I can hold a line beside you.', 'Jadi kau penjaga yang dibisikkan semua orang. Aku menahan Gerbang Utara. Aku bisa menahan barisan di sisimu.') },
    ],
  },
  {
    id: 'c_maren_twins', npc: 'maren', priority: 84, cond: (s) => boss(s, 'twin_lamias'),
    lines: [
      { who: 'maren', text: L('The Ember of Memory shows me a boy with ink on his fingers, afraid of every sunset.', 'Bara Ingatan memperlihatkan padaku seorang anak dengan tinta di jarinya, takut pada setiap senja.') },
      { who: 'rowan', text: L('Malachar?', 'Malachar?') },
      { who: 'maren', text: L('...Yes. My first apprentice. I will tell you more when I am ready. Go now — the Dunes are waiting.', '...Ya. Murid pertamaku. Akan kuceritakan lebih banyak saat aku siap. Pergilah — Bukit Pasir menunggu.') },
      { who: 'elio', text: L('Excuse me! I read about the Embers in a book I definitely did not steal. The stars told me to help. Also Tobin said so.', 'Permisi! Aku membaca tentang para Bara di buku yang jelas tidak kucuri. Bintang-bintang menyuruhku membantu. Tobin juga.') },
    ],
  },
  {
    id: 'c_maren_azhar', npc: 'maren', priority: 83, cond: (s) => boss(s, 'azhar'),
    lines: [
      { who: 'maren', text: L('Azhar thanked you, didn\'t he? A thousand years in chains for granting one wish.', 'Azhar berterima kasih padamu, bukan? Seribu tahun dalam rantai karena mengabulkan satu permintaan.') },
      { who: 'maren', text: L('Malachar wished for a dawn that never ends. So the djinn stole every dawn and kept them. Endless — and empty.', 'Malachar meminta fajar yang tak pernah berakhir. Maka sang jin mencuri setiap fajar dan menyimpannya. Tanpa akhir — dan hampa.') },
    ],
  },
  {
    id: 'c_maren_vesper', npc: 'maren', priority: 82, cond: (s) => boss(s, 'vesper'),
    lines: [
      { who: 'rowan', text: L('Vesper said she kept his light. What did she mean?', 'Vesper bilang dia menjaga cahayanya. Apa maksudnya?') },
      { who: 'maren', text: L('Before he fell, Malachar gave her a candle. "So you\'re never in the dark," he said. She kept it lit inside her heart until it froze.', 'Sebelum ia jatuh, Malachar memberinya sebatang lilin. "Agar kau tak pernah dalam gelap," katanya. Ia menjaganya menyala di hatinya sampai membeku.') },
      { who: 'maren', text: L('Only the Hollow Throne remains. Whatever you find there... he was my son in every way that matters.', 'Hanya Takhta Hampa yang tersisa. Apa pun yang kau temukan di sana... dia anakku dalam segala hal yang berarti.') },
    ],
  },
  {
    id: 'c_maren_malachar', npc: 'maren', priority: 81, cond: (s) => boss(s, 'malachar'),
    lines: [
      { who: 'maren', text: L('You did it. The sun rose. I felt it on a face I no longer have.', 'Kau berhasil. Matahari terbit. Aku merasakannya di wajah yang tak lagi kumiliki.') },
      { who: 'maren', text: L('But he will rise again. Hate does not die, Rowan — it waits. Tobin has an idea. Listen to him.', 'Tapi dia akan bangkit lagi. Kebencian tidak mati, Rowan — ia menunggu. Tobin punya ide. Dengarkan dia.') },
    ],
  },
  {
    id: 'c_tobin_intro', npc: 'tobin', priority: 70, cond: () => true,
    lines: [
      { who: 'tobin', text: L('Ah, the new keeper! I am Tobin. I write down everything, so nothing is ever truly lost.', 'Ah, penjaga baru! Aku Tobin. Aku mencatat segalanya, agar tak ada yang benar-benar hilang.') },
      { who: 'tobin', text: L('Bring me stories from the Depths — monsters, relics, strange encounters. My Codex will remember them for you.', 'Bawakan aku cerita dari Kedalaman — monster, relik, pertemuan aneh. Kodeks-ku akan mengingatnya untukmu.') },
    ],
  },
  {
    id: 'c_brom_intro', npc: 'brom', priority: 70, cond: () => true,
    lines: [
      { who: 'brom', text: L('Keeper. Bring me what you find down there and I\'ll make it sharper, harder, meaner.', 'Penjaga. Bawakan apa yang kau temukan di bawah sana dan akan kubuat lebih tajam, lebih keras, lebih ganas.') },
      { who: 'brom', text: L('Scrap you don\'t need? Salvage it. Every bolt becomes a better blade.', 'Barang yang tak kau butuhkan? Urai saja. Setiap baut menjadi pedang yang lebih baik.') },
    ],
  },
  {
    id: 'c_pip_intro', npc: 'pip', priority: 70, cond: () => true,
    lines: [
      { who: 'pip', text: L('A customer! A living, breathing, paying customer! Pip\'s the name, deals are the game.', 'Pelanggan! Pelanggan yang hidup, bernapas, dan membayar! Namaku Pip, urusanku dagang.') },
      { who: 'pip', text: L('Fresh stock every dawn. And since you die a lot — no offense — that\'s a LOT of dawns.', 'Barang baru setiap fajar. Dan karena kau sering mati — maaf — itu BANYAK fajar.') },
    ],
  },
  {
    id: 'c_liora_intro', npc: 'liora', priority: 70, cond: () => true,
    lines: [
      { who: 'liora', text: L('The six Spirits still wander the Depths. They are drawn to the Lantern\'s flame — to you.', 'Keenam Roh masih berkelana di Kedalaman. Mereka tertarik pada nyala Lentera — padamu.') },
      { who: 'liora', text: L('Pray at their shrines. Accept their Boons. Just remember: power borrowed is still power owed.', 'Berdoalah di kuil mereka. Terimalah Anugerah mereka. Ingatlah: kekuatan yang dipinjam tetap harus dibayar.') },
    ],
  },
  {
    id: 'c_kael_intro', npc: 'kael', priority: 70, cond: () => true,
    lines: [
      { who: 'kael', text: L('Kael. Hunter. The board has bounties — fresh every day. Kill what\'s on it, get paid.', 'Kael. Pemburu. Papan itu berisi buruan — baru setiap hari. Bunuh yang tertera, dapat bayaran.') },
    ],
  },
  {
    id: 'c_mira_intro', npc: 'mira', priority: 70, cond: () => true,
    lines: [
      { who: 'mira', text: L('Hi hi! I\'m Mira! Nothing grows without sun, they said. Well, look at my garden!', 'Hai hai! Aku Mira! Katanya tak ada yang tumbuh tanpa matahari. Nah, lihat kebunku!') },
      { who: 'mira', text: L('If you find seeds down there, plant them here. They\'ll grow while you\'re... away.', 'Kalau kau menemukan benih di bawah sana, tanam di sini. Mereka akan tumbuh selama kau... pergi.') },
    ],
  },
  {
    id: 'c_ysolde_intro', npc: 'ysolde', priority: 70, cond: () => true,
    lines: [
      { who: 'ysolde', text: L('Oh! Careful, that one explodes. Mostly. I\'m Ysolde — elixirs, tonics, flasks, the occasional small fire.', 'Oh! Hati-hati, yang itu meledak. Biasanya. Aku Ysolde — eliksir, tonik, ramuan, kadang kebakaran kecil.') },
      { who: 'ysolde', text: L('Bring me monster bits and herbs and I\'ll brew something that makes your next descent easier.', 'Bawakan aku bagian monster dan herbal, akan kuracik sesuatu yang membuat penurunanmu berikutnya lebih mudah.') },
    ],
  },
  {
    id: 'c_nyx_intro', npc: 'nyx', priority: 70, cond: () => true,
    lines: [
      { who: 'nyx', text: L('The dark has rules, keeper. Swear to them — Vows of Night — and it will pay you in embers.', 'Kegelapan punya aturan, penjaga. Bersumpahlah padanya — Sumpah Malam — dan ia akan membayarmu dengan bara.') },
      { who: 'rowan', text: L('And if I break them?', 'Dan kalau aku melanggarnya?') },
      { who: 'nyx', text: L('You won\'t get the chance.', 'Kau tak akan sempat.') },
    ],
  },
  {
    id: 'c_finn_intro', npc: 'finn', priority: 70, cond: () => true,
    lines: [
      { who: 'finn', text: L('"A keeper went down where the dark things dwell..." Oh! Don\'t mind me, I\'m writing your ballad.', 'Seorang penjaga turun ke tempat makhluk gelap tinggal... Oh! Jangan pedulikan aku, aku sedang menulis baladamu.') },
    ],
  },
  {
    id: 'c_wren_intro', npc: 'wren', priority: 70, cond: () => true,
    lines: [
      { who: 'wren', text: L('Are you really going down the Rift? Can you look for Biscuit? She\'s orange and she has a little bell!', 'Kau benar-benar turun ke Celah? Bisa cari Biscuit? Dia oranye dan punya lonceng kecil!') },
    ],
  },
];

export const CONVERSATIONS: Conversation[] = [...BASE_CONVERSATIONS, ...CONVERSATIONS_EXPANSION];


/** Repeatable small talk, filtered by progress. One random line plays when no story conversation is pending. */
export const IDLE: Record<string, { cond?: (s: SaveData) => boolean; text: L10n }[]> = {
  maren: [
    { text: L('The Lantern burns a little brighter every time you return.', 'Lentera menyala sedikit lebih terang setiap kali kau kembali.') },
    { text: L('Rest if you must. The dark is patient, but so am I.', 'Istirahatlah bila perlu. Kegelapan itu sabar, begitu juga aku.') },
    { cond: (s) => runs(s) >= 5, text: L('You fight differently now. Less like me. More like you. Good.', 'Caramu bertarung kini berbeda. Tak lagi sepertiku. Lebih seperti dirimu. Bagus.') },
    { cond: (s) => boss(s, 'twin_lamias'), text: L('He used to hide under my desk during thunderstorms. Malachar. Isn\'t that strange to imagine?', 'Dia dulu bersembunyi di bawah mejaku saat badai petir. Malachar. Aneh membayangkannya, bukan?') },
  ],
  dorran: [
    { text: L('Keep your guard up and your dash ready. The Depths punish greed.', 'Jaga pertahananmu dan siapkan dash. Kedalaman menghukum keserakahan.') },
    { text: L('Elites glow for a reason. Kill them first or don\'t fight them at all.', 'Elit bercahaya karena suatu alasan. Bunuh mereka duluan atau jangan lawan sama sekali.') },
    { cond: (s) => boss(s, 'gorehorn'), text: L('Gorehorn. Hah! I\'ll drink to that tonight.', 'Gorehorn. Hah! Malam ini aku akan minum untuk itu.') },
  ],
  brom: [
    { text: L('A +10 blade cuts through doubt as easily as bone.', 'Pedang +10 memotong keraguan semudah memotong tulang.') },
    { text: L('Sets! Match four pieces and they sing together. Trust me.', 'Set! Padukan empat bagian dan mereka bernyanyi bersama. Percayalah.') },
  ],
  ysolde: [
    { text: L('Elixirs last one run. Drink before you descend, not after you die.', 'Eliksir bertahan satu run. Minum sebelum turun, bukan setelah mati.') },
    { text: L('If it bubbles, it\'s working. If it screams, run.', 'Kalau menggelegak, berarti bekerja. Kalau menjerit, lari.') },
  ],
  pip: [
    { text: L('Everything has a price! Even friendship. Yours is on discount.', 'Semuanya ada harganya! Bahkan persahabatan. Punyamu sedang diskon.') },
    { text: L('Salvage junk at Brom\'s, sell treasures to me. That\'s the circle of commerce.', 'Urai barang rongsok di Brom, jual harta padaku. Itulah lingkaran perdagangan.') },
  ],
  liora: [
    { text: L('Two spirits in harmony can grant a Duo Boon. Seek balance.', 'Dua roh yang selaras bisa memberi Anugerah Duo. Carilah keseimbangan.') },
    { text: L('Legendary Boons come to those devoted to one spirit.', 'Anugerah Legendaris datang kepada yang setia pada satu roh.') },
  ],
  kael: [
    { text: L('Wasps come in swarms. Dash through, don\'t fight in the middle.', 'Tawon datang berkawanan. Dash menembus, jangan bertarung di tengah.') },
    { text: L('Burrowers show a mound before they surface. Watch the dust.', 'Penggali menampakkan gundukan sebelum muncul. Perhatikan debunya.') },
  ],
  tobin: [
    { text: L('The Codex grows with every monster you meet. Knowledge is a weapon too.', 'Kodeks bertambah dengan setiap monster yang kau temui. Pengetahuan juga senjata.') },
    { text: L('Memory Shards... fragments of Maren\'s past. Collect them. They matter more than you know.', 'Serpihan Memori... pecahan masa lalu Maren. Kumpulkan. Itu lebih penting dari yang kau kira.') },
  ],
  nyx: [
    { text: L('More heat, more embers. Simple arithmetic.', 'Lebih banyak heat, lebih banyak bara. Aritmetika sederhana.') },
    { text: L('I knew Vesper once. Before the ice.', 'Aku pernah mengenal Vesper. Sebelum es.') },
  ],
  mira: [
    { text: L('Golden Apple seeds are rare. Rumor says they grow embers!', 'Benih Apel Emas itu langka. Katanya mereka menumbuhkan bara!') },
    { text: L('Talk to your plants! They grow faster. Probably.', 'Ajak bicara tanamanmu! Mereka tumbuh lebih cepat. Mungkin.') },
  ],
  wren: [
    { text: L('When I grow up I\'m gonna be a keeper too! With a BIGGER lantern.', 'Kalau sudah besar aku mau jadi penjaga juga! Dengan lentera yang LEBIH BESAR.') },
    { cond: (s) => !!s.flags.cat_home, text: L('Biscuit sleeps on my feet every night now. She missed me!', 'Biscuit tidur di kakiku setiap malam sekarang. Dia kangen aku!') },
  ],
  finn: [
    { text: L('Every great ballad needs a tragic death. Yours has... several. Very efficient.', 'Setiap balada hebat butuh kematian tragis. Punyamu ada... beberapa. Sangat efisien.') },
    { text: L('I\'m composing a song about the Twin Sisters. It\'s very sad and very catchy.', 'Aku sedang mengarang lagu tentang Saudari Kembar. Sangat sedih dan sangat menempel di kepala.') },
  ],
};

export const SPEAKER_NAMES: Record<string, L10n> = {
  rowan: L('Rowan', 'Rowan'), sera: L('Sera', 'Sera'), elio: L('Elio', 'Elio'), kaito: L('Kaito', 'Kaito'),
};
