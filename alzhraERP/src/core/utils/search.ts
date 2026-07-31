/**
 * Search utilities for Arabic text normalization, spell correction,
 * similarity scoring, and client-side filtering.
 * Extracted from useProducts.ts to be shared across all inventory search boxes.
 */

/**
 * Normalize Arabic characters for more flexible matching:
 * - أإآ → ا
 * - ة → ه
 * - ى → ي
 * - ئ → ي
 * - ؤ → و
 * - Remove Harakat (diacritics)
 * - Normalize Tatweel (ـ)
 * - Normalize various Arabic presentation forms
 */
export const normalizeArabic = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ـ/g, '') // Remove Tatweel (kashida)
        .replace(/[\u064B-\u065F\u0670]/g, ''); // Remove Harakat + Superscript Alef
};

/**
 * Normalize and lower-case a string for search comparison.
 */
export const normalizeSearch = (text: string): string => {
    return normalizeArabic(text).toLowerCase();
};

/**
 * Common Arabic spelling mistakes and phonetic alternatives.
 * Maps common misspellings to correct forms for fuzzy matching.
 */
const ARABIC_SPELLING_VARIANTS: Record<string, string[]> = {
    // Alif/Hamza confusion patterns
    'ا': ['أ', 'إ', 'آ', 'ا'],
    'ه': ['ة', 'ه'],
    'ي': ['ى', 'ي', 'ئ'],
    'و': ['ؤ', 'و'],
    // Common letter confusions in dialects
    'ظ': ['ض', 'ظ'],
    'ض': ['ظ', 'ض'],
    'ذ': ['ز', 'ذ'],
    'ز': ['ذ', 'ز'],
    'ث': ['س', 'ث'],
    'س': ['ث', 'س'],
    'ق': ['ك', 'ق'],
    'ك': ['ق', 'ك'],
};

/**
 * Generate spelling variants for a token to support fuzzy search.
 * Expands each character to its possible variants.
 */
export const generateSpellingVariants = (token: string): string[] => {
    if (token.length <= 1) return [token];

    const variants: string[] = [token];
    const chars = [...token];

    // Generate single-character substitution variants
    for (let i = 0; i < chars.length; i++) {
        const variants_for_char = ARABIC_SPELLING_VARIANTS[chars[i]];
        if (variants_for_char && variants_for_char.length > 1) {
            for (const v of variants_for_char) {
                if (v !== chars[i]) {
                    const variant = [...chars];
                    variant[i] = v;
                    variants.push(variant.join(''));
                }
            }
        }
    }

    // Remove duplicates
    return [...new Set(variants)];
};

/**
 * Calculate Levenshtein distance between two strings.
 * Used for spell correction and fuzzy matching.
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Calculate similarity score between two strings (0.0 to 1.0).
 * Uses normalized Levenshtein distance.
 */
export const stringSimilarity = (a: string, b: string): number => {
    const aNorm = normalizeSearch(a);
    const bNorm = normalizeSearch(b);
    const maxLen = Math.max(aNorm.length, bNorm.length);
    if (maxLen === 0) return 1.0;
    const distance = levenshteinDistance(aNorm, bNorm);
    return 1 - distance / maxLen;
};

/**
 * Check if a haystack contains all search tokens (AND matching)
 * with optional fuzzy matching support.
 * Both haystack and tokens are normalized automatically.
 */
export const matchesArabicSearch = (
    haystack: string,
    searchTerm: string,
    options: { fuzzy?: boolean; threshold?: number } = {}
): boolean => {
    if (!searchTerm.trim()) return true;

    const tokens = normalizeSearch(searchTerm)
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length === 0) return true;

    const normalizedHaystack = normalizeSearch(haystack);

    if (options.fuzzy) {
        const threshold = options.threshold ?? 0.7;
        return tokens.every((token) => {
            // Exact match first
            if (normalizedHaystack.includes(token)) return true;

            // Try spelling variants
            const variants = generateSpellingVariants(token);
            if (variants.some(v => normalizedHaystack.includes(v))) return true;

            // Fuzzy substring match using sliding window
            if (token.length >= 3 && normalizedHaystack.length >= token.length) {
                for (let i = 0; i <= normalizedHaystack.length - token.length; i++) {
                    const substring = normalizedHaystack.substring(i, i + token.length);
                    if (stringSimilarity(token, substring) >= threshold) {
                        return true;
                    }
                }
            }

            return false;
        });
    }

    return tokens.every((token) => normalizedHaystack.includes(token));
};

/**
 * Client-side filter helper for arrays with Arabic support.
 * Extracts a searchable string from each item using the provided getter.
 */
export const filterByArabicSearch = <T,>(
    items: T[],
    searchTerm: string,
    getSearchableText: (item: T) => string,
    options: { fuzzy?: boolean } = {}
): T[] => {
    if (!searchTerm.trim()) return items;

    const tokens = normalizeSearch(searchTerm)
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length === 0) return items;

    return items.filter((item) => {
        const text = normalizeSearch(getSearchableText(item));
        if (options.fuzzy) {
            return matchesArabicSearch(text, searchTerm, { fuzzy: true });
        }
        return tokens.every((token) => text.includes(token));
    });
};

/**
 * Score a search result for relevance ranking.
 * Higher score = more relevant result.
 */
export const scoreSearchResult = (
    searchTerm: string,
    item: {
        name_ar?: string;
        name?: string;
        sku?: string;
        part_number?: string;
        brand?: string;
        alternative_numbers?: string;
    },
    salesCount?: number,
    lastSaleDate?: string
): number => {
    if (!searchTerm.trim()) return 0;

    const tokens = normalizeSearch(searchTerm).split(/\s+/).filter(Boolean);
    const name = normalizeSearch(item.name_ar || item.name || '');
    const sku = normalizeSearch(item.sku || '');
    const partNumber = normalizeSearch(item.part_number || '');
    const brand = normalizeSearch(item.brand || '');
    const alternatives = normalizeSearch(item.alternative_numbers || '');

    let score = 0;

    for (const token of tokens) {
        // Exact name match: highest score
        if (name === token) {
            score += 100;
        } else if (name.startsWith(token)) {
            score += 50; // Name starts with token
        } else if (name.includes(token)) {
            score += 25; // Name contains token
        } else if (sku === token) {
            score += 80; // Exact SKU match
        } else if (partNumber === token) {
            score += 80; // Exact part number match
        } else if (alternatives.includes(token)) {
            score += 40; // Alternative number match
        } else if (brand.includes(token)) {
            score += 15; // Brand match
        }
    }

    // Boost by sales popularity (logarithmic to prevent domination)
    if (salesCount && salesCount > 0) {
        score += Math.min(Math.log2(salesCount + 1) * 5, 30);
    }

    // Boost recently sold items
    if (lastSaleDate) {
        const daysSinceLastSale = (Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSale < 7) score += 20;
        else if (daysSinceLastSale < 30) score += 10;
        else if (daysSinceLastSale < 90) score += 5;
    }

    return score;
};
