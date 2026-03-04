/**
 * "Informação não localizada" — rule from prompt v1.1
 * Empty fields MUST be replaced with this standard value in all exports.
 * Never leave fields blank, use dashes, or question marks.
 */

import type { Locale } from './i18n';

const INFO_NAO_LOCALIZADA_MAP: Record<string, string> = {
  pt: 'informação não localizada',
  en: 'information not found',
  es: 'información no localizada',
  de: 'Information nicht gefunden',
};

/** Default (Portuguese) for backward compat */
export const INFO_NAO_LOCALIZADA = 'informação não localizada';

/** Get the localized placeholder text */
export function getInfoNaoLocalizada(locale?: Locale | string): string {
  return INFO_NAO_LOCALIZADA_MAP[locale || 'pt'] || INFO_NAO_LOCALIZADA;
}

/**
 * Replace empty/blank/null values with the localized "information not found" text.
 */
export function fillMissing(value: string | null | undefined, locale?: Locale | string): string {
  const placeholder = getInfoNaoLocalizada(locale);
  if (value == null) return placeholder;
  const trimmed = String(value).trim();
  // Also replace any previously set placeholder from other locales
  const allPlaceholders = Object.values(INFO_NAO_LOCALIZADA_MAP);
  if (trimmed === '' || trimmed === '-' || trimmed === '?' || trimmed === 'N/A' || trimmed === 'n/a' || allPlaceholders.includes(trimmed.toLowerCase())) {
    return placeholder;
  }
  // Check case-insensitive match against all locale placeholders
  const lower = trimmed.toLowerCase();
  for (const ph of allPlaceholders) {
    if (lower === ph.toLowerCase()) return placeholder;
  }
  return trimmed;
}

/**
 * Normalize composer separators to " / " format.
 * Converts commas, "and", "e", "und", "&", "y" between names to " / ".
 */
export function normalizeComposers(raw: string, locale?: Locale | string): string {
  const placeholder = getInfoNaoLocalizada(locale);
  if (!raw || !raw.trim()) return placeholder;
  let result = raw.trim();
  // Check if it's any locale's placeholder
  const allPlaceholders = Object.values(INFO_NAO_LOCALIZADA_MAP);
  if (allPlaceholders.some(ph => result.toLowerCase() === ph.toLowerCase())) return placeholder;
  // Replace common separators with " / "
  result = result.replace(/\s*[,&]\s*/g, ' / ');
  result = result.replace(/\s+(?:and|e|und|et|y)\s+/gi, ' / ');
  // Clean up double slashes
  result = result.replace(/\s*\/\s*\/\s*/g, ' / ');
  result = result.replace(/\s*\/\s*/g, ' / ');
  return result.trim() || placeholder;
}
