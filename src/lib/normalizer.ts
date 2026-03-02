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
 * Month name mapping for written dates in multiple languages.
 */
const MONTH_NAMES: Record<string, string> = {
  // English
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  // Portuguese
  janeiro: '01', fevereiro: '02', março: '03', marco: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
  // Spanish
  enero: '01', febrero: '02', marzo: '03', mayo: '05', junio: '06',
  julio: '07', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  // French
  janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', août: '08', aout: '08', décembre: '12', decembre: '12',
  // German
  januar: '01', februar: '02', märz: '03', marz: '03', juni: '06',
  juli: '07', oktober: '10', dezember: '12',
};

/**
 * Normalize a date string to DD/MM/YYYY format.
 * Supports: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, written dates in PT/EN/ES/FR/DE, Excel serial numbers.
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

  // Written date: "January 5, 2025" or "5 January 2025" or "5 Jan 25"
  // Also handles "Tue, MAY 27, 2025" format
  const writtenMatch1 = s.match(/^(?:\w{2,3},?\s+)?([A-Za-zÀ-ÿ]+)\s+(\d{1,2}),?\s+(\d{2,4})$/i);
  if (writtenMatch1) {
    const mm = MONTH_NAMES[writtenMatch1[1].toLowerCase()];
    if (mm) {
      const dd = writtenMatch1[2].padStart(2, '0');
      const year = writtenMatch1[3].length === 2 ? `20${writtenMatch1[3]}` : writtenMatch1[3];
      return `${dd}/${mm}/${year}`;
    }
  }

  const writtenMatch2 = s.match(/^(\d{1,2})\s+(?:de\s+)?([A-Za-zÀ-ÿ]+)\s+(?:de\s+)?(\d{2,4})$/i);
  if (writtenMatch2) {
    const mm = MONTH_NAMES[writtenMatch2[2].toLowerCase()];
    if (mm) {
      const dd = writtenMatch2[1].padStart(2, '0');
      const year = writtenMatch2[3].length === 2 ? `20${writtenMatch2[3]}` : writtenMatch2[3];
      return `${dd}/${mm}/${year}`;
    }
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
