import { normalizeArabic, normalizeArabicDigits } from './search';
import type { Party } from '../../features/parties/types';

/**
 * Normalizes text for search by removing diacritics, unifying hamzas,
 * converting Arabic digits, lowercasing, and trimming whitespace.
 */
export const normalizePartySearch = (text?: string | null): string => {
  if (!text) return '';
  return normalizeArabic(text).toLowerCase().trim();
};

/**
 * Normalizes phone numbers for search by converting Arabic digits,
 * removing non-digits and common country prefixes.
 */
export const normalizePhoneNumber = (phone?: string | null): string => {
  if (!phone) return '';
  // Convert Arabic/Persian digits to standard digits first
  const asciiPhone = normalizeArabicDigits(phone);
  // Remove non-digit characters
  let digits = asciiPhone.replace(/\D/g, '');
  // Remove leading country codes: 00966, 966, 00967, 967, +...
  if (digits.startsWith('00966')) digits = digits.slice(5);
  else if (digits.startsWith('966')) digits = digits.slice(3);
  else if (digits.startsWith('00967')) digits = digits.slice(5);
  else if (digits.startsWith('967')) digits = digits.slice(3);
  // Remove single leading zero if present
  if (digits.startsWith('0') && digits.length > 9) digits = digits.slice(1);
  return digits;
};

/**
 * Checks if query is a subsequence of target (scattered/fragmented characters matching in order).
 * e.g., 'ولنظري' matches 'وائل النظاري'
 */
export const isSubsequence = (query: string, target: string): boolean => {
  if (!query || !target) return false;
  let qIdx = 0;
  let tIdx = 0;
  while (qIdx < query.length && tIdx < target.length) {
    if (query[qIdx] === target[tIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  return qIdx === query.length;
};

/**
 * Evaluates whether a party matches the given query using smart multi-criteria:
 * 1. Exact and normalized token containment (name, category, email, tax_number).
 * 2. Phone number substring / normalized phone matching (supporting Arabic digits).
 * 3. Fuzzy scattered character matching (subsequence across words or compacted text).
 */
export const matchParty = (party: Party, rawQuery: string): { matches: boolean; score: number } => {
  if (!rawQuery.trim()) {
    return { matches: true, score: 0 };
  }

  const cleanQuery = normalizePartySearch(rawQuery);
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
  const queryPhone = normalizeArabicDigits(rawQuery).replace(/\D/g, '');

  const normName = normalizePartySearch(party.name);
  const normCategory = normalizePartySearch(party.category);
  const normEmail = normalizePartySearch(party.email);
  const normTax = normalizePartySearch(party.tax_number);
  const rawPhone = party.phone ?? '';
  const asciiPhone = normalizeArabicDigits(rawPhone);
  const normPhone = normalizePhoneNumber(rawPhone);

  const searchableFullText = `${normName} ${normCategory} ${normEmail} ${normTax} ${asciiPhone}`;

  let score = 0;

  // 1. Phone matching (highest priority when query is purely or partially numeric)
  if (queryPhone.length >= 2 && asciiPhone.length > 0) {
    if (asciiPhone.includes(queryPhone) || normPhone.includes(queryPhone)) {
      score += 150 + queryPhone.length * 10;
      return { matches: true, score };
    }
  }

  // 2. Exact name start or exact match
  if (normName === cleanQuery) {
    return { matches: true, score: 200 };
  }
  if (normName.startsWith(cleanQuery)) {
    score += 120;
  } else if (normName.includes(cleanQuery)) {
    score += 80;
  }

  // 3. Multi-token containment (e.g. 'محمد النظاري')
  const allTokensFound = queryTokens.every(token => {
    if (searchableFullText.includes(token)) return true;
    if (rawPhone.includes(token)) return true;
    // Subsequence check per word if token length >= 3
    if (token.length >= 3) {
      const nameWords = normName.split(/\s+/);
      if (nameWords.some(w => isSubsequence(token, w))) return true;
      if (isSubsequence(token, normName.replace(/\s+/g, ''))) return true;
    }
    return false;
  });

  if (allTokensFound) {
    score += 60 + queryTokens.length * 15;
    return { matches: true, score };
  }

  // 4. Scattered characters / Subsequence match on full compacted name
  // Useful when user types scattered letters e.g. 'ولنظري' for 'وائل النظاري'
  const compactedQuery = cleanQuery.replace(/\s+/g, '');
  const compactedName = normName.replace(/\s+/g, '');

  if (compactedQuery.length >= 3 && isSubsequence(compactedQuery, compactedName)) {
    score += 40 + compactedQuery.length * 5;
    return { matches: true, score };
  }

  return { matches: false, score: 0 };
};

/**
 * Filter and sort parties using smart search scoring.
 */
export const filterPartiesSmart = (parties: Party[], query: string): Party[] => {
  if (!query.trim()) return parties;

  const scored: Array<{ party: Party; score: number }> = [];

  for (const party of parties) {
    const { matches, score } = matchParty(party, query);
    if (matches) {
      scored.push({ party, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.party);
};
