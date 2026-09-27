import type { L10n } from '@/core/i18n';
import type { RelicTier } from './relics';
import { EVENTS_EXPANSION } from './events2';

export type Outcome =
  | { type: 'gold'; v: number }
  | { type: 'hp'; v: number }
  | { type: 'maxhp'; v: number }
  | { type: 'boon' }
  | { type: 'upgrade' }
  | { type: 'relic'; tier: RelicTier }
  | { type: 'item'; rarity?: number }
  | { type: 'fight'; elite?: boolean }
  | { type: 'embers'; v: number }
  | { type: 'material'; id: string; n: number }
  | { type: 'shard' }
  | { type: 'lore'; id: string }
  | { type: 'flask'; v: number }
  | { type: 'flag'; id: string };

export interface EventChoice {
  label: L10n;
  hint?: L10n;
  cost?: { gold?: number; hpPct?: number };
  /** Optional gamble: chance of the good outcome; otherwise `fail` applies. */
  chance?: number;
  outcome: Outcome[];
  fail?: Outcome[];
  result: L10n;
  failResult?: L10n;
}

export interface EventDef {
  id: string;
  minDepth: number;
  maxDepth?: number;
  speaker: L10n;
  portrait: string;
  text: L10n;
  choices: EventChoice[];
  /** Quest-related events only appear while the flag is unset. */
  onceFlag?: string;
  /** Only in this region (biome id), e.g. 'forge'. */
  region?: string;
  /** Story event: appears (with priority) only while this quest is active. */
  quest?: string;
}

const L = (en: string, id: string): L10n => ({ en, id });

