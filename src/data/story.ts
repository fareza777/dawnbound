import type { L10n } from '@/core/i18n';

const L = (en: string, id: string): L10n => ({ en, id });

/** Maren's voice when the player first reaches each depth. */
export const DEPTH_ARRIVAL: Record<number, L10n> = {
  1: L('Whisperwood was a garden once. Listen to the roots, Rowan — they remember the sun.', 'Hutan Bisikan dulunya sebuah taman. Dengarkan akar-akarnya, Rowan — mereka ingat matahari.'),
  2: L('The Sunken Crypt holds our dead. Do not grieve them. Grief is what he feeds on.', 'Kripta Tenggelam menyimpan orang-orang mati kita. Jangan tangisi mereka. Duka adalah makanannya.'),
  3: L('Azhar was not always cruel. A promise broken can burn hotter than any sun.', 'Azhar tidak selalu kejam. Janji yang diingkari bisa membakar lebih panas dari matahari mana pun.'),
  4: L('Vesper... I taught her to sing. Now her song freezes the air. Be gentle, if you can.', 'Vesper... aku mengajarinya bernyanyi. Kini lagunya membekukan udara. Bersikaplah lembut, jika bisa.'),
  5: L('The Hollow Throne. He waits for you, child. He always knew one of my students would come.', 'Takhta Hampa. Dia menunggumu, nak. Dia selalu tahu salah satu muridku akan datang.'),
};

export interface CinematicShot {
  image: string;
  /** Fallback when the generated art is missing. */
  fallback: string;
  text: L10n;
  pan: 'up' | 'down' | 'left' | 'right' | 'zoom';
  tint?: number;
  voice?: string;
}

/** Intro cinematic, told by Maren. */
export const INTRO: CinematicShot[] = [
  {
    image: 'art_intro_1', fallback: 'bg_PlainA', pan: 'up',
    text: L('Once, the sun rose over Aurelle every morning, and no one thought to thank it.', 'Dahulu, matahari terbit di atas Aurelle setiap pagi, dan tak seorang pun berpikir untuk berterima kasih padanya.'),
    voice: 'vo_intro_1',
  },
  {
    image: 'art_intro_2', fallback: 'bg_DungeonD', pan: 'zoom', tint: 0xb090ff,
    text: L('Then the Hollow King came. He shattered the Dawnstone into five Embers and hid them in the Depths below.', 'Lalu datanglah Raja Hampa. Ia menghancurkan Batu Fajar menjadi lima Bara dan menyembunyikannya di Kedalaman di bawah sana.'),
    voice: 'vo_intro_2',
  },
  {
    image: 'art_intro_3', fallback: 'bg_ForestC', pan: 'left', tint: 0x7080c0,
    text: L('For a hundred nights, darkness. Monsters crawled from the Rift. Village after village went silent.', 'Seratus malam, kegelapan. Monster merayap dari Celah. Desa demi desa menjadi sunyi.'),
    voice: 'vo_intro_3',
  },
  {
    image: 'art_intro_4', fallback: 'bg_PlainB', pan: 'down', tint: 0xffc080,
    text: L('Only Emberhollow endured — guarded by the Last Lantern, and by me, its keeper.', 'Hanya Emberhollow yang bertahan — dijaga oleh Lentera Terakhir, dan olehku, penjaganya.'),
    voice: 'vo_intro_4',
  },
  {
    image: 'art_intro_5', fallback: 'bg_DungeonB', pan: 'zoom', tint: 0xff9070,
    text: L('Tonight, the Hollow King\'s servants broke through. I held them back... but I am old, Rowan.', 'Malam ini, para pelayan Raja Hampa menerobos. Aku menahan mereka... tapi aku sudah tua, Rowan.'),
    voice: 'vo_intro_5',
  },
  {
    image: 'art_intro_6', fallback: 'bg_PlainA', pan: 'up', tint: 0xffe0a0,
    text: L('So I give you my flame. As long as the Lantern burns, you will wake at dawn. Find the Embers. Bring back the sun.', 'Maka kuberikan nyalaku padamu. Selama Lentera menyala, kau akan terbangun saat fajar. Temukan para Bara. Kembalikan matahari.'),
    voice: 'vo_intro_6',
  },
];

export interface EndingPage {
  text: L10n;
  image: string;
  fallback: string;
}

