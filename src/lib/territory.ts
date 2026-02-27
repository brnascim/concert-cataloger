/**
 * M16: Territory mapping from comments.
 * Auto-infers Territory from Show Comments using comprehensive mapping.
 */

const TERRITORY_MAP: Record<string, string> = {
  // BeNeLux
  'benelux': 'EU', 'bénélux': 'EU', 'be/ne/lux': 'EU',
  'netherlands': 'EU', 'belgium': 'EU', 'luxembourg': 'EU', 'holland': 'EU',

  // European countries
  'germany': 'EU', 'deutschland': 'EU', 'france': 'EU',
  'spain': 'EU', 'espagne': 'EU', 'italia': 'EU', 'italy': 'EU',
  'austria': 'EU', 'switzerland': 'EU', 'schweiz': 'EU', 'suisse': 'EU',
  'portugal': 'EU', 'scandinavia': 'EU', 'nordics': 'EU', 'nordic': 'EU',
  'poland': 'EU', 'czech': 'EU', 'hungary': 'EU', 'romania': 'EU',
  'europe': 'EU', 'eu': 'EU', 'europa': 'EU',
  'sweden': 'EU', 'norway': 'EU', 'denmark': 'EU', 'finland': 'EU',
  'czech republic': 'EU', 'greece': 'EU', 'croatia': 'EU',

  // UK
  'uk': 'UK', 'united kingdom': 'UK', 'england': 'UK',
  'scotland': 'UK', 'wales': 'UK', 'ireland': 'UK',
  'britain': 'UK', 'great britain': 'UK',

  // Americas
  'usa': 'USA', 'us': 'USA', 'united states': 'USA', 'north america': 'USA',
  'canada': 'USA',
  'brazil': 'BRA', 'brasil': 'BRA',
  'latin america': 'LATAM', 'latam': 'LATAM',
  'mexico': 'LATAM', 'argentina': 'LATAM',

  // Asia-Pacific
  'japan': 'JPN', 'japão': 'JPN',
  'china': 'CHN',
  'australia': 'AUS', 'oceania': 'AUS',
  'asia': 'ASIA', 'southeast asia': 'ASIA',

  // Publishing / International
  'sub-pub': 'INTL', 'sub pub': 'INTL', 'publishing': 'INTL',
  'worldwide': 'INTL', 'world': 'INTL', 'international': 'INTL', 'global': 'INTL',
};

const VALID_TERRITORIES = new Set([
  'EU', 'UK', 'USA', 'JPN', 'CHN', 'BRA', 'AUS', 'LATAM', 'ASIA', 'INTL', 'MEX', 'CAN',
]);

/**
 * Infer territory from a comment string. Only fills if currentTerritory is empty.
 */
export function inferTerritoryFromComment(comment: string, currentTerritory: string): string {
  if (currentTerritory && currentTerritory.trim()) return currentTerritory;
  if (!comment || !comment.trim()) return currentTerritory;

  const lower = comment.toLowerCase().trim();

  // Exact match first
  if (TERRITORY_MAP[lower]) return TERRITORY_MAP[lower];

  // Partial match (comment may contain more text)
  for (const [key, territory] of Object.entries(TERRITORY_MAP)) {
    if (lower.includes(key)) return territory;
  }

  return currentTerritory;
}

/**
 * Validate a territory value against known codes.
 */
export function validateTerritory(value: string): string {
  if (!value || !value.trim()) return '';
  const upper = value.trim().toUpperCase();
  if (VALID_TERRITORIES.has(upper)) return upper;
  // Try mapping
  return TERRITORY_MAP[value.toLowerCase().trim()] || value;
}

/**
 * Infer territory from any text (city, venue, comments).
 */
export function inferTerritory(text: string): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(TERRITORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return '';
}
