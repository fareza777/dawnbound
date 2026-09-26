import type { L10n } from '@/core/i18n';
import type { EventDef } from './events';

const L = (en: string, id: string): L10n => ({ en, id });

/**
 * Expansion events: story beats for the new main chapters (shown with priority while their quest is active),
 * side-quest events, region-only events for the alternate biomes, and more encounters for depths 3-5.
 */
export const EVENTS_EXPANSION: EventDef[] = [
  // ------------------------------------------------------------ Main story: Maren's Journal
  {
    id: 'ev_journal_1', minDepth: 1, maxDepth: 2, quest: 'mq_journal', onceFlag: 'journal_1',
    speaker: L('Tangled Roots', 'Akar Kusut'), portrait: 'props:plant/2/4',
    text: L('Roots have grown around a leather-bound page. The handwriting is Maren\'s — careful, looping, unmistakable.', 'Akar-akar tumbuh melilit selembar halaman bersampul kulit. Tulisannya milik Maren — rapi, melingkar, tak salah lagi.'),
    choices: [
      { label: L('Free the page gently', 'Lepaskan halamannya perlahan'), outcome: [{ type: 'flag', id: 'journal_1' }, { type: 'lore', id: 'lore_journal_1' }], result: L('The roots let go, almost politely. The page is dated forty years ago.', 'Akar-akar itu melepaskannya, nyaris dengan sopan. Halaman itu bertanggal empat puluh tahun lalu.') },
      { label: L('Cut through the roots', 'Tebas akarnya'), hint: L('Fight', 'Bertarung'), outcome: [{ type: 'flag', id: 'journal_1' }, { type: 'lore', id: 'lore_journal_1' }, { type: 'fight' }, { type: 'gold', v: 30 }], result: L('The page comes free — and the roots come alive!', 'Halaman itu terlepas — dan akar-akarnya hidup!') },
    ],
  },
  {
    id: 'ev_journal_2', minDepth: 1, maxDepth: 2, quest: 'mq_journal', onceFlag: 'journal_2',
    speaker: L('A Fallen Keeper', 'Penjaga yang Gugur'), portrait: 'portraits_ev_old_keeper',
    text: L('A skeleton in a keeper\'s cloak sits against the wall, a dim lantern still glowing in its lap. In its other hand: a folded page.', 'Kerangka berjubah penjaga duduk bersandar di dinding, lentera redup masih menyala di pangkuannya. Di tangan satunya: selembar halaman terlipat.'),
    choices: [
      { label: L('Take the page, say a prayer', 'Ambil halamannya, ucapkan doa'), hint: L('Heal', 'Pulihkan'), outcome: [{ type: 'flag', id: 'journal_2' }, { type: 'lore', id: 'lore_journal_2' }, { type: 'hp', v: 30 }], result: L('The lantern flares once, warm as a hand on your shoulder.', 'Lentera itu menyala sekali, hangat seperti tangan di bahumu.') },
      { label: L('Take the page and the lantern', 'Ambil halaman dan lenteranya'), hint: L('Relic', 'Relik'), outcome: [{ type: 'flag', id: 'journal_2' }, { type: 'lore', id: 'lore_journal_2' }, { type: 'relic', tier: 'common' }], result: L('The light goes out the moment you lift it. You feel watched... and forgiven.', 'Cahayanya padam saat kau mengangkatnya. Kau merasa diawasi... dan dimaafkan.') },
    ],
  },
  {
    id: 'ev_journal_3', minDepth: 2, maxDepth: 2, quest: 'mq_journal', onceFlag: 'journal_3',
    speaker: L('Ink on the Water', 'Tinta di Atas Air'), portrait: 'props:water/big/0',
    text: L('A page floats on the black water, somehow still dry. Something large moves beneath it.', 'Selembar halaman mengapung di atas air hitam, entah bagaimana tetap kering. Sesuatu yang besar bergerak di bawahnya.'),
    choices: [
      { label: L('Reach for it', 'Raih halamannya'), chance: 0.6, outcome: [{ type: 'flag', id: 'journal_3' }, { type: 'lore', id: 'lore_journal_3' }, { type: 'embers', v: 20 }], fail: [{ type: 'flag', id: 'journal_3' }, { type: 'lore', id: 'lore_journal_3' }, { type: 'hp', v: -25 }], result: L('Your fingers close on the page. The shadow below turns away, bored.', 'Jemarimu menggenggam halaman itu. Bayangan di bawah berbalik pergi, bosan.'), failResult: L('Teeth close on your arm — but you keep the page.', 'Gigi mencengkeram lenganmu — tapi halamannya tetap kau pegang.') },
      { label: L('Lure it away first (20 gold)', 'Pancing dulu makhluknya (20 emas)'), cost: { gold: 20 }, outcome: [{ type: 'flag', id: 'journal_3' }, { type: 'lore', id: 'lore_journal_3' }], result: L('The coins sink, the shadow follows them, and the page is yours.', 'Koin tenggelam, bayangan itu mengikutinya, dan halaman itu jadi milikmu.') },
    ],
  },

  // ------------------------------------------------------------ Main story: the Sisters' Lullaby
  {
    id: 'ev_twin_lullaby', minDepth: 2, maxDepth: 3, quest: 'mq_lullaby', onceFlag: 'lullaby_heard',
    speaker: L('Drowned Music Box', 'Kotak Musik Tenggelam'), portrait: 'portraits_ev_choir_ghost',
    text: L('A tarnished music box turns by itself in the shallows. Two voices hum along — one high, one low — the song the Twin Sisters sang the night the crypt flooded.', 'Sebuah kotak musik kusam berputar sendiri di air dangkal. Dua suara ikut bersenandung — satu tinggi, satu rendah — lagu yang dinyanyikan Saudari Kembar pada malam kripta itu banjir.'),
    choices: [
      { label: L('Listen until the end', 'Dengarkan sampai habis'), hint: L('Gain a Boon', 'Dapat Anugerah'), outcome: [{ type: 'flag', id: 'lullaby_heard' }, { type: 'lore', id: 'lore_lullaby' }, { type: 'boon' }], result: L('The last note fades. The water goes still, and a warm light settles on you.', 'Nada terakhir memudar. Air menjadi tenang, dan cahaya hangat menyelimutimu.') },
      { label: L('Close the lid', 'Tutup kotaknya'), outcome: [{ type: 'flag', id: 'lullaby_heard' }, { type: 'lore', id: 'lore_lullaby' }, { type: 'gold', v: 40 }], result: L('The humming stops mid-word. You could swear someone whispers "thank you".', 'Senandung berhenti di tengah kata. Kau berani bersumpah seseorang berbisik "terima kasih".') },
    ],
  },

  // ------------------------------------------------------------ Main story: the Oathbound Anvil
  {
    id: 'ev_oath_anvil', minDepth: 3, maxDepth: 3, quest: 'mq_forge_oath', onceFlag: 'anvil_found',
    speaker: L('The Oathbound Anvil', 'Landasan Sumpah'), portrait: 'portraits_ev_forge_spirit',
    text: L('A spirit of living embers stands over an anvil older than the village. "The smiths of Emberhollow swore an oath here: forge only what protects. Does your blade keep that oath, keeper?"', 'Roh bara hidup berdiri di atas landasan yang lebih tua dari desa. "Para pandai besi Emberhollow bersumpah di sini: hanya menempa yang melindungi. Apakah pedangmu menepati sumpah itu, penjaga?"'),
    choices: [
      { label: L('Swear the oath', 'Ucapkan sumpahnya'), hint: L('Empower a Boon', 'Kuatkan Anugerah'), outcome: [{ type: 'flag', id: 'anvil_found' }, { type: 'lore', id: 'lore_forge_oath' }, { type: 'upgrade' }], result: L('The spirit strikes the anvil once. The sound rings inside your bones. "Take word to Brom."', 'Roh itu memukul landasan sekali. Bunyinya bergema di dalam tulangmu. "Kabarkan pada Brom."') },
      { label: L('Prove it in battle', 'Buktikan dalam pertarungan'), hint: L('Elite fight, rare relic', 'Lawan elite, relik langka'), outcome: [{ type: 'flag', id: 'anvil_found' }, { type: 'lore', id: 'lore_forge_oath' }, { type: 'fight', elite: true }, { type: 'relic', tier: 'rare' }], result: L('The spirit laughs like a bellows. "Good! Show me!"', 'Roh itu tertawa seperti ububan. "Bagus! Tunjukkan padaku!"') },
    ],
  },

  // ------------------------------------------------------------ Main story: the Frozen Letter
  {
    id: 'ev_frozen_letter', minDepth: 4, maxDepth: 4, quest: 'mq_frozen_letter', onceFlag: 'vesper_letter',
    speaker: L('Letter in the Ice', 'Surat di Dalam Es'), portrait: 'props:crystal/cristal_12/0',
    text: L('A letter is sealed inside a pillar of clear ice, the ink still bright: "To Malachar — if you ever come back to yourself..." It is signed with a single V.', 'Sepucuk surat tersegel di dalam tiang es bening, tintanya masih cerah: "Untuk Malachar — jika kau pernah kembali menjadi dirimu..." Ditandatangani dengan satu huruf V.'),
    choices: [
      { label: L('Thaw it with your lantern', 'Cairkan dengan lenteramu'), cost: { hpPct: 10 }, outcome: [{ type: 'flag', id: 'vesper_letter' }, { type: 'lore', id: 'lore_vesper_letter' }, { type: 'maxhp', v: 5 }], result: L('The ice weeps. The letter is yours, damp but whole.', 'Es itu menangis. Surat itu kini milikmu, lembap namun utuh.') },
      { label: L('Shatter the pillar', 'Hancurkan tiangnya'), hint: L('Fight', 'Bertarung'), outcome: [{ type: 'flag', id: 'vesper_letter' }, { type: 'lore', id: 'lore_vesper_letter' }, { type: 'fight' }], result: L('The letter survives. The things sleeping in the ice do not stay asleep.', 'Suratnya selamat. Makhluk-makhluk yang tidur di dalam es tidak tetap tertidur.') },
    ],
  },

  // ------------------------------------------------------------ Side quests
  {
    id: 'ev_drowned_bell', minDepth: 2, maxDepth: 2, region: 'drowned', quest: 'sq_drowned_bell', onceFlag: 'drowned_bell',
    speaker: L('The Drowned Bell', 'Lonceng Tenggelam'), portrait: 'portraits_ev_choir_ghost',
    text: L('A great bronze bell hangs half-sunk in the black water. Every so often it rings on its own, and every ghost in the catacombs turns to listen.', 'Sebuah lonceng perunggu besar tergantung setengah tenggelam di air hitam. Sesekali ia berdentang sendiri, dan setiap hantu di katakomba menoleh untuk mendengarkan.'),
    choices: [
      { label: L('Ring it three times', 'Bunyikan tiga kali'), hint: L('Gain a Boon', 'Dapat Anugerah'), outcome: [{ type: 'flag', id: 'drowned_bell' }, { type: 'embers', v: 30 }, { type: 'boon' }], result: L('The ghosts bow, then drift up through the ceiling one by one. Liora will want to hear this.', 'Para hantu membungkuk, lalu melayang menembus langit-langit satu per satu. Liora pasti ingin mendengar ini.') },
      { label: L('Cut its rope', 'Potong talinya'), hint: L('Fight', 'Bertarung'), outcome: [{ type: 'flag', id: 'drowned_bell' }, { type: 'material', id: 'ectoplasm', n: 3 }, { type: 'fight' }], result: L('The bell sinks with a groan. The ghosts do not thank you.', 'Lonceng tenggelam sambil mengerang. Para hantu tidak berterima kasih padamu.') },
    ],
  },
  {
    id: 'ev_singing_crystal', minDepth: 4, maxDepth: 4, region: 'crystal', quest: 'sq_crystal_song', onceFlag: 'crystal_song',
    speaker: L('The Crystal Seer', 'Peramal Kristal'), portrait: 'portraits_ev_crystal_seer',
    text: L('A seer made of crystal hums inside a cracked geode, and the whole cave resonates with her song. "Few listen. Fewer remember. Will you carry my song to the surface?"', 'Seorang peramal dari kristal bersenandung di dalam geode yang retak, dan seluruh gua bergema dengan lagunya. "Sedikit yang mendengar. Lebih sedikit yang ingat. Maukah kau membawa laguku ke permukaan?"'),
    choices: [
      { label: L('Memorize the song', 'Hafalkan lagunya'), hint: L('Empower a Boon', 'Kuatkan Anugerah'), outcome: [{ type: 'flag', id: 'crystal_song' }, { type: 'upgrade' }], result: L('The melody lodges in your chest, bright and cold. Finn is going to lose his mind.', 'Melodi itu tersimpan di dadamu, terang dan dingin. Finn pasti bakal heboh.') },
      { label: L('Ask for a gift instead', 'Minta hadiah saja'), hint: L('Rare relic', 'Relik langka'), outcome: [{ type: 'flag', id: 'crystal_song' }, { type: 'relic', tier: 'rare' }], result: L('"Songs ARE gifts," the seer sighs — but hands you something shiny anyway.', '"Lagu ITU hadiah," desah sang peramal — tapi ia tetap memberimu sesuatu yang berkilau.') },
    ],
  },
  {
    id: 'ev_pips_map', minDepth: 2, maxDepth: 3, quest: 'sq_pip_treasure', onceFlag: 'pip_treasure',
    speaker: L('X Marks the Spot', 'Tanda Silang'), portrait: 'props:chest/chest_05/0',
    text: L('A chest sits exactly where Pip\'s greasy map said it would, under a painted X. Suspiciously exactly.', 'Sebuah peti berada tepat di tempat yang ditunjuk peta Pip yang berminyak, di bawah tanda X. Terlalu tepat, mencurigakan.'),
    choices: [
      { label: L('Open it', 'Buka'), chance: 0.7, outcome: [{ type: 'flag', id: 'pip_treasure' }, { type: 'gold', v: 150 }, { type: 'item', rarity: 3 }], fail: [{ type: 'flag', id: 'pip_treasure' }, { type: 'fight', elite: true }, { type: 'gold', v: 100 }], result: L('Gold, and something wrapped in silk. Pip was telling the truth. For once.', 'Emas, dan sesuatu yang dibungkus sutra. Pip berkata jujur. Untuk sekali ini.'), failResult: L('The chest grows teeth. So Pip DID leave something out of the story.', 'Peti itu menumbuhkan gigi. Jadi Pip MEMANG menyembunyikan sebagian ceritanya.') },
      { label: L('Kick it first', 'Tendang dulu'), outcome: [{ type: 'flag', id: 'pip_treasure' }, { type: 'gold', v: 90 }], result: L('It squeaks, coughs up a pile of gold and scuttles away. A very ticklish mimic.', 'Ia mencicit, memuntahkan setumpuk emas, lalu kabur. Mimik yang sangat geli.') },
    ],
  },
  {
    id: 'ev_nyx_echo', minDepth: 4, maxDepth: 5, quest: 'sq_nyx_mask', onceFlag: 'nyx_echo',
    speaker: L('A Familiar Shadow', 'Bayangan yang Dikenal'), portrait: 'portraits_nyx',
    text: L('A hooded figure waits by the path — Nyx, or something wearing Nyx\'s shape. "You want to know who I am. I was the third apprentice, keeper. The one Maren never wrote about."', 'Sosok bertudung menunggu di tepi jalan — Nyx, atau sesuatu yang memakai wujud Nyx. "Kau ingin tahu siapa aku. Aku murid ketiga, penjaga. Yang tak pernah ditulis Maren."'),
    choices: [
      { label: L('Ask why', 'Tanyakan alasannya'), hint: L('Memory Shard', 'Serpihan Memori'), outcome: [{ type: 'flag', id: 'nyx_echo' }, { type: 'lore', id: 'lore_nyx' }, { type: 'shard' }], result: L('"Because I left before the story began. I have been paying for that ever since." The shadow thins into mist.', '"Karena aku pergi sebelum ceritanya dimulai. Aku terus membayarnya sejak itu." Bayangan itu menipis menjadi kabut.') },
      { label: L('Draw your blade', 'Hunus pedangmu'), hint: L('Elite fight', 'Lawan elite'), outcome: [{ type: 'flag', id: 'nyx_echo' }, { type: 'lore', id: 'lore_nyx' }, { type: 'fight', elite: true }, { type: 'relic', tier: 'rare' }], result: L('"Of course," Nyx sighs. "The Lantern always did make its keepers brave."', '"Tentu saja," desah Nyx. "Lentera selalu membuat penjaganya berani."') },
    ],
  },

  // ------------------------------------------------------------ Depths 3-5
  {
    id: 'ev_sand_oracle', minDepth: 3, maxDepth: 4, speaker: L('Veiled Oracle', 'Peramal Bercadar'), portrait: 'portraits_ev_oracle',
    text: L('A veiled oracle sits cross-legged on the burning ground, untouched by the heat. "I see three roads in you, keeper. Pay the toll for one."', 'Seorang peramal bercadar duduk bersila di tanah yang membara, tak tersentuh panas. "Aku melihat tiga jalan dalam dirimu, penjaga. Bayarlah tol untuk salah satunya."'),
    choices: [
      { label: L('The road of fortune (70 gold)', 'Jalan keberuntungan (70 emas)'), cost: { gold: 70 }, outcome: [{ type: 'relic', tier: 'rare' }], result: L('She presses something warm into your palm. "Spend it wisely. Or don\'t. The road is yours."', 'Ia meletakkan sesuatu yang hangat di telapak tanganmu. "Gunakan dengan bijak. Atau tidak. Jalan itu milikmu."') },
      { label: L('The road of power (blood)', 'Jalan kekuatan (darah)'), cost: { hpPct: 20 }, outcome: [{ type: 'boon' }, { type: 'boon' }], result: L('Two spirits circle you like hawks, then settle on your shoulders.', 'Dua roh mengitarimu seperti elang, lalu hinggap di bahumu.') },
      { label: L('The road of rest', 'Jalan istirahat'), outcome: [{ type: 'hp', v: 35 }, { type: 'flask', v: 1 }], result: L('She seems pleased you chose it. "Few do. Fewer live long enough to regret not choosing it."', 'Ia tampak senang kau memilihnya. "Sedikit yang memilihnya. Lebih sedikit lagi yang hidup cukup lama untuk menyesal tidak memilihnya."') },
    ],
  },
  {
    id: 'ev_mirage_market', minDepth: 3, maxDepth: 5, speaker: L('Mirage Merchant', 'Pedagang Fatamorgana'), portrait: 'portraits_ev_sand_merchant',
    text: L('A merchant shimmers in the heat haze, his stall wavering like a dream. "Real goods! Mostly real! Sixty gold a bundle, no refunds!"', 'Seorang pedagang berkilau dalam kabut panas, kiosnya bergoyang seperti mimpi. "Barang asli! Kebanyakan asli! Enam puluh emas sebungkus, tanpa pengembalian!"'),
    choices: [
      { label: L('Buy a bundle (60 gold)', 'Beli sebungkus (60 emas)'), cost: { gold: 60 }, chance: 0.65, outcome: [{ type: 'item', rarity: 3 }], fail: [{ type: 'gold', v: 10 }], result: L('The bundle is heavy and very real. The merchant looks almost surprised.', 'Bungkusan itu berat dan sangat nyata. Si pedagang tampak nyaris terkejut.'), failResult: L('A bag of sand and one coin. "No refunds!" he calls, and vanishes.', 'Sekantong pasir dan satu koin. "Tanpa pengembalian!" serunya, lalu menghilang.') },
      { label: L('Haggle', 'Tawar-menawar'), chance: 0.5, outcome: [{ type: 'item', rarity: 2 }], fail: [{ type: 'fight' }], result: L('He throws up his hands. "You rob me! Take it!"', 'Ia mengangkat tangan. "Kau merampokku! Ambil saja!"'), failResult: L('"Haggle with THEM," he says, and his mirage guards turn solid.', '"Tawar-menawar dengan MEREKA," katanya, dan penjaga fatamorgananya menjadi padat.') },
      { label: L('Ignore the mirage', 'Abaikan fatamorgana'), outcome: [], result: L('He fades with a wounded sniff.', 'Ia memudar sambil mendengus tersinggung.') },
    ],
  },
  {
    id: 'ev_frozen_knight', minDepth: 4, maxDepth: 5, speaker: L('Frozen Knight', 'Ksatria Beku'), portrait: 'portraits_ev_frozen_knight',
    text: L('A knight stands frozen mid-stride, eyes following you through the ice. His lips barely move: "Free me... and I will fight for you, once."', 'Seorang ksatria membeku di tengah langkah, matanya mengikutimu dari balik es. Bibirnya nyaris tak bergerak: "Bebaskan aku... dan aku akan bertarung untukmu, sekali."'),
    choices: [
      { label: L('Melt the ice', 'Cairkan esnya'), cost: { hpPct: 15 }, outcome: [{ type: 'boon' }, { type: 'item', rarity: 3 }], result: L('He staggers free, presses his sword into your hands and walks into the dark to finish his last fight.', 'Ia terhuyung bebas, menyerahkan pedangnya ke tanganmu, lalu berjalan ke dalam gelap untuk menuntaskan pertarungan terakhirnya.') },
      { label: L('Share your warmth', 'Bagikan kehangatanmu'), hint: L('+10 Max HP', '+10 HP Maks'), outcome: [{ type: 'maxhp', v: 10 }], result: L('You press your palm to the ice until it hurts. He smiles. Something of his resolve stays with you.', 'Kau menempelkan telapak tangan pada es sampai terasa sakit. Ia tersenyum. Sebagian tekadnya tinggal bersamamu.') },
      { label: L('Walk past', 'Lewati saja'), outcome: [], result: L('His eyes follow you until the corridor bends.', 'Matanya mengikutimu sampai lorong berbelok.') },
    ],
  },
  {
    id: 'ev_star_altar', minDepth: 4, maxDepth: 5, speaker: L('Altar of Stars', 'Altar Bintang'), portrait: 'props:crystal/cristal_20/0',
    text: L('An altar of black glass catches starlight that should never reach this deep. Carved words read: TAKE A STAR. GIVE A LIFE.', 'Altar kaca hitam menangkap cahaya bintang yang seharusnya tak pernah mencapai kedalaman ini. Ukirannya berbunyi: AMBIL SEBUAH BINTANG. BERIKAN SEBUAH NYAWA.'),
    choices: [
      { label: L('Take a star', 'Ambil sebuah bintang'), hint: L('Epic relic, -15 Max HP', 'Relik epik, -15 HP Maks'), outcome: [{ type: 'relic', tier: 'epic' }, { type: 'maxhp', v: -15 }], result: L('It burns cold in your hand. Your heart beats a little slower.', 'Ia membakar dingin di tanganmu. Jantungmu berdetak sedikit lebih lambat.') },
      { label: L('Offer a prayer', 'Panjatkan doa'), outcome: [{ type: 'hp', v: 50 }], result: L('The starlight rests on you like snow that does not melt.', 'Cahaya bintang itu menyelimutimu seperti salju yang tak mencair.') },
    ],
  },
  {
    id: 'ev_throne_whisper', minDepth: 5, speaker: L('A Voice in the Dark', 'Suara dalam Gelap'), portrait: 'battlers:b/BlackMagusA',
    text: L('The Hollow King\'s voice fills the corridor, gentle as a father\'s. "Stop here, child. Stay. The night is so much kinder than you think."', 'Suara Raja Hampa memenuhi lorong, lembut seperti suara seorang ayah. "Berhentilah di sini, nak. Tinggallah. Malam jauh lebih baik daripada yang kau kira."'),
    choices: [
      { label: L('Refuse him', 'Tolak dia'), hint: L('Gain a Boon', 'Dapat Anugerah'), outcome: [{ type: 'boon' }, { type: 'embers', v: 40 }], result: L('You keep walking. The voice sounds, for a moment, almost relieved.', 'Kau terus berjalan. Suara itu terdengar, sejenak, nyaris lega.') },
      { label: L('Listen a while', 'Dengarkan sebentar'), hint: L('Cursed relic', 'Relik terkutuk'), outcome: [{ type: 'relic', tier: 'cursed' }, { type: 'hp', v: 60 }], result: L('His words wrap around you like a blanket. When you shake them off, something in your pack is heavier.', 'Kata-katanya membungkusmu seperti selimut. Saat kau menepisnya, sesuatu di tasmu terasa lebih berat.') },
    ],
  },
  {
    id: 'ev_ember_vein', minDepth: 3, speaker: L('Ember Vein', 'Urat Bara'), portrait: 'props:crystal/cristal_0/0',
    text: L('A vein of raw ember runs through the rock, pulsing like a heartbeat. Mining it would be slow, hot work.', 'Urat bara mentah membentang di batuan, berdenyut seperti detak jantung. Menambangnya akan jadi pekerjaan yang lambat dan panas.'),
    choices: [
      { label: L('Mine it', 'Tambang'), cost: { hpPct: 12 }, outcome: [{ type: 'embers', v: 60 }, { type: 'material', id: 'magma_core', n: 1 }], result: L('Your hands blister. Your pack glows.', 'Tanganmu melepuh. Tasmu berpendar.') },
      { label: L('Leave it be', 'Biarkan'), outcome: [], result: L('Some fires are better left burning.', 'Beberapa api lebih baik dibiarkan menyala.') },
    ],
  },
  {
    id: 'ev_lost_scout', minDepth: 2, maxDepth: 4, speaker: L('Lost Scout', 'Pengintai yang Tersesat'), portrait: 'actors:arpg12/walk/down/1',
    text: L('A scout from Emberhollow\'s guard, lost for days, clutches a crumpled map. "Dorran sent us down after you. The others... didn\'t make it. Help me get home?"', 'Seorang pengintai penjaga Emberhollow, tersesat berhari-hari, menggenggam peta yang kusut. "Dorran mengirim kami turun menyusulmu. Yang lain... tidak selamat. Bantu aku pulang?"'),
    choices: [
      { label: L('Share your supplies', 'Bagikan perbekalanmu'), hint: L('-1 Flask, embers', '-1 Ramuan, bara'), outcome: [{ type: 'flask', v: -1 }, { type: 'embers', v: 60 }, { type: 'boon' }], result: L('He squeezes your hand. "I\'ll tell the Captain you\'re a keeper worth following."', 'Ia meremas tanganmu. "Akan kukatakan pada Kapten bahwa kau penjaga yang layak diikuti."') },
      { label: L('Trade for his map', 'Tukar dengan petanya'), outcome: [{ type: 'gold', v: 45 }, { type: 'hp', v: 15 }], result: L('The map marks a cache of supplies he never reached. You reach it for him.', 'Peta itu menandai simpanan perbekalan yang tak sempat ia capai. Kau mencapainya untuknya.') },
    ],
  },
  {
    id: 'ev_rival_bard', minDepth: 1, maxDepth: 3, speaker: L('Lysander the Bard', 'Lysander sang Penyair'), portrait: 'portraits_ev_rival_bard',
    text: L('"Finn\'s friend, are you? I\'m Lysander — the BETTER bard. A song duel? Thirty gold says I win."', '"Teman Finn, ya? Aku Lysander — penyair yang LEBIH HEBAT. Duel lagu? Tiga puluh emas bilang aku menang."'),
    choices: [
      { label: L('Duel him (30 gold)', 'Duel (30 emas)'), cost: { gold: 30 }, chance: 0.5, outcome: [{ type: 'gold', v: 90 }, { type: 'upgrade' }], fail: [], result: L('Your off-key ballad somehow brings the monsters in the walls to tears. Lysander pays up, stunned.', 'Baladamu yang sumbang entah bagaimana membuat monster di dinding menangis. Lysander membayar, tercengang.'), failResult: L('Lysander bows to an audience of zero. "Magnificent! Tell Finn I said hello."', 'Lysander membungkuk pada penonton yang kosong. "Luar biasa! Sampaikan salamku pada Finn."') },
      { label: L('Tell him Finn is better', 'Bilang Finn lebih hebat'), hint: L('Fight', 'Bertarung'), outcome: [{ type: 'fight' }, { type: 'gold', v: 40 }], result: L('"HOW DARE YOU." He hurls his lute — and his friends — at you.', '"BERANINYA KAU." Ia melempar kecapinya — dan teman-temannya — ke arahmu.') },
      { label: L('Just listen', 'Dengarkan saja'), outcome: [{ type: 'hp', v: 25 }], result: L('He is annoyingly good. Your wounds ache a little less.', 'Ia menjengkelkan karena memang bagus. Lukamu sedikit berkurang sakitnya.') },
    ],
  },

  // ------------------------------------------------------------ Region: Emberforge Caverns
  {
    id: 'ev_lava_crossing', minDepth: 3, maxDepth: 3, region: 'forge', speaker: L('Island of Treasure', 'Pulau Harta'), portrait: 'props:fire/fire_02/0',
    text: L('A chest sits on an island in a lake of lava, reachable only by a row of cooling stones that sink as you step on them.', 'Sebuah peti berada di pulau di tengah danau lava, hanya bisa dicapai lewat deretan batu yang mendingin dan tenggelam saat kau menginjaknya.'),
    choices: [
      { label: L('Run across', 'Lari menyeberang'), cost: { hpPct: 20 }, outcome: [{ type: 'item', rarity: 3 }], result: L('Your boots smoke. The chest is worth it.', 'Sepatumu berasap. Isi petinya sepadan.') },
      { label: L('Hook it with your blade', 'Kait dengan pedangmu'), chance: 0.5, outcome: [{ type: 'item', rarity: 2 }, { type: 'gold', v: 30 }], fail: [], result: L('A perfect catch. The lava burps in disappointment.', 'Tangkapan sempurna. Lava bersendawa kecewa.'), failResult: L('The chest tips into the lava. The lava burps, satisfied.', 'Peti itu terguling ke lava. Lava bersendawa, puas.') },
      { label: L('Walk away', 'Pergi'), outcome: [], result: L('Not today, lava.', 'Tidak hari ini, lava.') },
    ],
  },
  {
    id: 'ev_forge_bellows', minDepth: 3, maxDepth: 3, region: 'forge', speaker: L('Abandoned Forge', 'Tungku Terbengkalai'), portrait: 'props:fire/fire_01/0',
    text: L('An old bellows still breathes on its own, feeding a forge that glows white-hot. A half-finished blade rests on the anvil.', 'Sebuah ububan tua masih bernapas sendiri, mengipasi tungku yang membara putih. Sebilah pedang setengah jadi tergeletak di atas landasan.'),
    choices: [
      { label: L('Finish the blade', 'Selesaikan pedangnya'), outcome: [{ type: 'item', rarity: 3 }], result: L('You hammer until your arms shake. It is ugly. It is also the sharpest thing you have ever held.', 'Kau memalu sampai lenganmu gemetar. Ia jelek. Ia juga benda paling tajam yang pernah kau pegang.') },
      { label: L('Temper yourself in the heat', 'Tempa dirimu dalam panas'), cost: { hpPct: 15 }, outcome: [{ type: 'upgrade' }, { type: 'upgrade' }], result: L('It hurts the way lessons hurt. Two of your boons burn brighter.', 'Rasanya sakit seperti pelajaran yang menyakitkan. Dua anugerahmu menyala lebih terang.') },
    ],
  },

  // ------------------------------------------------------------ Region: Crystal Hollows
  {
    id: 'ev_geode_heart', minDepth: 4, maxDepth: 4, region: 'crystal', speaker: L('Humming Geode', 'Geode Berdengung'), portrait: 'props:crystal/cristal_3/0',
    text: L('A geode the size of a wagon hums with trapped light. Something inside is knocking.', 'Sebuah geode sebesar gerobak berdengung dengan cahaya yang terperangkap. Sesuatu di dalamnya mengetuk.'),
    choices: [
      { label: L('Crack it open', 'Pecahkan'), chance: 0.6, outcome: [{ type: 'material', id: 'frost_crystal', n: 3 }, { type: 'relic', tier: 'rare' }], fail: [{ type: 'fight', elite: true }], result: L('Light pours out like water. Inside: crystals, and a relic humming the same note.', 'Cahaya mengalir keluar seperti air. Di dalamnya: kristal, dan sebuah relik yang mendengungkan nada yang sama.'), failResult: L('Whatever was knocking was not asking to be let out. It was warning you.', 'Apa pun yang mengetuk itu bukan minta dikeluarkan. Ia sedang memperingatkanmu.') },
      { label: L('Knock back', 'Balas mengetuk'), hint: L('Memory Shard', 'Serpihan Memori'), outcome: [{ type: 'shard' }], result: L('Three short, three long. A memory shard slides out of a crack, as if in answer.', 'Tiga pendek, tiga panjang. Sebuah serpihan memori meluncur keluar dari celah, seolah menjawab.') },
    ],
  },
  {
    id: 'ev_crystal_mirror', minDepth: 4, maxDepth: 4, region: 'crystal', speaker: L('Crystal Mirror', 'Cermin Kristal'), portrait: 'props:crystal/cristal_12/0',
    text: L('A mirror of pure crystal shows you — older, tired, carrying a lantern that has gone out. Your reflection holds out a hand, asking for something.', 'Cermin kristal murni memperlihatkan dirimu — lebih tua, lelah, membawa lentera yang telah padam. Bayanganmu mengulurkan tangan, meminta sesuatu.'),
    choices: [
      { label: L('Give it your flask', 'Berikan ramuanmu'), hint: L('-1 Flask, two Boons', '-1 Ramuan, dua Anugerah'), outcome: [{ type: 'flask', v: -1 }, { type: 'boon' }, { type: 'boon' }], result: L('The reflection drinks, and its lantern relights. Yours burns brighter too.', 'Bayangan itu minum, dan lenteranya menyala kembali. Lenteramu juga menyala lebih terang.') },
      { label: L('Shatter the mirror', 'Hancurkan cerminnya'), hint: L('Fight', 'Bertarung'), outcome: [{ type: 'relic', tier: 'common' }, { type: 'fight' }], result: L('A thousand tired faces scatter across the floor — and some of them get up.', 'Seribu wajah lelah berserakan di lantai — dan beberapa di antaranya bangkit.') },
    ],
  },

  // ------------------------------------------------------------ Region: Drowned Catacombs
  {
    id: 'ev_drowned_choir', minDepth: 2, maxDepth: 2, region: 'drowned', speaker: L('Drowned Choir', 'Paduan Suara Tenggelam'), portrait: 'portraits_ev_choir_ghost',
    text: L('Ghostly choristers stand knee-deep in the water, singing a hymn without words. They part to let you pass — if you pay the toll of a verse.', 'Para penyanyi hantu berdiri setinggi lutut di air, menyanyikan himne tanpa kata. Mereka menyingkir untuk membiarkanmu lewat — jika kau membayar tol berupa satu bait.'),
    choices: [
      { label: L('Sing along', 'Ikut bernyanyi'), hint: L('Gain a Boon', 'Dapat Anugerah'), outcome: [{ type: 'boon' }], result: L('Your voice cracks on the high note. They sing louder, kindly, to cover it.', 'Suaramu pecah di nada tinggi. Mereka bernyanyi lebih keras, dengan baik hati, untuk menutupinya.') },
      { label: L('Listen in silence', 'Dengarkan dalam diam'), outcome: [{ type: 'hp', v: 40 }], result: L('The hymn washes your wounds like cool water.', 'Himne itu membasuh lukamu seperti air sejuk.') },
    ],
  },
  {
    id: 'ev_sunken_chest', minDepth: 2, maxDepth: 2, region: 'drowned', speaker: L('Sunken Chest', 'Peti Tenggelam'), portrait: 'props:chest/chest_05/0',
    text: L('A chest glints at the bottom of a flooded crypt, weighed down by chains. The water is very, very cold.', 'Sebuah peti berkilau di dasar kripta yang banjir, tertindih rantai. Airnya sangat, sangat dingin.'),
    choices: [
      { label: L('Dive for it', 'Menyelam'), cost: { hpPct: 15 }, outcome: [{ type: 'item', rarity: 2 }, { type: 'gold', v: 60 }], result: L('You surface gasping, arms full. Worth every shiver.', 'Kau muncul terengah-engah, tangan penuh. Sepadan dengan setiap gigil.') },
      { label: L('Buy rope from a ghost (25 gold)', 'Beli tali dari hantu (25 emas)'), cost: { gold: 25 }, outcome: [{ type: 'item', rarity: 2 }], result: L('The ghost takes your coins and hands you a rope made of old regrets. It holds.', 'Hantu itu mengambil koinmu dan memberimu tali dari penyesalan lama. Talinya kuat.') },
    ],
  },
];