export const ENDING_NORMAL: CinematicShot[] = [
  { pan: 'zoom', image: 'art_end_1', fallback: 'bg_DungeonD', text: L('The Hollow King fell, and the five Embers blazed as one.', 'Raja Hampa tumbang, dan kelima Bara menyala menjadi satu.') },
  { pan: 'zoom', image: 'art_end_2', fallback: 'bg_PlainA', text: L('For the first time in a hundred nights, the horizon turned gold.', 'Untuk pertama kalinya dalam seratus malam, cakrawala berubah keemasan.') },
  { pan: 'zoom', image: 'art_end_3', fallback: 'bg_PlainB', text: L('But the Lantern still flickers. Something in the Depths is not finished with you.', 'Tapi Lentera masih berkedip. Sesuatu di Kedalaman belum selesai denganmu.') },
];

export const ENDING_TRUE: CinematicShot[] = [
  { pan: 'zoom', image: 'art_end_1', fallback: 'bg_DungeonD', text: L('With Maren\'s memories, Rowan saw the boy inside the Hollow King — the boy who feared the dark.', 'Dengan ingatan Maren, Rowan melihat anak kecil di dalam Raja Hampa — anak yang takut pada gelap.') },
  { pan: 'zoom', image: 'art_end_4', fallback: 'bg_ForestA', text: L('"Every dawn ends in dusk," Rowan said, "and every dusk ends in dawn. That is enough."', '"Setiap fajar berakhir dengan senja," kata Rowan, "dan setiap senja berakhir dengan fajar. Itu sudah cukup."') },
  { pan: 'zoom', image: 'art_end_2', fallback: 'bg_PlainA', text: L('Malachar laid down his crown. The Dawnstone was whole again, and the sun rose over Aurelle.', 'Malachar meletakkan mahkotanya. Batu Fajar utuh kembali, dan matahari terbit di atas Aurelle.') },
  { pan: 'zoom', image: 'art_end_5', fallback: 'bg_PlainB', text: L('And in Emberhollow, the Lantern finally rested — its keeper home at last.', 'Dan di Emberhollow, Lentera akhirnya beristirahat — penjaganya akhirnya pulang.') },
];

export interface LoreEntry {
  id: string;
  title: L10n;
  text: L10n;
}

