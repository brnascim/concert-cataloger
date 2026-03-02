/**
 * Line validation utilities — Module 7.2 (v1.3)
 * Rejects empty, corrupt, or noise lines before output.
 * A show is valid if it has at least a Date OR a Venue.
 */
import type { ShowEntry, SongEntry } from './types';

const INVALID_TITLE_PATTERNS = [
  /^\d+$/,                        // Only numbers
  /^[-–—=_\.]+$/,                // Only separators
  /^(page|página)\s*\d+$/i,     // Page numbers
  /^\s*$/,                        // Only whitespace
  /^[♦◆▲▼●○□■\?]{3,}/,         // Corrupted text
  /^[^\w\s]{3,}$/,               // 3+ consecutive non-word non-space chars
  /^\d{1,3}\s*$/,                // Standalone small numbers (page refs)
  /^(copyright|©|all rights|terms|conditions|disclaimer)/i, // Legal text
  /^(total|subtotal|page\s+\d|pg\.\s*\d)/i, // Footers
];

/** Noise patterns that should never be treated as show entries */
const NOISE_LINE_PATTERNS = [
  /^(copyright|©|all rights reserved|terms|conditions|disclaimer|confidential)/i,
  /^(page|pg\.?|p\.?)\s*\d+/i,
  /^(total|subtotal|grand total)/i,
  /^\d+\s*of\s*\d+$/i,
  /^(printed|generated|created)\s+(on|at|by)/i,
  /^(www\.|http|email|tel:|fax:|phone)/i,
];

export function isValidShow(show: ShowEntry): boolean {
  // A show must have at least a Date or a Venue
  const hasDate = show.date?.trim().length > 0;
  const hasVenue = show.venue?.trim().length > 0;
  
  if (!hasDate && !hasVenue) return false;

  // Reject if all main fields look like noise
  const mainFields = [show.artist, show.date, show.territory, show.city, show.venue];
  const hasAnySubstantive = mainFields.some(v => {
    if (!v || !v.trim()) return false;
    return !NOISE_LINE_PATTERNS.some(p => p.test(v.trim()));
  });

  return hasAnySubstantive;
}

export function isValidSongTitle(title: string): boolean {
  if (!title || title.trim().length === 0) return false;
  const trimmed = title.trim();
  if (trimmed.length < 2) return false;
  return !INVALID_TITLE_PATTERNS.some(p => p.test(trimmed));
}

export function isCorruptedText(text: string): boolean {
  if (!text || text.length < 10) return false;
  const strangeChars = [...text].filter(c => c.charCodeAt(0) > 127 || '♦◆▲▼●○□■'.includes(c)).length;
  return (strangeChars / text.length) > 0.15;
}

/** Check if a line is pure noise (footer, legal, page number) */
export function isNoiseLine(line: string): boolean {
  if (!line || !line.trim()) return true;
  const trimmed = line.trim();
  return NOISE_LINE_PATTERNS.some(p => p.test(trimmed));
}
