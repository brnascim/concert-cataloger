/**
 * M18: Confidence score calculation for individual records.
 */

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  issues: string[];
}

/**
 * Calculate confidence score for a combined show+song record.
 */
export function calculateConfidence(record: {
  artist?: string;
  date?: string;
  song_title?: string;
  city?: string;
  venue?: string;
  territory?: string;
  composers?: string;
  bmg_control?: string;
  _inferred_territory?: boolean;
  _propagated_metadata?: boolean;
}): ConfidenceResult {
  let score = 100;
  const issues: string[] = [];

  // Critical fields (high penalty)
  if (!record.artist?.trim()) { score -= 35; issues.push('Artist missing'); }
  if (!record.date?.trim()) { score -= 25; issues.push('Date missing'); }
  if (!record.song_title?.trim()) { score -= 35; issues.push('Song title missing'); }

  // Important fields (medium penalty)
  if (!record.city?.trim()) { score -= 5; issues.push('City missing'); }
  if (!record.venue?.trim()) { score -= 5; issues.push('Venue missing'); }
  if (!record.territory?.trim()) { score -= 5; issues.push('Territory missing'); }

  // Editorial fields (low penalty)
  if (!record.composers?.trim()) { score -= 3; issues.push('Composer missing'); }
  if (record.bmg_control && !['Y', 'N'].includes(record.bmg_control)) {
    score -= 2; issues.push('BMG Control undefined');
  }

  // Inferred data penalty
  if (record._inferred_territory) { score -= 5; issues.push('Territory inferred from comments'); }
  if (record._propagated_metadata) { score -= 8; issues.push('Metadata propagated (not original)'); }

  score = Math.max(score, 0);
  const level: ConfidenceLevel = score >= 80 ? 'HIGH' : score >= 55 ? 'MEDIUM' : 'LOW';

  return { score, level, issues };
}
