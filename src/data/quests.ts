import type { L10n } from '@/core/i18n';
import { SIDE_QUESTS_EXPANSION } from './quests2';

export type Objective =
  | { kind: 'talk'; npc: string }
  | { kind: 'flag'; flag: string }
  | { kind: 'kill'; count: number; enemy?: string }
  | { kind: 'killElite'; count: number }
  | { kind: 'boss'; boss: string }
  | { kind: 'depth'; depth: number }
  | { kind: 'item'; material: string; count: number }
  | { kind: 'runs'; count: number }
  | { kind: 'stat'; stat: string; count: number; label: L10n }
  | { kind: 'events'; count: number }
  | { kind: 'upgrade'; level: number }
  | { kind: 'rarity'; rarity: number }
  | { kind: 'gold'; count: number }
  | { kind: 'shards'; count: number }
  | { kind: 'heatDepth'; heat: number; depth: number };

export interface QuestReward {
  embers?: number;
  gold?: number;
  shards?: number;
  item?: { rarity: number; slot?: string };
  hero?: string;
  feature?: string;
  flag?: string;
  material?: [string, number];
}

export interface QuestDef {
  id: string;
  type: 'main' | 'side';
  chapter?: number;
  giver: string;
  title: L10n;
  desc: L10n;
  objectives: Objective[];
  rewards: QuestReward;
  requires?: string[];
  /** Consume required materials/gold when claiming. */
  consume?: boolean;
  /** Giver's line when the quest is handed in. */
  done: L10n;
}

const L = (en: string, id: string): L10n => ({ en, id });

