import type { L10n } from '@/core/i18n';
import type { QuestDef } from './quests';

const L = (en: string, id: string): L10n => ({ en, id });

/** Expansion side quests: the new regions, more work for every villager, and a few long-term goals. */
export const SIDE_QUESTS_EXPANSION: QuestDef[] = [
  {
    id: 'sq_drowned_bell', type: 'side', giver: 'liora', requires: ['mq_crypt'],
    title: L('The Drowned Bell', 'Lonceng Tenggelam'),
    desc: L('Liora hears a bell tolling from somewhere flooded in the second Depth — the Drowned Catacombs. Find it and decide what to do with it.', 'Liora mendengar lonceng berdentang dari tempat yang banjir di Kedalaman kedua — Katakomba Tenggelam. Temukan dan putuskan apa yang harus dilakukan.'),
    objectives: [{ kind: 'flag', flag: 'drowned_bell' }],
    rewards: { embers: 120, item: { rarity: 3 } },
    done: L('Whatever you chose, the tolling has stopped. The dead down there can finally hear themselves think.', 'Apa pun pilihanmu, dentangnya telah berhenti. Orang-orang mati di bawah sana akhirnya bisa mendengar pikiran mereka sendiri.'),
  },
  {
    id: 'sq_forge_fuel', type: 'side', giver: 'brom', requires: ['mq_forge_oath'],
    title: L('Fuel for the Forge', 'Bahan Bakar Tempa'),
    desc: L('The relit forge is hungry. Bring Brom 5 Magma Cores and 5 Iron Ore.', 'Tungku yang menyala lagi sedang lapar. Bawakan Brom 5 Inti Magma dan 5 Bijih Besi.'),
    objectives: [{ kind: 'item', material: 'magma_core', count: 5 }, { kind: 'item', material: 'iron_ore', count: 5 }],
    rewards: { embers: 150, material: ['moonsteel', 3] }, consume: true,
    done: L('Listen to her roar! Here — moonsteel, fresh from the fire. Bring me your gear anytime.', 'Dengar raungannya! Ini — baja bulan, segar dari api. Bawa perlengkapanmu kapan saja.'),
  },
  {
    id: 'sq_crystal_song', type: 'side', giver: 'finn', requires: ['mq_lullaby'],
    title: L('The Singing Crystal', 'Kristal yang Bernyanyi'),
    desc: L('Finn swears there is a crystal that sings in the fourth Depth, deep in the Crystal Hollows. Find it and bring back its song.', 'Finn bersumpah ada kristal yang bernyanyi di Kedalaman keempat, jauh di Lembah Kristal. Temukan dan bawa pulang lagunya.'),
    objectives: [{ kind: 'flag', flag: 'crystal_song' }],
    rewards: { embers: 180, shards: 1 },
    done: L('Hum it for me. No — slower. ...Oh. Oh, that is the most beautiful thing I have ever heard. I owe you a whole ballad.', 'Senandungkan untukku. Bukan — lebih pelan. ...Oh. Oh, itu hal terindah yang pernah kudengar. Aku berutang satu balada utuh padamu.'),
  },
  {
    id: 'sq_golems', type: 'side', giver: 'kael', requires: ['sq_elites'],
    title: L('Stone and Fire', 'Batu dan Api'),
    desc: L('Kael wants proof you can crack the toughest hides below. Defeat 4 Forge Golems in the Emberforge Caverns.', 'Kael ingin bukti kau bisa memecahkan kulit terkeras di bawah sana. Kalahkan 4 Golem Tempa di Gua Tempa Bara.'),
    objectives: [{ kind: 'kill', count: 4, enemy: 'forge_golem' }],
    rewards: { embers: 160, item: { rarity: 3, slot: 'armor' } },
    done: L('Four of them. Hm. I only ever managed three. Take this armor — you will need it more than I will.', 'Empat. Hm. Aku cuma pernah sanggup tiga. Ambil zirah ini — kau akan lebih membutuhkannya daripada aku.'),
  },
  {
    id: 'sq_bog_remedy', type: 'side', giver: 'ysolde', requires: ['mq_crypt'],
    title: L('Bog Remedy', 'Obat Rawa'),
    desc: L('A fever is going around the village. Ysolde needs 6 Grave Moss and 3 Ghostcaps for a remedy.', 'Demam sedang menyebar di desa. Ysolde butuh 6 Lumut Kubur dan 3 Jamur Hantu untuk obatnya.'),
    objectives: [{ kind: 'item', material: 'grave_moss', count: 6 }, { kind: 'item', material: 'ghostcap', count: 3 }],
    rewards: { embers: 110, gold: 120 }, consume: true,
    done: L('Smells terrible. Works wonderfully. Half the village will sleep through the night thanks to you.', 'Baunya mengerikan. Khasiatnya luar biasa. Separuh desa akan tidur nyenyak malam ini berkat kau.'),
  },
  {
    id: 'sq_wren_story', type: 'side', giver: 'wren', requires: ['sq_cat'],
    title: L('A Story for Wren', 'Cerita untuk Wren'),
    desc: L('Wren wants a real adventure story. Reach the third Depth, then come back and tell her everything.', 'Wren ingin cerita petualangan sungguhan. Capai Kedalaman ketiga, lalu kembali dan ceritakan semuanya.'),
    objectives: [{ kind: 'depth', depth: 3 }],
    rewards: { embers: 70, material: ['moonpetal', 3] },
    done: L('A DJINN? And lava? And you did not die — okay, you died, but you came BACK? That is the best story ever. I am telling Biscuit.', 'Seekor JIN? Dan lava? Dan kau tidak mati — oke, kau mati, tapi kau KEMBALI? Itu cerita terbaik sepanjang masa. Akan kuceritakan pada Biscuit.'),
  },
  {
    id: 'sq_pip_treasure', type: 'side', giver: 'pip', requires: ['sq_debt'],
    title: L('Pip\'s Treasure Map', 'Peta Harta Pip'),
    desc: L('Pip won a treasure map in a card game. He swears it is real. It points to the second or third Depth.', 'Pip memenangkan peta harta dalam permainan kartu. Ia bersumpah itu asli. Peta itu menunjuk ke Kedalaman kedua atau ketiga.'),
    objectives: [{ kind: 'flag', flag: 'pip_treasure' }],
    rewards: { gold: 250, embers: 80 },
    done: L('It was REAL? I mean — of course it was real. Here is your cut. Minus a small finder\'s fee. Very small. Tiny.', 'Itu ASLI? Maksudku — tentu saja asli. Ini bagianmu. Dikurangi sedikit biaya penemu. Sangat sedikit. Kecil sekali.'),
  },
  {
    id: 'sq_captain', type: 'side', giver: 'dorran', requires: ['sq_trial'],
    title: L('Captain\'s Challenge', 'Tantangan Kapten'),
    desc: L('Dorran wants to see a veteran, not a recruit. Defeat 25 elite monsters.', 'Dorran ingin melihat seorang veteran, bukan rekrutan. Kalahkan 25 monster elite.'),
    objectives: [{ kind: 'killElite', count: 25 }],
    rewards: { embers: 250, item: { rarity: 4 } },
    done: L('Twenty-five. When you came to me you could not hold a sword straight. Now the guard salutes when you walk past. So do I.', 'Dua puluh lima. Saat pertama datang kau tak bisa memegang pedang dengan lurus. Kini para penjaga memberi hormat saat kau lewat. Aku juga.'),
  },
  {
    id: 'sq_winter_seeds', type: 'side', giver: 'mira', requires: ['sq_harvest'],
    title: L('Winter Seeds', 'Benih Musim Dingin'),
    desc: L('Mira wants to grow something that survives the cold. Bring 3 Frostleaf and 2 Frost Crystals.', 'Mira ingin menanam sesuatu yang tahan dingin. Bawakan 3 Daun Beku dan 2 Kristal Beku.'),
    objectives: [{ kind: 'item', material: 'frostleaf', count: 3 }, { kind: 'item', material: 'frost_crystal', count: 2 }],
    rewards: { embers: 120, material: ['seed_golden', 1] }, consume: true,
    done: L('Look — it sprouted overnight, right through the frost! And it left a golden seed behind. That one is yours.', 'Lihat — ia bertunas semalam, menembus embun beku! Dan ia meninggalkan sebutir benih emas. Yang itu milikmu.'),
  },
  {
    id: 'sq_nyx_mask', type: 'side', giver: 'nyx', requires: ['sq_riddle', 'mq_frost'],
    title: L('Behind the Hood', 'Di Balik Tudung'),
    desc: L('"You want to know who I am? Then look for me where the cold meets the dark." Find Nyx\'s echo in the fourth or fifth Depth.', '"Kau ingin tahu siapa aku? Carilah aku di tempat dingin bertemu gelap." Temukan gema Nyx di Kedalaman keempat atau kelima.'),
    objectives: [{ kind: 'flag', flag: 'nyx_echo' }],
    rewards: { embers: 250, shards: 2 },
    done: L('So now you know. I ran, and Maren stayed. I have wondered every night since which of us was braver. Perhaps you will answer that for me.', 'Kini kau tahu. Aku lari, dan Maren bertahan. Setiap malam sejak itu aku bertanya-tanya siapa di antara kami yang lebih berani. Mungkin kau yang akan menjawabnya untukku.'),
  },
  {
    id: 'sq_eel_notes', type: 'side', giver: 'tobin', requires: ['mq_journal'],
    title: L('Field Notes', 'Catatan Lapangan'),
    desc: L('Tobin is writing a bestiary and needs notes on the Eel Wraiths of the Drowned Catacombs. Defeat 3 of them.', 'Tobin sedang menulis buku bestiary dan butuh catatan tentang Arwah Belut di Katakomba Tenggelam. Kalahkan 3 di antaranya.'),
    objectives: [{ kind: 'kill', count: 3, enemy: 'eel_wraith' }],
    rewards: { embers: 130, material: ['arcane_dust', 4] },
    done: L('Fascinating. They move like smoke but bite like steel. Page two hundred and six. Thank you, keeper.', 'Menarik. Mereka bergerak seperti asap tapi menggigit seperti baja. Halaman dua ratus enam. Terima kasih, penjaga.'),
  },
  {
    id: 'sq_pilgrim_road', type: 'side', giver: 'liora', requires: ['sq_pilgrim'],
    title: L('The Pilgrim\'s Road', 'Jalan Peziarah'),
    desc: L('Liora asks you to honor the spirits properly. Pray at 12 Spirit Shrines in the Depths.', 'Liora memintamu menghormati para roh dengan layak. Berdoalah di 12 Kuil Roh di Kedalaman.'),
    objectives: [{ kind: 'stat', stat: 'shrines', count: 12, label: L('Shrines visited', 'Kuil dikunjungi') }],
    rewards: { embers: 200, shards: 1 },
    done: L('The spirits speak your name now, keeper. They will answer you a little more readily from here on.', 'Para roh kini menyebut namamu, penjaga. Mulai sekarang mereka akan sedikit lebih mudah menjawabmu.'),
  },
];
