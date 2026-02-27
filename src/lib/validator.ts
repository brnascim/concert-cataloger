/**
 * Line validation utilities — Module 7.2
 * Rejects empty, corrupt, or noise lines before output.
 */
import type { ShowEntry, SongEntry } from './types';

const INVALID_TITLE_PATTERNS = [
  /^\d+$/,                        // Only numbers
  /^[-–—=_\.]+$/,                // Only separators
  /^(page|página)\s*\d+$/i,     // Page numbers
  /^\s*$/,                        // Only whitespace
  /^[♦◆▲▼●○□■\?]{3,}/,         // Corrupted text
  /^[^\w\s]{3,}$/,               // 3+ consecutive non-word non-space chars
];

export function isValidShow(show: ShowEntry): boolean {
  const hasArtist = show.artist?.trim().length > 0;
  const hasDate = show.date?.trim().length > 0;
  if (!hasArtist && !hasDate) return false;

  // At least some field must have content
  const anyField = [show.artist, show.date, show.territory, show.city, show.venue]
    .some(v => v?.trim().length > 0);
  return anyField;
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
