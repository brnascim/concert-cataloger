/**
 * M17: Fuzzy search utilities (pure JS, no Python dependencies).
 * Implements Levenshtein distance, trigram similarity, and Jaro-Winkler.
 */

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Jaro-Winkler similarity (0-1). Best for proper names (composers).
 */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler adjustment (prefix bonus)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Token set ratio: handles word reordering (like RapidFuzz's token_set_ratio).
 */
function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
  const union = new Set([...tokensA, ...tokensB]);

  if (union.size === 0) return 0;

  // Jaccard-like but also consider Levenshtein on joined tokens
  const sortedA = [...tokensA].sort().join(' ');
  const sortedB = [...tokensB].sort().join(' ');

  const maxLen = Math.max(sortedA.length, sortedB.length);
  if (maxLen === 0) return 100;

  const dist = levenshtein(sortedA, sortedB);
  return Math.round((1 - dist / maxLen) * 100);
}

export type FuzzyMatchType = 'fuzzy' | 'jaro_winkler' | 'exact' | 'partial';

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

/**
 * Fuzzy search on an array of items.
 */
export function fuzzySearch<T>(
  items: T[],
  getText: (item: T) => string,
  query: string,
  options: {
    type?: FuzzyMatchType;
    threshold?: number;
    limit?: number;
  } = {}
): FuzzyResult<T>[] {
  const { type = 'fuzzy', threshold = 60, limit = 500 } = options;
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return items.map(item => ({ item, score: 100 }));

  const scored: FuzzyResult<T>[] = [];

  for (const item of items) {
    const text = getText(item).toLowerCase().trim();
    let score: number;

    switch (type) {
      case 'exact':
        score = text === queryLower ? 100 : 0;
        break;
      case 'partial':
        score = text.includes(queryLower) ? 90 : queryLower.includes(text) ? 70 : 0;
        break;
      case 'jaro_winkler':
        score = Math.round(jaroWinkler(queryLower, text) * 100);
        break;
      case 'fuzzy':
      default:
        score = tokenSetRatio(queryLower, text);
        break;
    }

    if (score >= threshold) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Check if any fuzzy results contain variant spellings different from the query.
 */
export function findVariants<T>(
  results: FuzzyResult<T>[],
  getText: (item: T) => string,
  query: string,
  maxVariants = 3
): string[] {
  const queryLower = query.toLowerCase().trim();
  const variants = new Set<string>();

  for (const r of results) {
    const text = getText(r.item);
    if (text.toLowerCase().trim() !== queryLower && r.score >= 60 && r.score < 100) {
      variants.add(text);
      if (variants.size >= maxVariants) break;
    }
  }

  return [...variants];
}
