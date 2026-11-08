// File: lib/arcade-engine.js

export const FALLBACK_STILL =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80";

// Deterministic string -> 32-bit unsigned seed
export function hashSeed(input) {
  const str = String(input || "scenesense_default");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic Mulberry32 PRNG returning floats in [0, 1)
export function createSeededRng(seedInput) {
  let a = hashSeed(seedInput) || 1;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, rng) {
  const copy = Array.isArray(items) ? [...items] : [];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function generateDuelCode(seedNum) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = Math.abs(Number(seedNum) || 1234567);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + 17 * (i + 1);
  }
  return `DUEL-${code}`;
}

export function getTodayUtcDateKey(nowMs) {
  const d = new Date(typeof nowMs === "number" ? nowMs : Date.now());
  return d.toISOString().split("T")[0];
}

export function getUtcMidnightCountdown(nowMs) {
  const now = new Date(typeof nowMs === "number" ? nowMs : Date.now());
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0
  );
  const diffSec = Math.max(0, Math.floor((nextUtcMidnight - now.getTime()) / 1000));
  const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
  const secs = String(diffSec % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

// Daily Spin 8-Wedge Wheel Configuration (45 deg per wedge)
export const DAILY_SPIN_SEGMENTS = [
  {
    id: "spin_75",
    shortLabel: "+80 🪙",
    label: "+80 SceneCents",
    coins: 80,
    xp: 120,
    bonusSpins: 0,
    color: "#0ea5e9",
    accent: "#38bdf8",
    rarity: "COMMON",
    weight: 22,
    icon: "🪙",
  },
  {
    id: "spin_xp_surge",
    shortLabel: "+350 XP",
    label: "+350 XP & +40 🪙",
    coins: 40,
    xp: 350,
    bonusSpins: 0,
    color: "#7c3aed",
    accent: "#a78bfa",
    rarity: "RARE",
    weight: 16,
    icon: "⚡",
  },
  {
    id: "spin_160",
    shortLabel: "+160 🪙",
    label: "+160 SceneCents",
    coins: 160,
    xp: 180,
    bonusSpins: 0,
    color: "#d97706",
    accent: "#fbbf24",
    rarity: "RARE",
    weight: 15,
    icon: "💰",
  },
  {
    id: "spin_free_ticket",
    shortLabel: "2x SPIN!",
    label: "Bonus Spin Ticket + 90 🪙",
    coins: 90,
    xp: 220,
    bonusSpins: 1,
    color: "#059669",
    accent: "#34d399",
    rarity: "EPIC",
    weight: 10,
    icon: "🎟️",
  },
  {
    id: "spin_115",
    shortLabel: "+115 🪙",
    label: "+115 SceneCents",
    coins: 115,
    xp: 140,
    bonusSpins: 0,
    color: "#2563eb",
    accent: "#60a5fa",
    rarity: "COMMON",
    weight: 18,
    icon: "🎬",
  },
  {
    id: "spin_jackpot",
    shortLabel: "JACKPOT",
    label: "JACKPOT: +600 🪙 & +1,000 XP",
    coins: 600,
    xp: 1000,
    bonusSpins: 0,
    unlockItem: "frame_solar_gold",
    color: "#db2777",
    accent: "#f472b6",
    rarity: "MYTHIC",
    weight: 3,
    icon: "👑",
  },
  {
    id: "spin_260",
    shortLabel: "+260 🪙",
    label: "+260 SceneCents Treasury",
    coins: 260,
    xp: 300,
    bonusSpins: 0,
    color: "#ca8a04",
    accent: "#facc15",
    rarity: "EPIC",
    weight: 7,
    icon: "🏆",
  },
  {
    id: "spin_overdrive",
    shortLabel: "+550 XP",
    label: "+550 XP Overdrive & +65 🪙",
    coins: 65,
    xp: 550,
    bonusSpins: 0,
    color: "#0d9488",
    accent: "#2dd4bf",
    rarity: "RARE",
    weight: 9,
    icon: "🎞️",
  },
];

// Purchasable Extra Spin Bundles with SceneCents
export const SPIN_SHOP_BUNDLES = [
  {
    id: "spin_pack_1",
    spins: 1,
    cost: 75,
    bonusXp: 25,
    badge: "Single Spin",
    savings: null,
    desc: "1 extra spin ticket ready immediately",
  },
  {
    id: "spin_pack_3",
    spins: 3,
    cost: 195,
    bonusXp: 100,
    badge: "Popular • Save 30 🪙",
    savings: "65 🪙 / spin",
    desc: "3 extra spin tickets + 100 instant XP",
  },
  {
    id: "spin_pack_5",
    spins: 5,
    cost: 300,
    bonusXp: 250,
    badge: "Best Value • Save 75 🪙",
    savings: "60 🪙 / spin",
    desc: "5 extra spin tickets + 250 instant XP",
  },
];

export function pickWeightedSpinIndex(rngFn, forceEpicOrHigher = false) {
  const candidates = DAILY_SPIN_SEGMENTS.map((seg, index) => ({ seg, index })).filter(
    ({ seg }) => !forceEpicOrHigher || seg.rarity === "EPIC" || seg.rarity === "MYTHIC"
  );
  const totalWeight = candidates.reduce((acc, item) => acc + item.seg.weight, 0);
  let threshold = rngFn() * totalWeight;
  for (const item of candidates) {
    threshold -= item.seg.weight;
    if (threshold <= 0) return item.index;
  }
  return candidates[candidates.length - 1].index;
}

// Master Verified Cinema Catalog (works offline and enriches live TMDB deck)
export const MASTER_CINEMA_CATALOG = [
  {
    id: "m_603",
    tmdbId: 603,
    title: "The Matrix",
    year: 1999,
    director: "Lana & Lilly Wachowski",
    genre: "Sci-Fi • Cyberpunk",
    grossMillions: 467,
    rating: 8.7,
    tagline: "Welcome to the Real World.",
    clue: "A computer hacker named Neo takes the red pill and discovers humanity is trapped inside a neural simulation.",
    backdrop: "https://image.tmdb.org/t/p/w780/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
    poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  },
  {
    id: "m_157336",
    tmdbId: 157336,
    title: "Interstellar",
    year: 2014,
    director: "Christopher Nolan",
    genre: "Sci-Fi • Adventure",
    grossMillions: 733,
    rating: 8.7,
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    clue: "One hour on Miller's tidal-wave planet costs seven years back on Earth while orbiting the Gargantua black hole.",
    backdrop: "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    id: "m_27205",
    tmdbId: 27205,
    title: "Inception",
    year: 2010,
    director: "Christopher Nolan",
    genre: "Sci-Fi • Heist",
    grossMillions: 839,
    rating: 8.4,
    tagline: "Your mind is the scene of the crime.",
    clue: "A dream-share extractor spins a brass totem while staging a zero-gravity fight inside a rotating hotel corridor.",
    backdrop: "https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  },
  {
    id: "m_155",
    tmdbId: 155,
    title: "The Dark Knight",
    year: 2008,
    director: "Christopher Nolan",
    genre: "Crime • Action",
    grossMillions: 1008,
    rating: 8.5,
    tagline: "Why So Serious?",
    clue: "An anarchic clown prince of crime orchestrates a Gotham bank heist and tests two ferries rigged with detonators.",
    backdrop: "https://image.tmdb.org/t/p/w780/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  },
  {
    id: "m_496243",
    tmdbId: 496243,
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    genre: "Thriller • Satire",
    grossMillions: 262,
    rating: 8.5,
    tagline: "Act like you own the place.",
    clue: "A family infiltrates a wealthy modernist hillside mansion only to discover a secret bunker beneath the basement.",
    backdrop: "https://image.tmdb.org/t/p/w780/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  },
  {
    id: "m_335984",
    tmdbId: 335984,
    title: "Blade Runner 2049",
    year: 2017,
    director: "Denis Villeneuve",
    genre: "Neo-Noir • Sci-Fi",
    grossMillions: 267,
    rating: 8.0,
    tagline: "The key to the future is finally unearthed.",
    clue: "Replicant Officer K recites 'Cells interlinked' before tracking a carved wooden horse to radiation-soaked Las Vegas.",
    backdrop: "https://image.tmdb.org/t/p/w780/ilRyazdMJwN05exqhwK4tMKBYZs.jpg",
    poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  },
  {
    id: "m_693134",
    tmdbId: 693134,
    title: "Dune: Part Two",
    year: 2024,
    director: "Denis Villeneuve",
    genre: "Sci-Fi • Epic",
    grossMillions: 714,
    rating: 8.3,
    tagline: "Long live the fighters.",
    clue: "Paul Atreides rides a colossal sandworm across Arrakis alongside Chani and the Fremen to challenge House Harkonnen.",
    backdrop: "https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },
  {
    id: "m_872585",
    tmdbId: 872585,
    title: "Oppenheimer",
    year: 2023,
    director: "Christopher Nolan",
    genre: "Biography • History",
    grossMillions: 976,
    rating: 8.1,
    tagline: "The world forever changes.",
    clue: "Shot on 65mm IMAX & black-and-white film stock, chronicling the Trinity test at Los Alamos and security hearings.",
    backdrop: "https://image.tmdb.org/t/p/w780/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  },
  {
    id: "m_545611",
    tmdbId: 545611,
    title: "Everything Everywhere All at Once",
    year: 2022,
    director: "Daniel Kwan & Daniel Scheinert",
    genre: "Sci-Fi • Action",
    grossMillions: 143,
    rating: 7.8,
    tagline: "The universe is so much bigger than you realize.",
    clue: "An overwhelmed laundromat owner undergoes an IRS audit while verse-jumping past googly eyes and an everything bagel.",
    backdrop: "https://image.tmdb.org/t/p/w780/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg",
    poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
  },
  {
    id: "m_76341",
    tmdbId: 76341,
    title: "Mad Max: Fury Road",
    year: 2015,
    director: "George Miller",
    genre: "Action • Wasteland",
    grossMillions: 380,
    rating: 8.1,
    tagline: "What a Lovely Day.",
    clue: "Imperator Furiosa drives an armored War Rig across the Namib desert pursued by a flamethrowing electric guitarist.",
    backdrop: "https://image.tmdb.org/t/p/w780/nlCHUWjY9XWbuEUQauCBgnY8ymF.jpg",
    poster: "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
  },
  {
    id: "m_244786",
    tmdbId: 244786,
    title: "Whiplash",
    year: 2014,
    director: "Damien Chazelle",
    genre: "Drama • Music",
    grossMillions: 49,
    rating: 8.4,
    tagline: "The road to greatness can take you to the edge.",
    clue: "A ruthless conservatory bandleader shouts 'Not quite my tempo!' at an obsessed young jazz drummer playing Caravan.",
    backdrop: "https://image.tmdb.org/t/p/w780/vNXGrknx4GjDCWgmuJzO97s8K1U.jpg",
    poster: "https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
  },
  {
    id: "m_680",
    tmdbId: 680,
    title: "Pulp Fiction",
    year: 1994,
    director: "Quentin Tarantino",
    genre: "Crime • Anthology",
    grossMillions: 214,
    rating: 8.5,
    tagline: "You won't know the facts until you've seen the fiction.",
    clue: "Two hitmen guard a glowing golden briefcase while twisting barefoot on the dance floor at Jack Rabbit Slim's.",
    backdrop: "https://image.tmdb.org/t/p/w780/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  },
  {
    id: "m_129",
    tmdbId: 129,
    title: "Spirited Away",
    year: 2001,
    director: "Hayao Miyazaki",
    genre: "Animation • Fantasy",
    grossMillions: 395,
    rating: 8.5,
    tagline: "Tunnel to the spirit world.",
    clue: "Ten-year-old Chihiro works inside Yubaba's bathhouse for spirits and boards a train across flooded tracks with No-Face.",
    backdrop: "https://image.tmdb.org/t/p/w780/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
    poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  },
  {
    id: "m_348",
    tmdbId: 348,
    title: "Alien",
    year: 1979,
    director: "Ridley Scott",
    genre: "Sci-Fi • Horror",
    grossMillions: 188,
    rating: 8.2,
    tagline: "In space no one can hear you scream.",
    clue: "Aboard commercial towing vessel Nostromo, Warrant Officer Ripley faces an acid-blooded xenomorph and ship computer Mother.",
    backdrop: "https://image.tmdb.org/t/p/w780/AmR3JG1VQVxU8TfAvljUhfSFUOx.jpg",
    poster: "https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg",
  },
  {
    id: "m_19995",
    tmdbId: 19995,
    title: "Avatar",
    year: 2009,
    director: "James Cameron",
    genre: "Sci-Fi • Fantasy",
    grossMillions: 2923,
    rating: 7.6,
    tagline: "Enter the World of Pandora.",
    clue: "A paraplegic Marine links into a bioluminescent Na'vi body on the lush moon of Pandora.",
    backdrop: "https://image.tmdb.org/t/p/w780/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg",
    poster: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg",
  },
  {
    id: "m_361743",
    tmdbId: 361743,
    title: "Top Gun: Maverick",
    year: 2022,
    director: "Joseph Kosinski",
    genre: "Action • Aviation",
    grossMillions: 1495,
    rating: 8.2,
    tagline: "Feel the need... The need for speed.",
    clue: "Test pilot Pete Mitchell pushes a Darkstar hypersonic jet past Mach 10 before training elite naval aviators for a canyon strike.",
    backdrop: "https://image.tmdb.org/t/p/w780/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg",
    poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
  },
  {
    id: "m_329",
    tmdbId: 329,
    title: "Jurassic Park",
    year: 1993,
    director: "Steven Spielberg",
    genre: "Adventure • Sci-Fi",
    grossMillions: 1114,
    rating: 8.2,
    tagline: "An adventure 65 million years in the making.",
    clue: "Ripples tremble inside a cup of water on an Isla Nublar tour vehicle as power fails across prehistoric enclosures.",
    backdrop: "https://image.tmdb.org/t/p/w780/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg",
    poster: "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg",
  },
  {
    id: "m_120467",
    tmdbId: 120467,
    title: "The Grand Budapest Hotel",
    year: 2014,
    director: "Wes Anderson",
    genre: "Comedy • Adventure",
    grossMillions: 173,
    rating: 8.1,
    tagline: "Keep your hands off my lobby boy!",
    clue: "Monsieur Gustave H. and Zero Moustafa flee across pastel-pink Zubrowka with a stolen Renaissance painting, 'Boy with Apple'.",
    backdrop: "https://image.tmdb.org/t/p/w780/5vPW6MPAyCFd84FEQQgtPDmVDPQ.jpg",
    poster: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
  },
  {
    id: "m_807",
    tmdbId: 807,
    title: "Se7en",
    year: 1995,
    director: "David Fincher",
    genre: "Crime • Mystery",
    grossMillions: 327,
    rating: 8.4,
    tagline: "Seven deadly sins. Seven ways to die.",
    clue: "Two rain-soaked detectives pursue John Doe into a desert power-line wasteland where a cardboard delivery box awaits.",
    backdrop: "https://image.tmdb.org/t/p/w780/iwgl8zlrrfvfWp9k9Paj8lvfevS.jpg",
    poster: "https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg",
  },
  {
    id: "m_238",
    tmdbId: 238,
    title: "The Godfather",
    year: 1972,
    director: "Francis Ford Coppola",
    genre: "Crime • Drama",
    grossMillions: 250,
    rating: 8.7,
    tagline: "An offer you can't refuse.",
    clue: "At his daughter Connie's sunlit wedding, Don Vito Corleone receives supplicants inside his darkened New York study.",
    backdrop: "https://image.tmdb.org/t/p/w780/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
    poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  },
  {
    id: "m_6977",
    tmdbId: 6977,
    title: "No Country for Old Men",
    year: 2007,
    director: "Joel & Ethan Coen",
    genre: "Crime • Neo-Western",
    grossMillions: 171,
    rating: 8.1,
    tagline: "Call it, friendo.",
    clue: "Anton Chigurh flips a 1958 quarter at a remote Texas gas station while tracking a briefcase full of cartel cash.",
    backdrop: "https://image.tmdb.org/t/p/w780/kd9jFTTabg4xJpHDgxY0h8F9BzG.jpg",
    poster: "https://image.tmdb.org/t/p/w500/bj1v6YKF8yHqA489VFfnQvOJpnc.jpg",
  },
  {
    id: "m_313369",
    tmdbId: 313369,
    title: "La La Land",
    year: 2016,
    director: "Damien Chazelle",
    genre: "Musical • Romance",
    grossMillions: 472,
    rating: 7.9,
    tagline: "Here's to the fools who dream.",
    clue: "A jazz purist and an aspiring Hollywood actress tap dance above Los Angeles at magic hour and float inside Griffith Observatory.",
    backdrop: "https://image.tmdb.org/t/p/w780/nadTlnTE6DdgmYsN4iWc2a2wiaI.jpg",
    poster: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  },
  {
    id: "m_122",
    tmdbId: 122,
    title: "The Lord of the Rings: The Return of the King",
    year: 2003,
    director: "Peter Jackson",
    genre: "Fantasy • Adventure",
    grossMillions: 1156,
    rating: 8.5,
    tagline: "There can be no triumph without loss.",
    clue: "Winner of 11 Academy Awards, culminating at the fires of Mount Doom and the Charge of the Rohirrim at Pelennor Fields.",
    backdrop: "https://image.tmdb.org/t/p/w780/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg",
    poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
  },
  {
    id: "m_550",
    tmdbId: 550,
    title: "Fight Club",
    year: 1999,
    director: "David Fincher",
    genre: "Drama • Thriller",
    grossMillions: 101,
    rating: 8.4,
    tagline: "Mischief. Mayhem. Soap.",
    clue: "An insomniac recall coordinator meets soap salesman Tyler Durden on an airplane and forms Project Mayhem.",
    backdrop: "https://image.tmdb.org/t/p/w780/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  },
];

// Merge live TMDB deck items with Master Catalog without duplicates
export function mergeCinemaPool(liveItems = []) {
  const byTitle = new Map();
  for (const item of MASTER_CINEMA_CATALOG) {
    byTitle.set(item.title.toLowerCase(), item);
  }
  for (const item of liveItems) {
    if (!item?.title) continue;
    const key = item.title.toLowerCase();
    if (byTitle.has(key)) {
      const existing = byTitle.get(key);
      byTitle.set(key, {
        ...existing,
        backdrop: item.backdrop || existing.backdrop,
        poster: item.poster || existing.poster,
        rating: item.rating || existing.rating,
      });
    } else {
      byTitle.set(key, item);
    }
  }
  return Array.from(byTitle.values());
}

// Build deterministic 4-option trivia/frame rounds from a seed
export function buildSeededCinemaRounds(pool, seedStr, count = 5) {
  const rng = createSeededRng(seedStr);
  const validPool = (pool && pool.length >= 8 ? pool : MASTER_CINEMA_CATALOG).filter(
    (m) => m.title && (m.backdrop || m.poster)
  );
  const ordered = seededShuffle(validPool, rng);
  const selected = ordered.slice(0, Math.min(count, ordered.length));

  return selected.map((target, roundIdx) => {
    const decoys = seededShuffle(
      validPool.filter((m) => m.title !== target.title),
      rng
    )
      .slice(0, 3)
      .map((m) => m.title);
    const options = seededShuffle([target.title, ...decoys], rng);

    // Deterministic crop focal point for Frame Focus
    const focalX = 25 + Math.floor(rng() * 50);
    const focalY = 20 + Math.floor(rng() * 55);

    return {
      roundIndex: roundIdx,
      id: `${target.id}_${roundIdx}`,
      title: target.title,
      year: target.year || 2020,
      director: target.director || "Studio Auteur",
      genre: target.genre || "Cinema",
      rating: Number(target.rating || 8.0),
      grossMillions: typeof target.grossMillions === "number" ? target.grossMillions : null,
      tagline: target.tagline || "",
      clue:
        target.clue ||
        target.overview ||
        `Acclaimed ${target.year || ""} ${target.genre || "feature"} release with an audience rating of ${Number(
          target.rating || 8.0
        ).toFixed(1)}/10.`,
      backdrop: target.backdrop || target.poster || FALLBACK_STILL,
      poster: target.poster || target.backdrop || FALLBACK_STILL,
      options,
      answer: target.title,
      focalX,
      focalY,
    };
  });
}

// Build deterministic Higher/Lower pairs (Box Office or Rating)
export function buildSeededClashPairs(pool, seedStr, mode = "boxoffice", count = 8) {
  const rng = createSeededRng(`${seedStr}_${mode}`);
  const candidates = (pool && pool.length ? pool : MASTER_CINEMA_CATALOG).filter((m) =>
    mode === "boxoffice" ? typeof m.grossMillions === "number" && m.grossMillions > 0 : typeof m.rating === "number" && m.rating > 0
  );
  const baseList = candidates.length >= 6 ? candidates : MASTER_CINEMA_CATALOG;
  const shuffled = seededShuffle(baseList, rng);
  const pairs = [];

  for (let i = 0; i < count; i++) {
    const a = shuffled[i % shuffled.length];
    let b = shuffled[(i + 1) % shuffled.length];
    if (b.title === a.title) {
      b = shuffled[(i + 2) % shuffled.length];
    }
    pairs.push({ left: a, right: b });
  }
  return pairs;
}

// Reel 21 Card Deck with true Ace (1 or 11) math
export const REEL_21_CARDS = [
  { label: "Oscar Wildcard (A)", minVal: 1, maxVal: 11, isAce: true, badge: "1 or 11" },
  { label: "Short Film (+2)", value: 2, isAce: false, badge: "+2" },
  { label: "Teaser Cut (+3)", value: 3, isAce: false, badge: "+3" },
  { label: "Indie Sleeper (+4)", value: 4, isAce: false, badge: "+4" },
  { label: "Critics Pick (+5)", value: 5, isAce: false, badge: "+5" },
  { label: "Matinee Run (+6)", value: 6, isAce: false, badge: "+6" },
  { label: "Holiday Release (+7)", value: 7, isAce: false, badge: "+7" },
  { label: "Wide Premiere (+8)", value: 8, isAce: false, badge: "+8" },
  { label: "Summer Tentpole (+9)", value: 9, isAce: false, badge: "+9" },
  { label: "IMAX Blockbuster (+10)", value: 10, isAce: false, badge: "+10" },
  { label: "Global Franchise (+10)", value: 10, isAce: false, badge: "+10" },
];

export function computeReel21Total(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.isAce) {
      aces += 1;
      total += 11;
    } else {
      total += card.value || 0;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, isSoft: aces > 0 };
}

export function drawSeededReel21Card(rngFn, safeCut = false) {
  if (safeCut) {
    const safeVal = Math.floor(rngFn() * 4) + 1;
    return {
      label: `Safe Cut (+${safeVal})`,
      value: safeVal,
      isAce: false,
      badge: `+${safeVal}`,
    };
  }
  const idx = Math.floor(rngFn() * REEL_21_CARDS.length);
  return { ...REEL_21_CARDS[idx] };
}

// Guest / Local fallback economy storage
const GUEST_ECONOMY_KEY = "scenesense_arcade_economy_v2";

export function readGuestEconomy() {
  if (typeof window === "undefined") {
    return {
      coins: 200,
      xp: 320,
      spinTickets: 1,
      lastDailySpinDate: null,
      totalSpins: 0,
      pityCounter: 0,
    };
  }
  try {
    const raw = localStorage.getItem(GUEST_ECONOMY_KEY);
    if (!raw) {
      const starter = {
        coins: 200,
        xp: 320,
        spinTickets: 1,
        lastDailySpinDate: null,
        totalSpins: 0,
        pityCounter: 0,
      };
      localStorage.setItem(GUEST_ECONOMY_KEY, JSON.stringify(starter));
      return starter;
    }
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed.coins === "number" ? Math.max(0, parsed.coins) : 200,
      xp: typeof parsed.xp === "number" ? Math.max(0, parsed.xp) : 320,
      spinTickets: typeof parsed.spinTickets === "number" ? Math.max(0, parsed.spinTickets) : 0,
      lastDailySpinDate: parsed.lastDailySpinDate || null,
      totalSpins: typeof parsed.totalSpins === "number" ? parsed.totalSpins : 0,
      pityCounter: typeof parsed.pityCounter === "number" ? parsed.pityCounter : 0,
    };
  } catch {
    return {
      coins: 200,
      xp: 320,
      spinTickets: 1,
      lastDailySpinDate: null,
      totalSpins: 0,
      pityCounter: 0,
    };
  }
}

export function writeGuestEconomy(patch) {
  if (typeof window === "undefined") return;
  try {
    const current = readGuestEconomy();
    const next = { ...current, ...patch };
    localStorage.setItem(GUEST_ECONOMY_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
}