const BASE_QUESTS: QuestDef[] = [
  // ============================================================ MAIN
  {
    id: 'mq_awaken', type: 'main', chapter: 1, giver: 'maren',
    title: L('The Last Lantern', 'Lentera Terakhir'),
    desc: L('You woke at the Lantern shrine. Speak with Maren\'s spirit.', 'Kau terbangun di kuil Lentera. Bicaralah dengan roh Maren.'),
    objectives: [{ kind: 'talk', npc: 'maren' }],
    rewards: { embers: 20 },
    done: L('The flame chose you, Rowan. Now go and find Captain Dorran — you will need a sword arm, not just a kind heart.', 'Nyala ini memilihmu, Rowan. Sekarang temui Kapten Dorran — kau butuh lengan pedang, bukan hanya hati yang baik.'),
  },
  {
    id: 'mq_training', type: 'main', chapter: 2, giver: 'dorran', requires: ['mq_awaken'],
    title: L('Steel and Flame', 'Baja dan Nyala'),
    desc: L('Captain Dorran wants to see you swing. Strike the training dummy 10 times.', 'Kapten Dorran ingin melihatmu mengayunkan pedang. Pukul boneka latihan 10 kali.'),
    objectives: [{ kind: 'stat', stat: 'dummyHits', count: 10, label: L('Dummy hits', 'Pukulan boneka') }],
    rewards: { gold: 60, feature: 'rift', flag: 'rift_open' },
    done: L('Not bad. Not good either — but the Rift doesn\'t care. It\'s open. Go.', 'Lumayan. Belum bagus juga — tapi Celah tidak peduli. Sudah terbuka. Pergilah.'),
  },
  {
    id: 'mq_village', type: 'main', chapter: 3, giver: 'dorran', requires: ['mq_training'],
    title: L('Faces of Emberhollow', 'Wajah-Wajah Emberhollow'),
    desc: L('Dorran wants you to know who you are fighting for. Talk to Brom at the smithy, Pip at the market and little Wren.', 'Dorran ingin kau tahu untuk siapa kau bertarung. Bicaralah dengan Brom di tempa, Pip di pasar, dan si kecil Wren.'),
    objectives: [{ kind: 'talk', npc: 'brom' }, { kind: 'talk', npc: 'pip' }, { kind: 'talk', npc: 'wren' }],
    rewards: { embers: 40, gold: 60 },
    done: L('Good. When it gets dark down there, you will remember their faces. That is what keeps a keeper walking.', 'Bagus. Saat gelap di bawah sana, kau akan ingat wajah mereka. Itulah yang membuat seorang penjaga terus berjalan.'),
  },
  {
    id: 'mq_descend', type: 'main', chapter: 4, giver: 'maren', requires: ['mq_training'],
    title: L('Into Whisperwood', 'Menuju Hutan Bisikan'),
    desc: L('Enter the Rift and defeat 15 monsters in the Depths. Death is only a detour.', 'Masuki Celah dan kalahkan 15 monster di Kedalaman. Kematian hanyalah jalan memutar.'),
    objectives: [{ kind: 'kill', count: 15 }],
    rewards: { embers: 60, feature: 'lantern_tree' },
    done: L('You came back. You will always come back. Use the embers you gathered — the Lantern Tree will make you stronger.', 'Kau kembali. Kau akan selalu kembali. Gunakan bara yang kau kumpulkan — Pohon Lentera akan membuatmu lebih kuat.'),
  },
  {
    id: 'mq_gorehorn', type: 'main', chapter: 5, giver: 'maren', requires: ['mq_descend'],
    title: L('The Warden', 'Sang Penjaga'),
    desc: L('Gorehorn guards the Ember of Growth at the heart of Whisperwood. Defeat him.', 'Gorehorn menjaga Bara Pertumbuhan di jantung Hutan Bisikan. Kalahkan dia.'),
    objectives: [{ kind: 'boss', boss: 'gorehorn' }],
    rewards: { embers: 150, hero: 'sera', item: { rarity: 3 } },
    done: L('The first Ember. Feel it? The village is warmer already. And look — someone followed its light home.', 'Bara pertama. Kau merasakannya? Desa sudah lebih hangat. Dan lihat — seseorang mengikuti cahayanya pulang.'),
  },
  {
    id: 'mq_journal', type: 'main', chapter: 6, giver: 'tobin', requires: ['mq_gorehorn'],
    title: L('Maren\'s Journal', 'Jurnal Maren'),
    desc: L('Old Tobin says Maren kept a journal before she became the Lantern. Its pages were scattered in the first two Depths. Find all three.', 'Tobin Tua bilang Maren menulis jurnal sebelum ia menjadi Lentera. Halaman-halamannya tercecer di dua Kedalaman pertama. Temukan ketiganya.'),
    objectives: [
      { kind: 'flag', flag: 'journal_1' },
      { kind: 'flag', flag: 'journal_2' },
      { kind: 'flag', flag: 'journal_3' },
    ],
    rewards: { embers: 120, shards: 1 },
    done: L('Forty years I have searched for these... She wrote about him like a son. Whatever Malachar became, he started as someone she loved. Remember that, keeper.', 'Empat puluh tahun aku mencari ini... Ia menulis tentangnya seperti tentang putranya sendiri. Apa pun yang Malachar jadi sekarang, ia bermula sebagai seseorang yang dicintai Maren. Ingatlah itu, penjaga.'),
  },
  {
    id: 'mq_crypt', type: 'main', chapter: 7, giver: 'maren', requires: ['mq_journal'],
    title: L('Songs Beneath the Stone', 'Lagu di Bawah Batu'),
    desc: L('The Twin Sisters sing over the Ember of Memory in the Sunken Crypt. Silence them.', 'Saudari Kembar bernyanyi di atas Bara Ingatan di Kripta Tenggelam. Bungkam mereka.'),
    objectives: [{ kind: 'boss', boss: 'twin_lamias' }],
    rewards: { embers: 200, hero: 'elio', shards: 1 },
    done: L('The Ember of Memory... it shows me things, Rowan. Things I tried to forget. There was a boy, once. My first student.', 'Bara Ingatan... ia memperlihatkan banyak hal, Rowan. Hal-hal yang ingin kulupakan. Dulu ada seorang anak laki-laki. Murid pertamaku.'),
  },
  {
    id: 'mq_lullaby', type: 'main', chapter: 8, giver: 'finn', requires: ['mq_crypt'],
    title: L('The Sisters\' Lullaby', 'Nina Bobo Sang Saudari'),
    desc: L('Since the Twin Sisters fell, Finn hears a song drifting up from below. Find where the lullaby comes from in the Depths.', 'Sejak Saudari Kembar tumbang, Finn mendengar lagu mengalun dari bawah. Temukan asal nina bobo itu di Kedalaman.'),
    objectives: [{ kind: 'flag', flag: 'lullaby_heard' }],
    rewards: { embers: 160, item: { rarity: 3 } },
    done: L('They were not monsters, you know. Just two girls who sang to keep each other brave while the water rose. I will make sure the village learns their song.', 'Mereka bukan monster, tahu. Hanya dua gadis yang bernyanyi agar saling berani saat air naik. Akan kupastikan seluruh desa mempelajari lagu mereka.'),
  },
  {
    id: 'mq_dunes', type: 'main', chapter: 9, giver: 'maren', requires: ['mq_lullaby'],
    title: L('The Bound Djinn', 'Jin yang Terikat'),
    desc: L('Azhar, the Bound Djinn, burns in the Scorchsand Dunes. Take the Ember of Will.', 'Azhar, Jin yang Terikat, membara di Bukit Pasir Membara. Ambil Bara Tekad.'),
    objectives: [{ kind: 'boss', boss: 'azhar' }],
    rewards: { embers: 260, shards: 1, item: { rarity: 4 } },
    done: L('Azhar granted Malachar a wish once: that dawn would never end. Some wishes are curses wearing crowns.', 'Azhar pernah mengabulkan permintaan Malachar: agar fajar tak pernah berakhir. Beberapa permintaan adalah kutukan yang memakai mahkota.'),
  },
  {
    id: 'mq_forge_oath', type: 'main', chapter: 10, giver: 'brom', requires: ['mq_dunes'],
    title: L('The Oathbound Anvil', 'Landasan Sumpah'),
    desc: L('Brom speaks of the Oathbound Anvil in the third Depth, where the first smiths swore to forge only what protects. Find it, and bring 3 Magma Cores so he can relight the old forge.', 'Brom bercerita tentang Landasan Sumpah di Kedalaman ketiga, tempat para pandai besi pertama bersumpah hanya menempa yang melindungi. Temukan, dan bawa 3 Inti Magma agar ia bisa menyalakan tungku lama.'),
    objectives: [{ kind: 'flag', flag: 'anvil_found' }, { kind: 'item', material: 'magma_core', count: 3 }],
    rewards: { embers: 220, item: { rarity: 4, slot: 'weapon' } }, consume: true,
    done: L('The Oathbound Anvil... Grandad swore on it. So did I, as a boy. With these cores the old forge burns again — and every blade I make now keeps the oath.', 'Landasan Sumpah... Kakek bersumpah di atasnya. Aku juga, waktu kecil. Dengan inti-inti ini tungku lama menyala lagi — dan setiap bilah yang kubuat kini menepati sumpah itu.'),
  },
  {
    id: 'mq_frost', type: 'main', chapter: 11, giver: 'maren', requires: ['mq_forge_oath'],
    title: L('The Frozen Heart', 'Hati yang Membeku'),
    desc: L('Vesper waits in the Frostveil Cathedral with the Ember of Love. Thaw her heart — or break it.', 'Vesper menunggu di Katedral Tirai Beku dengan Bara Cinta. Cairkan hatinya — atau hancurkan.'),
    objectives: [{ kind: 'boss', boss: 'vesper' }],
    rewards: { embers: 320, shards: 1 },
    done: L('Vesper was my student too. She loved him. She followed him into the cold because she could not bear for him to be alone.', 'Vesper juga muridku. Dia mencintainya. Dia mengikutinya ke dalam dingin karena tak sanggup membiarkannya sendirian.'),
  },
  {
    id: 'mq_frozen_letter', type: 'main', chapter: 12, giver: 'liora', requires: ['mq_frost'],
    title: L('The Frozen Letter', 'Surat yang Membeku'),
    desc: L('Sister Liora senses a message sealed in ice somewhere in the fourth Depth. Find what Vesper left behind.', 'Suster Liora merasakan sebuah pesan tersegel dalam es di suatu tempat di Kedalaman keempat. Temukan apa yang ditinggalkan Vesper.'),
    objectives: [{ kind: 'flag', flag: 'vesper_letter' }],
    rewards: { embers: 280, shards: 1 },
    done: L('She never stopped hoping he would come back to himself. Carry her words down to the Throne, Rowan. Some doors only open for a kindness.', 'Ia tak pernah berhenti berharap Malachar kembali menjadi dirinya. Bawalah kata-katanya ke Takhta, Rowan. Beberapa pintu hanya terbuka oleh kebaikan.'),
  },
  {
    id: 'mq_throne', type: 'main', chapter: 13, giver: 'maren', requires: ['mq_frozen_letter'],
    title: L('The Hollow King', 'Raja Hampa'),
    desc: L('Descend to the Hollow Throne. Defeat Malachar and reclaim the Ember of Dawn.', 'Turun ke Takhta Hampa. Kalahkan Malachar dan rebut kembali Bara Fajar.'),
    objectives: [{ kind: 'boss', boss: 'malachar' }],
    rewards: { embers: 500, flag: 'ending_normal', item: { rarity: 4 } },
    done: L('The sun rose, Rowan. For one morning, the sun rose. But the Lantern still flickers... he is not gone. Not truly.', 'Matahari terbit, Rowan. Untuk satu pagi, matahari terbit. Tapi Lentera masih berkedip... dia belum pergi. Belum sepenuhnya.'),
  },
  {
    id: 'mq_memories', type: 'main', chapter: 14, giver: 'tobin', requires: ['mq_throne'],
    title: L('Memories of Maren', 'Kenangan Maren'),
    desc: L('Tobin believes Maren\'s scattered memories hold the key. Gather 10 Memory Shards.', 'Tobin yakin kenangan Maren yang tercerai-berai adalah kuncinya. Kumpulkan 10 Serpihan Memori.'),
    objectives: [{ kind: 'shards', count: 10 }],
    rewards: { embers: 200, flag: 'true_path' },
    done: L('It is all here. Maren did not fail him — he failed himself, and she never stopped hoping. You can reach him, Rowan. Not with a sword.', 'Semuanya ada di sini. Maren tidak gagal padanya — dia gagal pada dirinya sendiri, dan Maren tak pernah berhenti berharap. Kau bisa menjangkaunya, Rowan. Bukan dengan pedang.'),
  },
  {
    id: 'mq_true_dawn', type: 'main', chapter: 15, giver: 'maren', requires: ['mq_memories'],
    title: L('The Last Dawn', 'Fajar Terakhir'),
    desc: L('Face Malachar once more, carrying Maren\'s memories. End the Long Night for good.', 'Hadapi Malachar sekali lagi, membawa kenangan Maren. Akhiri Malam Panjang untuk selamanya.'),
    objectives: [{ kind: 'flag', flag: 'malachar_after_truth' }],
    rewards: { embers: 1000, flag: 'ending_true' },
    done: L('Thank you, Rowan. Thank you for bringing him home. Now let an old woman rest... and let the sun rise.', 'Terima kasih, Rowan. Terima kasih telah membawanya pulang. Sekarang biarkan wanita tua ini beristirahat... dan biarkan matahari terbit.'),
  },

  // ============================================================ SIDE
  {
    id: 'sq_cat', type: 'side', giver: 'wren', requires: ['mq_training'],
    title: L('Biscuit Is Missing', 'Biscuit Hilang'),
    desc: L('Wren\'s cat Biscuit wandered into the Rift. Find any sign of her in the Depths.', 'Kucing Wren, Biscuit, masuk ke Celah. Temukan jejaknya di Kedalaman.'),
    objectives: [{ kind: 'item', material: 'q_cat_bell', count: 1 }],
    rewards: { embers: 60, flag: 'cat_home' }, consume: true,
    done: L('Her bell! And — BISCUIT! She came home! You\'re the best keeper EVER!', 'Loncengnya! Dan — BISCUIT! Dia pulang! Kau penjaga TERHEBAT!'),
  },
  {
    id: 'sq_hammer', type: 'side', giver: 'brom', requires: ['mq_gorehorn'],
    title: L('Brom\'s Heirloom', 'Pusaka Brom'),
    desc: L('Brom lost his grandfather\'s hammer when the Crypt flooded. Search the Sunken Crypt.', 'Brom kehilangan palu kakeknya saat Kripta banjir. Cari di Kripta Tenggelam.'),
    objectives: [{ kind: 'item', material: 'q_brom_hammer', count: 1 }],
    rewards: { feature: 'reforge', item: { rarity: 3, slot: 'weapon' } }, consume: true,
    done: L('...Grandad\'s hammer. I can feel his hands on the grip. With this, I can reforge anything. Anything!', '...Palu Kakek. Aku bisa merasakan tangannya di gagangnya. Dengan ini, aku bisa menempa ulang apa pun. Apa pun!'),
  },
  {
    id: 'sq_forge', type: 'side', giver: 'brom', requires: ['mq_training'],
    title: L('Tempered Steel', 'Baja Tempaan'),
    desc: L('Upgrade any piece of equipment to +5 at Brom\'s forge.', 'Tingkatkan perlengkapan apa pun hingga +5 di tempa Brom.'),
    objectives: [{ kind: 'upgrade', level: 5 }],
    rewards: { embers: 80, material: ['moonsteel', 2] },
    done: L('Now THAT\'S a blade. You\'re learning.', 'Nah, ITU baru pedang. Kau mulai belajar.'),
  },
  {
    id: 'sq_legend', type: 'side', giver: 'brom', requires: ['sq_forge'],
    title: L('A Thing of Legend', 'Benda Legendaris'),
    desc: L('Find a Legendary item in the Depths and show it to Brom.', 'Temukan item Legendaris di Kedalaman dan tunjukkan pada Brom.'),
    objectives: [{ kind: 'rarity', rarity: 4 }],
    rewards: { embers: 120, material: ['dawn_shard', 1] },
    done: L('By my beard... I\'ve read about this one. Keep it safe. Keep YOURSELF safe.', 'Demi janggutku... aku pernah membaca tentang yang ini. Jaga baik-baik. Jaga DIRIMU baik-baik.'),
  },
  {
    id: 'sq_recipes', type: 'side', giver: 'ysolde', requires: ['mq_gorehorn'],
    title: L('Grandmother\'s Recipe', 'Resep Nenek'),
    desc: L('Ysolde\'s grandmother\'s recipe book was lost in the Depths. Find the page, and bring 5 Moonpetals.', 'Buku resep nenek Ysolde hilang di Kedalaman. Temukan halamannya, dan bawa 5 Kelopak Bulan.'),
    objectives: [{ kind: 'item', material: 'q_recipe', count: 1 }, { kind: 'item', material: 'moonpetal', count: 5 }],
    rewards: { flag: 'free_flask', embers: 80 }, consume: true,
    done: L('The Dawn Tonic! Grandma, you genius! Here — your flask will hold one more draught from now on.', 'Tonik Fajar! Nenek, kau jenius! Ini — ramuanmu akan muat satu tegukan lagi mulai sekarang.'),
  },
  {
    id: 'sq_hunter', type: 'side', giver: 'kael', requires: ['mq_descend'],
    title: L('Thinning the Herd', 'Menipiskan Kawanan'),
    desc: L('Kael wants proof you can hunt. Defeat 150 monsters.', 'Kael ingin bukti kau bisa berburu. Kalahkan 150 monster.'),
    objectives: [{ kind: 'kill', count: 150 }],
    rewards: { embers: 120, item: { rarity: 3, slot: 'charm' } },
    done: L('Hm. You\'ll do. Take this — it kept me alive longer than I deserved.', 'Hm. Kau cukup. Ambil ini — ia menjagaku tetap hidup lebih lama dari yang pantas.'),
  },
  {
    id: 'sq_elites', type: 'side', giver: 'kael', requires: ['sq_hunter'],
    title: L('Big Game', 'Buruan Besar'),
    desc: L('Defeat 25 elite monsters.', 'Kalahkan 25 monster elit.'),
    objectives: [{ kind: 'killElite', count: 25 }],
    rewards: { embers: 180, shards: 1 },
    done: L('Twenty-five. I stopped counting mine at twenty. Respect, keeper.', 'Dua puluh lima. Aku berhenti menghitung milikku di dua puluh. Hormat, penjaga.'),
  },
  {
    id: 'sq_letters', type: 'side', giver: 'tobin', requires: ['mq_descend'],
    title: L('Letters of the Dead', 'Surat-Surat Orang Mati'),
    desc: L('Old keepers left letters in the Depths. Bring 3 Faded Letters to Tobin.', 'Para penjaga lama meninggalkan surat di Kedalaman. Bawa 3 Surat Pudar kepada Tobin.'),
    objectives: [{ kind: 'item', material: 'q_letter', count: 3 }],
    rewards: { shards: 2, embers: 60 }, consume: true,
    done: L('Maren\'s handwriting... "If you are reading this, Malachar, come home." She wrote to him. For years.', 'Tulisan tangan Maren... "Jika kau membaca ini, Malachar, pulanglah." Dia menulis surat padanya. Bertahun-tahun.'),
  },
  {
    id: 'sq_atlas', type: 'side', giver: 'tobin', requires: ['mq_descend'],
    title: L('Tobin\'s Atlas', 'Atlas Tobin'),
    desc: L('Witness 15 different encounters in the Depths for Tobin\'s book.', 'Saksikan 15 pertemuan berbeda di Kedalaman untuk buku Tobin.'),
    objectives: [{ kind: 'events', count: 15 }],
    rewards: { embers: 150, shards: 1 },
    done: L('Marvelous! Chapter Nine: "The Imp Who Cheated at Cups." A classic.', 'Luar biasa! Bab Sembilan: "Imp yang Curang Main Cangkir." Klasik.'),
  },
  {
    id: 'sq_harvest', type: 'side', giver: 'mira', requires: ['mq_descend'],
    title: L('First Harvest', 'Panen Pertama'),
    desc: L('Plant a seed in Mira\'s garden and harvest it after your runs.', 'Tanam benih di kebun Mira dan panen setelah run-mu.'),
    objectives: [{ kind: 'stat', stat: 'harvests', count: 1, label: L('Harvests', 'Panen') }],
    rewards: { feature: 'garden_plot', material: ['seed_sunroot', 2], embers: 40 },
    done: L('Look at it grow! Even without sun! I\'ll clear another plot for you.', 'Lihat ia tumbuh! Bahkan tanpa matahari! Aku akan membuka satu petak lagi untukmu.'),
  },
  {
    id: 'sq_pilgrim', type: 'side', giver: 'liora', requires: ['mq_descend'],
    title: L('The Pilgrim\'s Path', 'Jalan Peziarah'),
    desc: L('Pray at 8 Spirit Shrines in the Depths.', 'Berdoa di 8 Kuil Roh di Kedalaman.'),
    objectives: [{ kind: 'stat', stat: 'shrines', count: 8, label: L('Shrines', 'Kuil') }],
    rewards: { embers: 100, flag: 'liora_blessing' },
    done: L('The spirits know your name now. They will be... generous. Once more per run, they will let you choose again.', 'Para roh kini mengenal namamu. Mereka akan... murah hati. Sekali lagi setiap run, mereka akan membiarkanmu memilih ulang.'),
  },
  {
    id: 'sq_debt', type: 'side', giver: 'pip', requires: ['mq_descend'],
    title: L('Pip\'s Debt', 'Utang Pip'),
    desc: L('Pip owes money to the Merchants\' Guild. Help him pay 500 gold.', 'Pip berutang pada Serikat Pedagang. Bantu dia membayar 500 emas.'),
    objectives: [{ kind: 'gold', count: 500 }],
    rewards: { flag: 'pip_legendary', embers: 60 }, consume: true,
    done: L('FREE! I\'m FREE! Partner, from now on I\'m saving my best stock just for you.', 'BEBAS! Aku BEBAS! Kawan, mulai sekarang barang terbaikku kusimpan khusus untukmu.'),
  },
  {
    id: 'sq_songs', type: 'side', giver: 'finn', requires: ['mq_gorehorn'],
    title: L('The Lost Songs', 'Lagu-Lagu yang Hilang'),
    desc: L('Finn\'s songbook blew into the Rift. Recover 5 Song Sheets.', 'Buku lagu Finn tertiup ke Celah. Temukan 5 Lembar Lagu.'),
    objectives: [{ kind: 'item', material: 'q_song_sheet', count: 5 }],
    rewards: { feature: 'jukebox', embers: 100 }, consume: true,
    done: L('My songs! Here — I\'ll play whatever you like, whenever you like. Music keeps the dark away.', 'Laguku! Ini — akan kumainkan apa pun yang kau suka, kapan pun. Musik mengusir kegelapan.'),
  },
  {
    id: 'sq_riddle', type: 'side', giver: 'nyx', requires: ['mq_gorehorn'],
    title: L('Nyx\'s Riddle', 'Teka-Teki Nyx'),
    desc: L('Reach Depth 3 while bound by at least 3 Heat from the Vows of Night.', 'Capai Kedalaman 3 dengan setidaknya 3 Heat dari Sumpah Malam.'),
    objectives: [{ kind: 'heatDepth', heat: 3, depth: 3 }],
    rewards: { embers: 220, shards: 2 },
    done: L('So you are not afraid of the dark. Good. Neither was I — until I was. My name was once Vesper\'s sister. Now it is only Nyx.', 'Jadi kau tidak takut gelap. Bagus. Aku juga tidak — sampai aku takut. Namaku dulu adalah adik Vesper. Kini hanya Nyx.'),
  },
  {
    id: 'sq_trial', type: 'side', giver: 'dorran', requires: ['mq_descend'],
    title: L('Dorran\'s Trial', 'Ujian Dorran'),
    desc: L('Complete 5 Trial rooms in the Depths.', 'Selesaikan 5 ruang Ujian di Kedalaman.'),
    objectives: [{ kind: 'stat', stat: 'challenges', count: 5, label: L('Trials', 'Ujian') }],
    rewards: { hero: 'kaito', embers: 150 },
    done: L('A swordsman from the mountains has been watching you train. He asked to fight beside you. I said yes.', 'Seorang pendekar dari pegunungan telah memperhatikan latihanmu. Dia minta bertarung di sisimu. Kujawab ya.'),
  },
];

export const QUESTS: QuestDef[] = [...BASE_QUESTS, ...SIDE_QUESTS_EXPANSION];


export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}
