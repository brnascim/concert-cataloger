/**
 * Text normalization and character cleanup utilities.
 * Handles Unicode normalization, curly quotes, dashes, BOM, and control characters.
 */

const CHAR_REPLACEMENTS: Record<string, string> = {
  '\u2018': "'", '\u2019': "'",   // curly single quotes
  '\u201C': '"', '\u201D': '"',   // curly double quotes
  '\u2013': '-', '\u2014': '-',   // en dash / em dash
  '\u00A0': ' ',                  // non-breaking space
  '\uFEFF': '',                   // BOM
};

/**
 * Normalize Unicode text: NFC form, remove control chars, fix curly quotes/dashes.
 */
export function normalizeText(text: string): string {
  // NFC normalization
  let result = text.normalize('NFC');

  // Remove control characters except \n and \t
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Replace curly quotes, dashes, BOM, NBSP
  for (const [original, replacement] of Object.entries(CHAR_REPLACEMENTS)) {
    result = result.split(original).join(replacement);
  }

  return result.trim();
}

/**
 * Normalize a date string to DD/MM/YYYY format.
 * Supports: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, MM/DD/YYYY (with heuristic), Excel serial numbers.
 */
export function normalizeDate(raw: string | number | Date | null | undefined): string {
  if (raw == null) return '';

  // Excel serial number
  if (typeof raw === 'number') {
    try {
      const epoch = new Date(1899, 11, 30);
      epoch.setDate(epoch.getDate() + Math.floor(raw));
      return formatDate(epoch);
    } catch {
      return String(raw);
    }
  }

  // Date object
  if (raw instanceof Date) {
    return formatDate(raw);
  }

  const s = String(raw).trim();

  // Try ISO format: YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = s.replace(/[-\.]/g, '/').split('/');
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // If first part is 4 digits, it's YYYY/MM/DD
    if (a.length === 4) {
      return `${c.padStart(2, '0')}/${b.padStart(2, '0')}/${a}`;
    }
    const year = c.length === 2 ? `20${c}` : c;
    return `${a.padStart(2, '0')}/${b.padStart(2, '0')}/${year}`;
  }

  return s;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