const BASE_EVENTS: EventDef[] = [
  {
    id: 'ev_wounded_knight', minDepth: 1, speaker: L('Wounded Knight', 'Ksatria Terluka'), portrait: 'actors:arpg4/walk/down/1',
    text: L('A knight in dented armor leans against the wall, clutching his side. "Keeper... I have no strength left. Take my blade — or share your flask?"', 'Seorang ksatria berzirah penyok bersandar di dinding sambil memegangi rusuknya. "Penjaga... tenagaku habis. Ambil pedangku — atau bagikan ramuanmu?"'),
    choices: [
      { label: L('Share your flask', 'Bagikan ramuanmu'), hint: L('-1 Flask, gain a Boon', '-1 Ramuan, dapat Anugerah'), outcome: [{ type: 'flask', v: -1 }, { type: 'boon' }], result: L('He drinks, and color returns to his face. "The spirits saw that." A warm light settles on you.', 'Ia minum, dan warna kembali ke wajahnya. "Para roh melihat itu." Cahaya hangat menyelimutimu.') },
      { label: L('Take his blade', 'Ambil pedangnya'), hint: L('Gain an item', 'Dapat item'), outcome: [{ type: 'item', rarity: 2 }], result: L('"Use it well," he whispers, and closes his eyes.', '"Gunakan dengan baik," bisiknya, lalu memejamkan mata.') },
      { label: L('Leave him be', 'Biarkan dia'), outcome: [], result: L('You walk on. His breathing fades behind you.', 'Kau terus berjalan. Napasnya memudar di belakangmu.') },
    ],
  },
  {
    id: 'ev_gambler', minDepth: 1, speaker: L('Grinning Imp', 'Imp Menyeringai'), portrait: 'monsters:bonus_0/down/1',
    text: L('An imp sits on an upturned crate, shuffling three cups. "One has a treasure! One has a surprise! One has... ME! Twenty gold to play!"', 'Seekor imp duduk di atas peti terbalik, mengocok tiga cangkir. "Satu berisi harta! Satu berisi kejutan! Satu berisi... AKU! Dua puluh emas untuk bermain!"'),
    choices: [
      { label: L('Play (20 gold)', 'Main (20 emas)'), cost: { gold: 20 }, chance: 0.5, outcome: [{ type: 'gold', v: 70 }], fail: [{ type: 'fight' }], result: L('The cup lifts to reveal a heap of coins. The imp sulks.', 'Cangkir terangkat memperlihatkan tumpukan koin. Imp itu merajuk.'), failResult: L('"ME!" The imp cackles — and its friends pour out of the shadows!', '"AKU!" Imp itu terkekeh — dan teman-temannya berhamburan dari bayangan!') },
      { label: L('Kick the table over', 'Tendang mejanya'), outcome: [{ type: 'fight' }, { type: 'gold', v: 30 }], result: L('Coins scatter everywhere. So do the imps — straight at you.', 'Koin berhamburan. Begitu juga para imp — langsung ke arahmu.') },
      { label: L('Walk away', 'Pergi'), outcome: [], result: L('"Boooring!" it shouts after you.', '"Membosankaaan!" teriaknya di belakangmu.') },
    ],
  },
  {
    id: 'ev_spirit_well', minDepth: 1, speaker: L('Spirit Well', 'Sumur Roh'), portrait: 'props:crystal/cristal_3/0',
    text: L('Silver water glows in an ancient well. Whispers rise from its depths: "Give, and receive."', 'Air perak berpendar di sumur kuno. Bisikan naik dari kedalamannya: "Berikan, maka kau menerima."'),
    choices: [
      { label: L('Offer blood', 'Persembahkan darah'), cost: { hpPct: 20 }, outcome: [{ type: 'boon' }, { type: 'boon' }], result: L('The water drinks your blood. Two spirits answer.', 'Air meminum darahmu. Dua roh menjawab.') },
      { label: L('Offer gold (40)', 'Persembahkan emas (40)'), cost: { gold: 40 }, outcome: [{ type: 'upgrade' }], result: L('The coins sink without a sound. One of your boons burns brighter.', 'Koin tenggelam tanpa suara. Salah satu anugerahmu menyala lebih terang.') },
      { label: L('Drink', 'Minum'), outcome: [{ type: 'hp', v: 40 }], result: L('Cold and sweet. Your wounds close.', 'Dingin dan manis. Lukamu menutup.') },
    ],
  },
  {
    id: 'ev_lost_cat', minDepth: 1, maxDepth: 2, onceFlag: 'cat_found', speaker: L('A Small Cat', 'Seekor Kucing Kecil'), portrait: 'actors:cat2/walk/down/1',
    text: L('A ginger cat with a tiny bell on its collar mews at you from a ledge. It looks very lost — and very much like the cat Wren described.', 'Seekor kucing jingga dengan lonceng kecil di kalungnya mengeong dari tepian batu. Ia tampak sangat tersesat — dan sangat mirip kucing yang digambarkan Wren.'),
    choices: [
      { label: L('Coax it down', 'Bujuk ia turun'), outcome: [{ type: 'material', id: 'q_cat_bell', n: 1 }, { type: 'flag', id: 'cat_found' }], result: L('It leaps into your arms, purring. You tuck its bell into your pack — Wren will want to know Biscuit is safe. The cat slips away toward the surface.', 'Ia melompat ke pelukanmu sambil mendengkur. Kau menyimpan loncengnya — Wren pasti ingin tahu Biscuit selamat. Kucing itu menyelinap ke arah permukaan.') },
      { label: L('Leave it', 'Tinggalkan'), outcome: [], result: L('It watches you go with enormous, betrayed eyes.', 'Ia menatapmu pergi dengan mata besar yang merasa dikhianati.') },
    ],
  },
  {
    id: 'ev_merchant_ghost', minDepth: 2, speaker: L('Ghostly Peddler', 'Pedagang Hantu'), portrait: 'monsters:m02_5/down/1',
    text: L('"Wares for the living, prices for the dead!" A translucent merchant opens a coat lined with glowing trinkets.', '"Barang untuk yang hidup, harga untuk yang mati!" Seorang pedagang tembus pandang membuka mantel berisi pernak-pernik bercahaya.'),
    choices: [
      { label: L('Buy a relic (60 gold)', 'Beli relik (60 emas)'), cost: { gold: 60 }, outcome: [{ type: 'relic', tier: 'rare' }], result: L('"A fine choice. Its last owner certainly thought so."', '"Pilihan bagus. Pemilik sebelumnya juga berpikir begitu."') },
      { label: L('Trade life for power', 'Tukar nyawa dengan kekuatan'), cost: { hpPct: 25 }, outcome: [{ type: 'relic', tier: 'epic' }], result: L('The ghost smiles with too many teeth. "Pleasure doing business."', 'Hantu itu tersenyum dengan terlalu banyak gigi. "Senang berbisnis denganmu."') },
      { label: L('Decline', 'Tolak'), outcome: [], result: L('"Another time, then. I have plenty of time."', '"Lain kali, kalau begitu. Waktuku banyak."') },
    ],
  },
  {
    id: 'ev_brom_hammer', minDepth: 2, maxDepth: 2, onceFlag: 'hammer_found', speaker: L('Collapsed Forge', 'Tungku Runtuh'), portrait: 'props:p/barrel_02',
    text: L('Beneath the rubble of an old crypt-forge, something gleams: a heavy hammer stamped with the mark of Brom\'s family.', 'Di bawah reruntuhan tungku kripta tua, sesuatu berkilau: palu berat yang dicap lambang keluarga Brom.'),
    choices: [
      { label: L('Dig it out', 'Gali keluar'), cost: { hpPct: 10 }, outcome: [{ type: 'material', id: 'q_brom_hammer', n: 1 }, { type: 'flag', id: 'hammer_found' }], result: L('Stone scrapes your hands, but the hammer comes free. Brom will weep.', 'Batu menggores tanganmu, tapi palu itu terlepas. Brom pasti menangis.') },
      { label: L('Leave it buried', 'Biarkan terkubur'), outcome: [], result: L('Some things are too heavy to carry today.', 'Beberapa hal terlalu berat untuk dibawa hari ini.') },
    ],
  },
  {
    id: 'ev_song_sheet', minDepth: 1, speaker: L('Fluttering Page', 'Halaman Berkibar'), portrait: 'props:p/book_02',
    text: L('A page of sheet music dances on an impossible breeze, humming faintly. Finn would love this.', 'Selembar partitur menari tertiup angin yang mustahil, bersenandung pelan. Finn pasti suka ini.'),
    choices: [
      { label: L('Catch it', 'Tangkap'), outcome: [{ type: 'material', id: 'q_song_sheet', n: 1 }], result: L('The melody settles into your pack. Somehow, you feel braver.', 'Melodi itu masuk ke tasmu. Entah kenapa, kau merasa lebih berani.') },
      { label: L('Listen', 'Dengarkan'), outcome: [{ type: 'hp', v: 20 }], result: L('You close your eyes. For a moment, you are home.', 'Kau memejamkan mata. Sesaat, kau berada di rumah.') },
    ],
  },
  {
    id: 'ev_old_letter', minDepth: 1, speaker: L('Keeper\'s Satchel', 'Tas Penjaga'), portrait: 'props:p/book_05',
    text: L('A rotted satchel lies beside a Lanternkeeper\'s broken lamp. Inside: a sealed letter, still dry.', 'Sebuah tas lapuk tergeletak di samping lampu Penjaga Lentera yang pecah. Di dalamnya: surat bersegel, masih kering.'),
    choices: [
      { label: L('Take the letter', 'Ambil surat'), outcome: [{ type: 'material', id: 'q_letter', n: 1 }, { type: 'shard' }], result: L('The seal bears Maren\'s mark. A memory flickers — not yours.', 'Segelnya bertanda Maren. Sebuah ingatan berkelebat — bukan milikmu.') },
      { label: L('Take the lamp oil', 'Ambil minyak lampu'), outcome: [{ type: 'embers', v: 25 }], result: L('The oil still smolders with ember-light.', 'Minyaknya masih membara dengan cahaya bara.') },
    ],
  },
  {
    id: 'ev_shrine_dark', minDepth: 2, speaker: L('Shrine of Nox', 'Kuil Nox'), portrait: 'props:p/statue_02',
    text: L('A statue with no face holds out an empty hand. The air smells of iron.', 'Sebuah patung tanpa wajah mengulurkan tangan kosong. Udara berbau besi.'),
    choices: [
      { label: L('Clasp its hand', 'Genggam tangannya'), chance: 0.6, outcome: [{ type: 'relic', tier: 'epic' }], fail: [{ type: 'relic', tier: 'cursed' }], result: L('Power floods your arm.', 'Kekuatan membanjiri lenganmu.'), failResult: L('It does not let go. Something follows you now.', 'Ia tak melepaskanmu. Sesuatu kini mengikutimu.') },
      { label: L('Pray', 'Berdoa'), outcome: [{ type: 'boon' }], result: L('The shadows lean closer, listening.', 'Bayangan-bayangan mendekat, mendengarkan.') },
      { label: L('Smash it', 'Hancurkan'), outcome: [{ type: 'fight', elite: true }, { type: 'embers', v: 40 }], result: L('The statue screams. Its guardians wake.', 'Patung itu menjerit. Para penjaganya terbangun.') },
    ],
  },
  {
    id: 'ev_alchemist_cache', minDepth: 1, speaker: L('Alchemist\'s Cache', 'Simpanan Alkemis'), portrait: 'props:p/pot_10',
    text: L('Three unlabeled bottles sit in a hidden alcove: red, blue, and a green that bubbles on its own.', 'Tiga botol tanpa label di ceruk tersembunyi: merah, biru, dan hijau yang menggelegak sendiri.'),
    choices: [
      { label: L('Drink the red', 'Minum yang merah'), outcome: [{ type: 'maxhp', v: 15 }], result: L('Your heart beats stronger.', 'Jantungmu berdetak lebih kuat.') },
      { label: L('Drink the blue', 'Minum yang biru'), outcome: [{ type: 'flask', v: 1 }], result: L('Your flask refills itself. Neat.', 'Ramuanmu terisi sendiri. Keren.') },
      { label: L('Drink the green', 'Minum yang hijau'), chance: 0.5, outcome: [{ type: 'boon' }, { type: 'boon' }], fail: [{ type: 'hp', v: -30 }], result: L('It tastes like lightning and pine. Wonderful.', 'Rasanya seperti petir dan pinus. Luar biasa.'), failResult: L('It tastes like regret. Your stomach agrees.', 'Rasanya seperti penyesalan. Perutmu setuju.') },
    ],
  },
  {
    id: 'ev_trapped_chest', minDepth: 1, speaker: L('Suspicious Chest', 'Peti Mencurigakan'), portrait: 'props:chest/chest_05/0',
    text: L('A chest sits in the open. Too open. Scratch marks surround it.', 'Sebuah peti tergeletak di tempat terbuka. Terlalu terbuka. Bekas cakaran mengelilinginya.'),
    choices: [
      { label: L('Open it', 'Buka'), chance: 0.55, outcome: [{ type: 'item', rarity: 3 }, { type: 'gold', v: 40 }], fail: [{ type: 'fight' }], result: L('Treasure! Real treasure!', 'Harta! Harta sungguhan!'), failResult: L('The chest has teeth. So do its friends.', 'Peti itu bergigi. Begitu juga teman-temannya.') },
      { label: L('Poke it with a stick', 'Colek dengan tongkat'), outcome: [{ type: 'gold', v: 20 }], result: L('Nothing happens. You take a few coins off the lid and leave.', 'Tak terjadi apa-apa. Kau mengambil beberapa koin dari tutupnya dan pergi.') },
    ],
  },
  {
    id: 'ev_fallen_keeper', minDepth: 3, speaker: L('Fading Lanternkeeper', 'Penjaga Lentera yang Memudar'), portrait: 'actors:arpg27/walk/down/1',
    text: L('A keeper\'s ghost kneels by a dead lantern. "Maren sent me too, long ago. I failed. Will you carry my light?"', 'Arwah seorang penjaga berlutut di samping lentera mati. "Maren juga mengutusku, dulu sekali. Aku gagal. Maukah kau membawa cahayaku?"'),
    choices: [
      { label: L('Carry it', 'Bawa cahayanya'), outcome: [{ type: 'shard' }, { type: 'upgrade' }, { type: 'upgrade' }], result: L('Her light joins yours. Two memories, one flame.', 'Cahayanya menyatu dengan milikmu. Dua ingatan, satu nyala.') },
      { label: L('Ask about Malachar', 'Tanya tentang Malachar'), outcome: [{ type: 'lore', id: 'lore_malachar_student' }, { type: 'shard' }], result: L('"He was her best student. Her son, in all but blood."', '"Dia murid terbaiknya. Anaknya, kecuali darah."') },
    ],
  },
  {
    id: 'ev_mirror', minDepth: 2, speaker: L('Silver Mirror', 'Cermin Perak'), portrait: 'props:crystal/cristal_12/0',
    text: L('Your reflection in the mirror is smiling. You are not.', 'Pantulanmu di cermin tersenyum. Kau tidak.'),
    choices: [
      { label: L('Smile back', 'Balas tersenyum'), outcome: [{ type: 'boon' }], result: L('It winks, and something of it stays with you.', 'Ia mengedipkan mata, dan sesuatu darinya tinggal bersamamu.') },
      { label: L('Shatter it', 'Pecahkan'), outcome: [{ type: 'hp', v: -15 }, { type: 'relic', tier: 'rare' }], result: L('Shards cut your hand. Among them, a relic glows.', 'Pecahan melukai tanganmu. Di antaranya, sebuah relik bercahaya.') },
      { label: L('Look away', 'Palingkan wajah'), outcome: [], result: L('Behind you, glass laughs softly.', 'Di belakangmu, kaca tertawa pelan.') },
    ],
  },
  {
    id: 'ev_pilgrim', minDepth: 1, speaker: L('Lost Pilgrim', 'Peziarah Tersesat'), portrait: 'actors:npc3/walk/down/1',
    text: L('An old pilgrim offers you a charm. "For the road. The Lantern kept my village safe once. I remember."', 'Seorang peziarah tua menawarkan jimat. "Untuk perjalanan. Lentera pernah menjaga desaku. Aku ingat."'),
    choices: [
      { label: L('Accept', 'Terima'), outcome: [{ type: 'relic', tier: 'common' }], result: L('"Walk in light, keeper."', '"Berjalanlah dalam cahaya, penjaga."') },
      { label: L('Give him gold (25)', 'Beri emas (25)'), cost: { gold: 25 }, outcome: [{ type: 'embers', v: 40 }, { type: 'hp', v: 25 }], result: L('He blesses you with a trembling hand. You feel lighter.', 'Ia memberkatimu dengan tangan gemetar. Kau merasa lebih ringan.') },
    ],
  },
  {
    id: 'ev_forge_spirit', minDepth: 2, speaker: L('Forge Spirit', 'Roh Tempa'), portrait: 'props:fire/fire_01/0',
    text: L('A living flame dances over an anvil. "Metal! Give me metal and I will make it SING!"', 'Nyala api hidup menari di atas landasan. "Logam! Beri aku logam dan akan kubuat ia BERNYANYI!"'),
    choices: [
      { label: L('Temper a boon (30 gold)', 'Tempa anugerah (30 emas)'), cost: { gold: 30 }, outcome: [{ type: 'upgrade' }, { type: 'upgrade' }], result: L('CLANG! CLANG! Your power rings true.', 'DENTANG! DENTANG! Kekuatanmu berdering nyaring.') },
      { label: L('Forge a weapon (50 gold)', 'Tempa senjata (50 emas)'), cost: { gold: 50 }, outcome: [{ type: 'item', rarity: 3 }], result: L('It hands you something still hissing.', 'Ia menyerahkan sesuatu yang masih berdesis.') },
      { label: L('Leave', 'Pergi'), outcome: [], result: L('"COWARD!" it crackles, fondly.', '"PENGECUT!" ia berderak, dengan sayang.') },
    ],
  },
  {
    id: 'ev_sleeping_giant', minDepth: 2, speaker: L('Sleeping Giant', 'Raksasa Tertidur'), portrait: 'monsters:m04_3/down/1',
    text: L('A huge beast snores on a pile of gold. Very, very loudly.', 'Seekor makhluk besar mendengkur di atas tumpukan emas. Sangat, sangat keras.'),
    choices: [
      { label: L('Sneak some gold', 'Curi sedikit emas'), chance: 0.65, outcome: [{ type: 'gold', v: 90 }], fail: [{ type: 'fight', elite: true }], result: L('Pockets full. It didn\'t even stir.', 'Kantong penuh. Ia bahkan tak bergerak.'), failResult: L('One coin drops. One eye opens.', 'Satu koin jatuh. Satu mata terbuka.') },
      { label: L('Fight it', 'Lawan'), outcome: [{ type: 'fight', elite: true }, { type: 'gold', v: 120 }, { type: 'item', rarity: 2 }], result: L('It wakes angry. Very angry.', 'Ia bangun dengan marah. Sangat marah.') },
      { label: L('Tiptoe past', 'Berjinjit lewat'), outcome: [], result: L('Discretion, valour, etcetera.', 'Kebijaksanaan adalah bagian dari keberanian.') },
    ],
  },
  {
    id: 'ev_herb_garden', minDepth: 1, speaker: L('Wild Garden', 'Kebun Liar'), portrait: 'props:plant/2/4',
    text: L('Impossible flowers bloom here without sunlight, fed by some old magic.', 'Bunga-bunga mustahil mekar di sini tanpa cahaya matahari, diberi makan sihir tua.'),
    choices: [
      { label: L('Gather seeds', 'Kumpulkan benih'), outcome: [{ type: 'material', id: 'seed_moonpetal', n: 2 }, { type: 'material', id: 'seed_sunroot', n: 1 }], result: L('Mira will be delighted.', 'Mira pasti senang.') },
      { label: L('Gather herbs', 'Kumpulkan herbal'), outcome: [{ type: 'material', id: 'moonpetal', n: 2 }, { type: 'hp', v: 15 }], result: L('You chew a petal. Sweet.', 'Kau mengunyah sehelai kelopak. Manis.') },
    ],
  },
  {
    id: 'ev_bone_dice', minDepth: 2, speaker: L('Skeleton Gambler', 'Penjudi Tengkorak'), portrait: 'monsters:m05_0/down/1',
    text: L('"Roll the bones, keeper! Win, and I give you my finest! Lose, and you give me... a finger. Kidding. Mostly."', '"Lempar tulangnya, penjaga! Menang, kuberi barang terbaikku! Kalah, kau beri aku... satu jari. Bercanda. Sebagian."'),
    choices: [
      { label: L('Roll', 'Lempar'), chance: 0.5, outcome: [{ type: 'relic', tier: 'rare' }, { type: 'gold', v: 30 }], fail: [{ type: 'hp', v: -25 }], result: L('"Sixes! Curse your luck!"', '"Enam! Sial, beruntung sekali kau!"'), failResult: L('"Snake eyes! Now hold still..."', '"Mata ular! Sekarang diam..."') },
      { label: L('Decline', 'Tolak'), outcome: [], result: L('"More bones for me."', '"Lebih banyak tulang untukku."') },
    ],
  },
  {
    id: 'ev_recipe', minDepth: 2, speaker: L('Burnt Cookbook', 'Buku Resep Hangus'), portrait: 'props:p/book_03',
    text: L('A half-burnt book of recipes. One page, carefully dog-eared, survives: "Grandmother Ysolde\'s Dawn Tonic".', 'Buku resep setengah hangus. Satu halaman yang ditandai hati-hati selamat: "Tonik Fajar Nenek Ysolde".'),
    choices: [
      { label: L('Take the page', 'Ambil halamannya'), outcome: [{ type: 'material', id: 'q_recipe', n: 1 }], result: L('Ysolde has been searching for this for years.', 'Ysolde telah mencari ini bertahun-tahun.') },
    ],
  },
  {
    id: 'ev_oath_stone', minDepth: 3, speaker: L('Oath Stone', 'Batu Sumpah'), portrait: 'props:p/rock_18',
    text: L('Words carved into black stone: "Swear to the night, and the night will fight for you."', 'Kata-kata terukir di batu hitam: "Bersumpahlah pada malam, dan malam akan bertarung untukmu."'),
    choices: [
      { label: L('Swear', 'Bersumpah'), outcome: [{ type: 'relic', tier: 'cursed' }, { type: 'embers', v: 80 }], result: L('The stone drinks your words. Power — and a price.', 'Batu itu meminum kata-katamu. Kekuatan — dan harganya.') },
      { label: L('Refuse', 'Menolak'), outcome: [{ type: 'hp', v: 20 }], result: L('The night seems a little less heavy.', 'Malam terasa sedikit lebih ringan.') },
    ],
  },
  {
    id: 'ev_djinn_whisper', minDepth: 3, maxDepth: 3, speaker: L('Voice in the Sand', 'Suara di Pasir'), portrait: 'portraits_ev_djinn',
    text: L('"Keeper... I am not your enemy. The Hollow King bound me with a promise he never kept. Break my chain, and I will not forget."', '"Penjaga... aku bukan musuhmu. Raja Hampa mengikatku dengan janji yang tak pernah ditepati. Putuskan rantaiku, dan aku tak akan lupa."'),
    choices: [
      { label: L('Promise to free him', 'Berjanji membebaskannya'), outcome: [{ type: 'flag', id: 'azhar_promise' }, { type: 'shard' }, { type: 'boon' }], result: L('The sand shifts, and the heat eases. A gift, for now.', 'Pasir bergeser, dan panas mereda. Sebuah hadiah, untuk sekarang.') },
      { label: L('Ignore it', 'Abaikan'), outcome: [], result: L('The voice sighs into the wind.', 'Suara itu mendesah bersama angin.') },
    ],
  },
  {
    id: 'ev_frozen_lovers', minDepth: 4, maxDepth: 4, speaker: L('Frozen Portrait', 'Potret Beku'), portrait: 'portraits_ev_frozen_lovers',
    text: L('A painting under the ice: a young woman and a young man in keeper\'s robes, laughing. The plaque reads "Vesper & Malachar".', 'Sebuah lukisan di bawah es: seorang wanita muda dan pria muda berjubah penjaga, tertawa. Plakatnya bertuliskan "Vesper & Malachar".'),
    choices: [
      { label: L('Thaw the painting', 'Cairkan lukisannya'), outcome: [{ type: 'lore', id: 'lore_vesper_love' }, { type: 'shard' }], result: L('As the ice melts, you hear laughter from very far away.', 'Saat es mencair, kau mendengar tawa dari tempat yang sangat jauh.') },
      { label: L('Pry the gilded frame', 'Congkel bingkai berlapis emas'), outcome: [{ type: 'gold', v: 80 }], result: L('The gold is real. The faces watch you leave.', 'Emasnya asli. Wajah-wajah itu menatapmu pergi.') },
    ],
  },
  {
    id: 'ev_hollow_throne_echo', minDepth: 5, speaker: L('Echo of Maren', 'Gema Maren'), portrait: 'portraits_maren',
    text: L('Maren\'s voice, from the dark: "Rowan. When you face him... remember he was a boy once, who was afraid of the dark."', 'Suara Maren, dari kegelapan: "Rowan. Saat kau menghadapinya... ingatlah dia pernah menjadi anak kecil, yang takut pada gelap."'),
    choices: [
      { label: L('"I will remember."', '"Aku akan ingat."'), outcome: [{ type: 'shard' }, { type: 'hp', v: 100 }], result: L('Warmth fills you, as it did when you were small.', 'Kehangatan memenuhimu, seperti saat kau masih kecil.') },
      { label: L('"He took you from me."', '"Dia merebutmu dariku."'), outcome: [{ type: 'boon' }, { type: 'boon' }], result: L('"Then carry my anger, too. But do not let it carry you."', '"Maka bawalah juga amarahku. Tapi jangan biarkan ia membawamu."') },
    ],
  },
  {
    id: 'ev_training_dummy', minDepth: 1, speaker: L('Abandoned Dummy', 'Boneka Latihan Terbengkalai'), portrait: 'actors:dummy/idle/down/0',
    text: L('A training dummy stands alone in the dark, covered in old sword marks. Someone trained here, once.', 'Boneka latihan berdiri sendirian di kegelapan, penuh bekas sayatan pedang lama. Seseorang pernah berlatih di sini.'),
    choices: [
      { label: L('Practice', 'Berlatih'), outcome: [{ type: 'upgrade' }], result: L('Old habits come back. Your technique sharpens.', 'Kebiasaan lama kembali. Tekniknya makin tajam.') },
      { label: L('Search it', 'Periksa'), outcome: [{ type: 'gold', v: 25 }, { type: 'embers', v: 10 }], result: L('Coins stuffed in the straw. Clever.', 'Koin disumpalkan di jerami. Cerdik.') },
    ],
  },
  {
    id: 'ev_crystal_cave', minDepth: 2, speaker: L('Singing Crystals', 'Kristal Bernyanyi'), portrait: 'props:crystal/cristal_20/0',
    text: L('Crystals hum in harmony. One of them is slightly out of tune.', 'Kristal-kristal bersenandung dalam harmoni. Salah satunya sedikit sumbang.'),
    choices: [
      { label: L('Tune it', 'Selaraskan'), outcome: [{ type: 'embers', v: 50 }], result: L('The chord resolves. Embers drift from the stone.', 'Nadanya selaras. Bara melayang dari batu.') },
      { label: L('Break off a shard', 'Patahkan sepotong'), outcome: [{ type: 'material', id: 'moonsteel', n: 1 }, { type: 'fight' }], result: L('The song turns to a shriek. Something answers.', 'Nyanyian berubah menjadi jeritan. Sesuatu menjawab.') },
    ],
  },
  {
    id: 'ev_two_doors', minDepth: 1, speaker: L('Two Doors', 'Dua Pintu'), portrait: 'props:door/door_3/0',
    text: L('Two doors. One is warm to the touch. One is ice cold. A voice says: "Only one."', 'Dua pintu. Satu terasa hangat. Satu dingin membeku. Sebuah suara berkata: "Hanya satu."'),
    choices: [
      { label: L('The warm door', 'Pintu hangat'), outcome: [{ type: 'boon' }], result: L('Fire curls around your shoulders like a friendly cat.', 'Api melingkari bahumu seperti kucing yang ramah.') },
      { label: L('The cold door', 'Pintu dingin'), outcome: [{ type: 'relic', tier: 'rare' }], result: L('Frost, and in the frost, a treasure.', 'Embun beku, dan di dalamnya, sebuah harta.') },
    ],
  },
  {
    id: 'ev_bounty_board', minDepth: 1, speaker: L('Hunter\'s Cache', 'Simpanan Pemburu'), portrait: 'actors:npc9/walk/down/1',
    text: L('A cache marked with Kael\'s sign: a crossed arrow. Inside, supplies — and a note: "Take what you need. Kill what you must."', 'Simpanan bertanda Kael: panah bersilang. Di dalamnya, perbekalan — dan catatan: "Ambil yang kau perlukan. Bunuh yang harus."'),
    choices: [
      { label: L('Take supplies', 'Ambil perbekalan'), outcome: [{ type: 'flask', v: 1 }, { type: 'gold', v: 20 }], result: L('Kael always packs the good stuff.', 'Kael selalu membawa barang bagus.') },
      { label: L('Take the hunting charm', 'Ambil jimat berburu'), outcome: [{ type: 'relic', tier: 'common' }], result: L('It smells of pine and old leather.', 'Baunya pinus dan kulit tua.') },
    ],
  },
  {
    id: 'ev_hungry_slime', minDepth: 1, maxDepth: 2, speaker: L('Hungry Slime', 'Lendir Lapar'), portrait: 'monsters:m01_4/down/1',
    text: L('A plump slime blocks the path. It looks at your gold pouch. It looks at you. It licks its... face?', 'Lendir gemuk menghalangi jalan. Ia menatap kantong emasmu. Menatapmu. Menjilat... wajahnya?'),
    choices: [
      { label: L('Feed it gold (30)', 'Beri makan emas (30)'), cost: { gold: 30 }, outcome: [{ type: 'item', rarity: 2 }], result: L('It burps up something shiny. Charming.', 'Ia bersendawa mengeluarkan sesuatu yang berkilau. Menawan.') },
      { label: L('Fight it', 'Lawan'), outcome: [{ type: 'fight' }, { type: 'material', id: 'slime_gel', n: 4 }], result: L('It was not alone. It is never alone.', 'Ia tidak sendirian. Ia tak pernah sendirian.') },
    ],
  },
  {
    id: 'ev_ember_altar', minDepth: 1, speaker: L('Ember Altar', 'Altar Bara'), portrait: 'props:fire/fire_02/0',
    text: L('An altar of the Lanternkeepers, still burning. You feel it recognize you.', 'Altar para Penjaga Lentera, masih menyala. Kau merasa altar itu mengenalimu.'),
    choices: [
      { label: L('Rest by the flame', 'Beristirahat di dekat api'), outcome: [{ type: 'hp', v: 50 }], result: L('Maren used to sing by a fire like this.', 'Maren dulu bernyanyi di dekat api seperti ini.') },
      { label: L('Feed it embers', 'Beri makan bara'), outcome: [{ type: 'upgrade' }, { type: 'embers', v: -20 }], result: L('The flame roars. So does your power.', 'Api mengaum. Begitu juga kekuatanmu.') },
    ],
  },
  {
    id: 'ev_masked_stranger', minDepth: 2, speaker: L('Masked Stranger', 'Orang Asing Bertopeng'), portrait: 'portraits_nyx',
    text: L('A hooded figure steps from the shadows. "The village sends you to die, over and over. Doesn\'t that make you angry?"', 'Sosok bertudung melangkah dari bayangan. "Desa mengirimmu untuk mati, lagi dan lagi. Tidakkah itu membuatmu marah?"'),
    choices: [
      { label: L('"It makes me stronger."', '"Itu membuatku lebih kuat."'), outcome: [{ type: 'upgrade' }, { type: 'shard' }], result: L('"...Good answer." The stranger vanishes.', '"...Jawaban bagus." Orang asing itu menghilang.') },
      { label: L('"Yes."', '"Ya."'), outcome: [{ type: 'relic', tier: 'cursed' }, { type: 'relic', tier: 'epic' }], result: L('"Then take this. Use your anger."', '"Kalau begitu ambil ini. Gunakan amarahmu."') },
    ],
  },
  {
    id: 'ev_lost_adventurers', minDepth: 2, speaker: L('Lost Adventurers', 'Petualang Tersesat'), portrait: 'actors:arpg12/walk/down/1',
    text: L('A trio of adventurers huddle around a guttering torch. "Keeper! Get us out and we\'ll pay!"', 'Tiga petualang berkerumun di sekitar obor yang hampir padam. "Penjaga! Bawa kami keluar dan kami akan membayar!"'),
    choices: [
      { label: L('Escort them', 'Kawal mereka'), outcome: [{ type: 'fight' }, { type: 'gold', v: 100 }, { type: 'embers', v: 20 }], result: L('Monsters follow the scent of fear. But you get them out.', 'Monster mengikuti bau ketakutan. Tapi kau berhasil mengeluarkan mereka.') },
      { label: L('Point the way', 'Tunjukkan jalan'), outcome: [{ type: 'gold', v: 30 }], result: L('They hurry off. One looks back, grateful.', 'Mereka bergegas pergi. Salah satunya menoleh, berterima kasih.') },
    ],
  },
  {
    id: 'ev_rune_puzzle', minDepth: 2, speaker: L('Rune Door', 'Pintu Rune'), portrait: 'props:switch/switch_02/down/0',
    text: L('A door with three runes: SUN, MOON, STAR. Scratched beneath: "The keeper walks by night."', 'Pintu dengan tiga rune: MATAHARI, BULAN, BINTANG. Tergores di bawahnya: "Penjaga berjalan di malam hari."'),
    choices: [
      { label: L('Press MOON', 'Tekan BULAN'), outcome: [{ type: 'item', rarity: 3 }, { type: 'embers', v: 30 }], result: L('Click. The door swings open onto a forgotten vault.', 'Klik. Pintu terbuka ke brankas yang terlupakan.') },
      { label: L('Press SUN', 'Tekan MATAHARI'), outcome: [{ type: 'fight' }], result: L('Wrong. Very wrong.', 'Salah. Sangat salah.') },
      { label: L('Press STAR', 'Tekan BINTANG'), outcome: [{ type: 'hp', v: -10 }, { type: 'gold', v: 30 }], result: L('A small shock, and a small reward. Close.', 'Sengatan kecil, dan hadiah kecil. Hampir.') },
    ],
  },
  {
    id: 'ev_fountain_youth', minDepth: 3, speaker: L('Dry Fountain', 'Air Mancur Kering'), portrait: 'props:water/big/0',
    text: L('A fountain with a single coin-slot. "Wishes: 50 gold."', 'Air mancur dengan satu lubang koin. "Permintaan: 50 emas."'),
    choices: [
      { label: L('Wish for power', 'Minta kekuatan'), cost: { gold: 50 }, outcome: [{ type: 'boon' }, { type: 'upgrade' }], result: L('The fountain gurgles, then glows.', 'Air mancur berdeguk, lalu bercahaya.') },
      { label: L('Wish for health', 'Minta kesehatan'), cost: { gold: 50 }, outcome: [{ type: 'maxhp', v: 30 }, { type: 'hp', v: 100 }], result: L('You feel years younger. Well — hours.', 'Kau merasa bertahun-tahun lebih muda. Yah — berjam-jam.') },
      { label: L('Wish for nothing', 'Tidak meminta apa-apa'), outcome: [{ type: 'shard' }], result: L('The fountain seems... surprised. A memory surfaces.', 'Air mancur tampak... terkejut. Sebuah ingatan muncul.') },
    ],
  },
  {
    id: 'ev_hollow_whisper', minDepth: 4, speaker: L('The Hollow Voice', 'Suara Hampa'), portrait: 'battlers:b/BlackMagusA',
    text: L('Malachar\'s voice fills the room. "Turn back, and I will let the village live in peace — in the dark, but in peace."', 'Suara Malachar memenuhi ruangan. "Berbaliklah, dan akan kubiarkan desa hidup damai — dalam gelap, tapi damai."'),
    choices: [
      { label: L('"Never."', '"Tidak akan."'), outcome: [{ type: 'boon' }, { type: 'boon' }], result: L('"Then come and die, apprentice."', '"Kalau begitu datang dan matilah, murid."') },
      { label: L('"Why do you do this?"', '"Kenapa kau melakukan ini?"'), outcome: [{ type: 'lore', id: 'lore_malachar_why' }, { type: 'shard' }], result: L('"Because every dawn ends in dusk. I wanted a dawn that never ends." Silence.', '"Karena setiap fajar berakhir dengan senja. Aku ingin fajar yang tak pernah berakhir." Hening.') },
    ],
  },
];

export function eventById(id: string | undefined): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

export const EVENTS: EventDef[] = [...BASE_EVENTS, ...EVENTS_EXPANSION];
