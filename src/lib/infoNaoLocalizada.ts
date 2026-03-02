/**
 * "Informação não localizada" — rule from prompt v1.1
 * Empty fields MUST be replaced with this standard value in all exports.
 * Never leave fields blank, use dashes, or question marks.
 */

export const INFO_NAO_LOCALIZADA = 'informação não localizada';

/**
 * Replace empty/blank/null values with the standard "informação não localizada" text.
 */
export function fillMissing(value: string | null | undefined): string {
  if (value == null) return INFO_NAO_LOCALIZADA;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '?' || trimmed === 'N/A' || trimmed === 'n/a') {
    return INFO_NAO_LOCALIZADA;
  }
  return trimmed;
}

/**
 * Normalize composer separators to " / " format.
 * Converts commas, "and", "e", "und", "&", "y" between names to " / ".
 */
export function normalizeComposers(raw: string): string {
  if (!raw || !raw.trim()) return INFO_NAO_LOCALIZADA;
  let result = raw.trim();
  // Replace common separators with " / "
  result = result.replace(/\s*[,&]\s*/g, ' / ');
  result = result.replace(/\s+(?:and|e|und|et|y)\s+/gi, ' / ');
  // Clean up double slashes
  result = result.replace(/\s*\/\s*\/\s*/g, ' / ');
  result = result.replace(/\s*\/\s*/g, ' / ');
  return result.trim() || INFO_NAO_LOCALIZADA;
}