export const LORE: LoreEntry[] = [
  { id: 'lore_lantern', title: L('The Last Lantern', 'Lentera Terakhir'), text: L('Forged from the first sunrise, the Lantern binds its keeper\'s soul to its flame. While it burns, the keeper cannot truly die.', 'Ditempa dari matahari terbit pertama, Lentera mengikat jiwa penjaganya pada nyalanya. Selama ia menyala, sang penjaga tak bisa benar-benar mati.') },
  { id: 'lore_dawnstone', title: L('The Dawnstone', 'Batu Fajar'), text: L('A gem the size of a heart that held the promise of every morning. Broken into five: Growth, Memory, Will, Love and Dawn.', 'Permata sebesar jantung yang menyimpan janji setiap pagi. Pecah menjadi lima: Pertumbuhan, Ingatan, Tekad, Cinta, dan Fajar.') },
  { id: 'lore_malachar_student', title: L('Maren\'s Student', 'Murid Maren'), text: L('Malachar was Maren\'s first apprentice — brilliant, kind, and terrified of endings.', 'Malachar adalah murid pertama Maren — cemerlang, baik hati, dan takut pada akhir.') },
  { id: 'lore_malachar_why', title: L('The Endless Dawn', 'Fajar Tanpa Akhir'), text: L('He did not want to kill the sun. He wanted to cage it, so it could never set again.', 'Ia tidak ingin membunuh matahari. Ia ingin mengurungnya, agar matahari tak pernah terbenam lagi.') },
  { id: 'lore_vesper_love', title: L('Vesper & Malachar', 'Vesper & Malachar'), text: L('Two apprentices who loved each other. When he chose the dark, she followed him into the cold.', 'Dua murid yang saling mencintai. Saat ia memilih kegelapan, Vesper mengikutinya ke dalam dingin.') },
  { id: 'lore_azhar', title: L('The Bound Djinn', 'Jin yang Terikat'), text: L('Azhar granted Malachar a wish: "Let the dawn never end." The wish twisted, and the djinn was bound to guard its own mistake.', 'Azhar mengabulkan permintaan Malachar: "Biarkan fajar tak pernah berakhir." Permintaan itu berbelok, dan sang jin terikat menjaga kesalahannya sendiri.') },
  { id: 'lore_gorehorn', title: L('Gorehorn', 'Gorehorn'), text: L('Once the gentle guardian of Whisperwood\'s deer. The Ember of Growth made him grow — and grow angry.', 'Dulu penjaga lembut rusa-rusa Hutan Bisikan. Bara Pertumbuhan membuatnya tumbuh — dan tumbuh marah.') },
  { id: 'lore_twins', title: L('The Twin Sisters', 'Saudari Kembar'), text: L('Sseth and Ivra drowned in the crypt flood. The Ember of Memory keeps them singing the song they died to.', 'Sseth dan Ivra tenggelam dalam banjir kripta. Bara Ingatan membuat mereka terus menyanyikan lagu kematian mereka.') },
  { id: 'lore_rift', title: L('The Rift', 'Celah'), text: L('A wound beneath Emberhollow that leads to the Five Depths. It changes every time you enter.', 'Luka di bawah Emberhollow yang menuju Lima Kedalaman. Ia berubah setiap kali kau masuk.') },
  { id: 'lore_keepers', title: L('The Lanternkeepers', 'Para Penjaga Lentera'), text: L('An order older than the kingdom. Each keeper chose an apprentice. Maren chose two — and then, at the end, Rowan.', 'Ordo yang lebih tua dari kerajaan. Setiap penjaga memilih seorang murid. Maren memilih dua — dan kemudian, di akhir, Rowan.') },
  { id: 'lore_journal_1', title: L('Maren\'s Journal I', 'Jurnal Maren I'), text: L('Year of the Long Summer. Two new apprentices today: Malachar, who asks why every flame must go out, and Vesper, who laughs at him for asking. I think they will be good for each other.', 'Tahun Musim Panas Panjang. Dua murid baru hari ini: Malachar, yang bertanya mengapa setiap nyala harus padam, dan Vesper, yang menertawakannya karena bertanya. Kurasa mereka akan saling melengkapi.') },
  { id: 'lore_journal_2', title: L('Maren\'s Journal II', 'Jurnal Maren II'), text: L('Malachar found the Dawnstone\'s true name in the old archive. He says a sun that never sets would mean no one ever loses anyone again. I told him night is where we rest. He did not listen.', 'Malachar menemukan nama sejati Batu Fajar di arsip lama. Katanya matahari yang tak pernah terbenam berarti tak seorang pun akan kehilangan siapa pun lagi. Kukatakan malam adalah tempat kita beristirahat. Dia tidak mendengarkan.') },
  { id: 'lore_journal_3', title: L('Maren\'s Journal III', 'Jurnal Maren III'), text: L('If you are reading this, keeper, I failed him. Do not hate him. Hate is only fear that has stopped asking questions. Carry the Lantern down and ask him the question I never did: what are you afraid of?', 'Jika kau membaca ini, penjaga, aku telah gagal padanya. Jangan membencinya. Benci hanyalah ketakutan yang berhenti bertanya. Bawalah Lentera turun dan tanyakan padanya pertanyaan yang tak pernah kutanyakan: apa yang kau takutkan?') },
  { id: 'lore_lullaby', title: L('The Sisters\' Lullaby', 'Nina Bobo Sang Saudari'), text: L('"Hush now, the river is only a road that carries the tired back home. Hush now, sister, I will hold the light until the morning comes."', '"Diamlah, sungai hanyalah jalan yang membawa yang lelah pulang. Diamlah, saudariku, akan kupegang cahaya ini sampai pagi tiba."') },
  { id: 'lore_forge_oath', title: L('The Smiths\' Oath', 'Sumpah Para Pandai Besi'), text: L('On the Oathbound Anvil the first smiths of Emberhollow swore to forge only what protects. Every blade made under that oath remembers who it was made to shield.', 'Di atas Landasan Sumpah, para pandai besi pertama Emberhollow bersumpah hanya menempa yang melindungi. Setiap bilah yang dibuat di bawah sumpah itu mengingat siapa yang harus dilindunginya.') },
  { id: 'lore_vesper_letter', title: L('Vesper\'s Letter', 'Surat Vesper'), text: L('"Malachar — I followed you into the cold because I thought love could warm anything. I was wrong about the cold, not about the love. If the keeper finds this, let them read it to you. Come home. — V."', '"Malachar — aku mengikutimu ke dalam dingin karena kukira cinta bisa menghangatkan apa saja. Aku salah tentang dinginnya, bukan tentang cintanya. Jika sang penjaga menemukan ini, biarkan dia membacakannya untukmu. Pulanglah. — V."') },
  { id: 'lore_nyx', title: L('The Third Apprentice', 'Murid Ketiga'), text: L('Before the Long Night there was a third student, who saw where the Dawnstone research would lead and ran. Nyx has spent a lifetime at the edge of the village, waiting to learn whether running was cowardice or wisdom.', 'Sebelum Malam Panjang ada murid ketiga, yang melihat ke mana penelitian Batu Fajar akan mengarah lalu melarikan diri. Nyx menghabiskan seumur hidupnya di pinggir desa, menunggu untuk tahu apakah melarikan diri itu pengecut atau bijaksana.') },
];
