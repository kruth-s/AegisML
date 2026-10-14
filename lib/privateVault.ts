/**
 * Vault & Private Room Authentication Utilities
 * Anime Character Names (4-6 letters, lowercase)
 * All 3 secret phrases are chosen from the SAME anime series.
 * During authentication, 3 correct names + 3 decoys from DIFFERENT anime series are shown.
 */

export interface AnimeSeries {
  id: string;
  name: string;
  characters: string[];
}

export const ANIME_SERIES: AnimeSeries[] = [
  {
    id: 'one-piece',
    name: 'One Piece',
    characters: ['luffy', 'zoro', 'nami', 'sanji', 'usopp', 'robin'],
  },
  {
    id: 'demon-slayer',
    name: 'Demon Slayer',
    characters: ['nezuko', 'giyu', 'muzan', 'akaza', 'kanao', 'tengen'],
  },
  {
    id: 'attack-on-titan',
    name: 'Attack on Titan',
    characters: ['eren', 'mikasa', 'armin', 'levi', 'reiner', 'sasha'],
  },
  {
    id: 'death-note',
    name: 'Death Note',
    characters: ['light', 'ryuk', 'misa', 'near', 'mello', 'mikami'],
  },
  {
    id: 'bleach',
    name: 'Bleach',
    characters: ['ichigo', 'rukia', 'renji', 'uryu', 'aizen', 'chad'],
  },
  {
    id: 'apothecary-diaries',
    name: 'The Apothecary Diaries',
    characters: ['maomao', 'jinshi', 'lihaku', 'lihua', 'lishu', 'lakan'],
  },
  {
    id: 'solo-leveling',
    name: 'Solo Leveling',
    characters: ['jinwoo', 'jinho', 'chaein', 'juhee', 'gunhee', 'jinah'],
  },
  {
    id: 'jujutsu-kaisen',
    name: 'Jujutsu Kaisen',
    characters: ['yuji', 'megumi', 'nobara', 'gojo', 'sukuna', 'maki'],
  },
  {
    id: 'dandadan',
    name: 'Dan Da Dan',
    characters: ['momo', 'okarun', 'seiko', 'aira', 'jiji', 'zuma'],
  },
  {
    id: 'blue-box',
    name: 'Blue Box',
    characters: ['taiki', 'hina', 'haryu', 'ayame', 'karen', 'nagisa'],
  },
  {
    id: 'sakamoto-days',
    name: 'Sakamoto Days',
    characters: ['taro', 'shin', 'nagumo', 'gaku', 'uzuki', 'osari'],
  },
  {
    id: 'classroom-of-the-elite',
    name: 'Classroom of the Elite',
    characters: ['suzune', 'kikyo', 'honami', 'arisu', 'ryuen', 'hirata'],
  },
  {
    id: 'wistoria',
    name: 'Wistoria: Wand and Sword',
    characters: ['will', 'sion', 'julius', 'rosti', 'kiki', 'edward'],
  },
];

/**
 * Finds the anime series that contains the given character name
 */
export function findAnimeByCharacter(char: string): AnimeSeries | undefined {
  const clean = char.toLowerCase().trim();
  return ANIME_SERIES.find((series) => series.characters.includes(clean));
}

/**
 * Generates 3 unique character names that ALL belong to the SAME anime series!
 */
export function generatePrivateWords(): [string, string, string] {
  // 1. Pick 1 random anime series
  const animeIndex = Math.floor(Math.random() * ANIME_SERIES.length);
  const targetAnime = ANIME_SERIES[animeIndex];

  // 2. Pick 3 distinct characters from this SAME anime
  const pool = [...targetAnime.characters];
  const selected: string[] = [];

  while (selected.length < 3 && pool.length > 0) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const word = pool.splice(randomIndex, 1)[0].toLowerCase().trim();
    if (!selected.includes(word)) {
      selected.push(word);
    }
  }

  return [selected[0], selected[1], selected[2]];
}

/**
 * Returns 6 shuffled names:
 * - The 3 correct names (all from the room's anime series)
 * - 3 decoy names chosen from DIFFERENT anime series
 */
export function getShuffledPhrasesWithDecoys(correctWords: string[]): string[] {
  const cleanCorrect = correctWords.map((w) => w.toLowerCase().trim());

  // Determine the anime of the correct words
  let correctAnimeId: string | null = null;
  for (const word of cleanCorrect) {
    const found = findAnimeByCharacter(word);
    if (found) {
      correctAnimeId = found.id;
      break;
    }
  }

  // Filter out the correct anime to get other different animes
  const otherAnimes = ANIME_SERIES.filter((series) => series.id !== correctAnimeId);

  // Pick 3 different animes from the remaining pool
  const shuffledOtherAnimes = [...otherAnimes];
  for (let i = shuffledOtherAnimes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOtherAnimes[i], shuffledOtherAnimes[j]] = [shuffledOtherAnimes[j], shuffledOtherAnimes[i]];
  }

  // Take 1 character from each of the 3 different animes as decoys
  const decoys: string[] = [];
  for (let i = 0; i < 3 && i < shuffledOtherAnimes.length; i++) {
    const anime = shuffledOtherAnimes[i];
    const available = anime.characters.filter((c) => !cleanCorrect.includes(c) && !decoys.includes(c));
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      decoys.push(pick);
    }
  }

  // Combine the 3 correct names + 3 decoys
  const combined = [...cleanCorrect, ...decoys];

  // Fisher-Yates shuffle
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined;
}

/**
 * Checks if selected candidate words match the room's secret words (order-independent)
 */
export function verifyPrivateWords(
  actualWords: string[] | undefined,
  candidateWords: string[]
): boolean {
  if (!actualWords || actualWords.length !== 3) return false;
  if (!candidateWords || candidateWords.length !== 3) return false;

  const actualSet = new Set(actualWords.map((w) => w.toLowerCase().trim()));
  const candidateSet = new Set(candidateWords.map((w) => w.toLowerCase().trim()));

  if (actualSet.size !== 3 || candidateSet.size !== 3) return false;

  for (const word of candidateSet) {
    if (!actualSet.has(word)) {
      return false;
    }
  }

  return true;
}

/**
 * Simple obfuscation / cipher helper for CTF clues
 */
export function encodeVaultCipher(words: string[]): string {
  try {
    const payload = words.join('::');
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(payload).toString('base64');
    }
    return btoa(payload);
  } catch {
    return words.join('::');
  }
}

export function decodeVaultCipher(cipher: string): string[] {
  try {
    let decoded = '';
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(cipher, 'base64').toString('utf-8');
    } else {
      decoded = atob(cipher);
    }
    return decoded.split('::');
  } catch {
    return [];
  }
}
