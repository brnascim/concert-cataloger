/**
 * CSV/Data sanitization pipeline — Corrections 1-8 + Quality scoring (M3/M4)
 * Applies all corrections in sequence to ProcessedData before export.
 */
import type { ProcessedData, ShowEntry, SongEntry, SetlistData } from './types';
import { normalizeDate } from './normalizer';
import { inferTerritoryFromComment } from './territory';

// ─── CORRECTION 1: Detect date or tour name in Artist field ──────────────

function isDateInArtist(value: string): boolean {
  if (!value) return false;
  return /^\d{2}[-\/\.]\d{2}[-\/\.]\d{4}$/.test(value.trim());
}

function isTourInArtist(value: string): boolean {
  if (!value) return false;
  const keywords = ['tour', 'support', 'north america', 'europe',
    'headliner', 'uk tour', 'festival', 'presents'];
  const lower = value.toLowerCase();
  return keywords.some(k => lower.includes(k)) && !/\d{2}[-\/]\d{2}/.test(lower);
}

// ─── CORRECTION 2: Detect venue/label text in Date field ─────────────────

function isVenueInDate(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  // Starts with a digit = likely a date
  if (/^\d/.test(v)) return false;
  // Day abbreviation pattern like "Mon, " = date
  if (/^\w{3},\s/.test(v)) return false;
  // Looks like a venue name (letters, spaces, no date separators)
  return /^[A-Za-zÀ-ÿ][\w\s\/\-\.]+$/.test(v) && v.length > 3;
}

// ─── CORRECTION 5: BMG Control normalization ─────────────────────────────

const BMG_MAP: Record<string, string> = {
  'YES': 'Y', 'NO': 'N', 'SI': 'Y', 'SIM': 'Y',
  'NÃO': 'N', 'NAO': 'N', '1': 'Y', '0': 'N',
  'Y': 'Y', 'N': 'N',
};

function normalizeBmgControl(val: string): string {
  if (!val) return '';
  const upper = val.trim().toUpperCase();
  return BMG_MAP[upper] ?? '';
}

// ─── CORRECTION 7: Cancelled shows ──────────────────────────────────────

function handleCancelledVenue(show: ShowEntry): ShowEntry {
  if (!show.venue) return show;
  const cancelMatch = show.venue.match(/\[CANCELLED\]\s*/i);
  if (cancelMatch) {
    return {
      ...show,
      venue: show.venue.replace(/\[CANCELLED\]\s*/i, '').trim(),
      comments: ((show.comments || '') + ' [SHOW CANCELADO]').trim(),
    };
  }
  return show;
}

// ─── CORRECTION 8: DJ BPM/Key extraction ─────────────────────────────────

function extractBpmKey(title: string): { cleanTitle: string; techNote: string } {
  if (!title) return { cleanTitle: title, techNote: '' };
  const match = title.match(/\b(\d{3})\s+(\d+[AB])\b(.*)$/);
  if (match) {
    const bpm = match[1];
    const key = match[2];
    const rest = match[3].trim();
    const base = title.substring(0, match.index).trim();
    let note = `BPM: ${bpm} | Key: ${key}`;
    if (rest) note += ` | ${rest}`;
    return { cleanTitle: base, techNote: note };
  }
  return { cleanTitle: title, techNote: '' };
}

// ─── M3: Quality score per row ──────────────────────────────────────────

export interface QualityScore {
  score: number;
  issues: string[];
}

export function calculateShowQuality(show: ShowEntry): QualityScore {
  let score = 100;
  const issues: string[] = [];
  if (!show.artist?.trim()) { score -= 30; issues.push('Artist missing'); }
  if (!show.date?.trim()) { score -= 25; issues.push('Date missing'); }
  if (!show.city?.trim()) { score -= 5; issues.push('City missing'); }
  if (!show.venue?.trim()) { score -= 5; issues.push('Venue missing'); }
  return { score: Math.max(score, 0), issues };
}

export function calculateSongQuality(song: SongEntry): QualityScore {
  let score = 100;
  const issues: string[] = [];
  if (!song.songTitle?.trim()) { score -= 30; issues.push('Song Title missing'); }
  if (!song.composers?.trim()) { score -= 3; issues.push('Composer missing'); }
  if (!song.bmgControl?.trim()) { score -= 2; issues.push('BMG Control missing'); }
  return { score: Math.max(score, 0), issues };
}

// ─── M4: Quality report by artist ───────────────────────────────────────

export interface ArtistQualityReport {
  artist: string;
  totalLines: number;
  datePercent: number;
  cityPercent: number;
  venuePercent: number;
  composerPercent: number;
  bmgPercent: number;
  avgScore: number;
}

export function generateArtistQualityReport(data: ProcessedData): ArtistQualityReport[] {
  const artistMap = new Map<string, {
    total: number; hasDate: number; hasCity: number; hasVenue: number;
    hasComposer: number; hasBmg: number; scoreSum: number;
  }>();

  for (const show of data.shows) {
    const artist = show.artist || '(Unknown)';
    const entry = artistMap.get(artist) || {
      total: 0, hasDate: 0, hasCity: 0, hasVenue: 0,
      hasComposer: 0, hasBmg: 0, scoreSum: 0,
    };

    const setlist = data.setlists.find(sl => sl.number === show.setListNumber);
    const songCount = setlist?.songs.length || 1;

    entry.total += songCount;
    if (show.date?.trim()) entry.hasDate += songCount;
    if (show.city?.trim()) entry.hasCity += songCount;
    if (show.venue?.trim()) entry.hasVenue += songCount;

    if (setlist) {
      for (const song of setlist.songs) {
        if (song.composers?.trim()) entry.hasComposer++;
        if (song.bmgControl?.trim()) entry.hasBmg++;
        entry.scoreSum += calculateSongQuality(song).score;
      }
    }

    artistMap.set(artist, entry);
  }

  return [...artistMap.entries()].map(([artist, e]) => ({
    artist,
    totalLines: e.total,
    datePercent: e.total > 0 ? Math.round((e.hasDate / e.total) * 100) : 0,
    cityPercent: e.total > 0 ? Math.round((e.hasCity / e.total) * 100) : 0,
    venuePercent: e.total > 0 ? Math.round((e.hasVenue / e.total) * 100) : 0,
    composerPercent: e.total > 0 ? Math.round((e.hasComposer / e.total) * 100) : 0,
    bmgPercent: e.total > 0 ? Math.round((e.hasBmg / e.total) * 100) : 0,
    avgScore: e.total > 0 ? Math.round(e.scoreSum / e.total) : 0,
  })).sort((a, b) => b.totalLines - a.totalLines);
}

// ─── MAIN SANITIZATION PIPELINE ─────────────────────────────────────────

export interface SanitizationReport {
  correction1_dateInArtist: number;
  correction1_tourInArtist: number;
  correction2_venueInDate: number;
  correction3_metadataPropagated: number;
  correction4_duplicatesRemoved: number;
  correction5_bmgNormalized: number;
  correction6_datesNormalized: number;
  correction7_cancelledShows: number;
  correction8_djBpmExtracted: number;
  correction9_territoryInferred: number;
  finalShowCount: number;
  finalSongCount: number;
  artistQuality: ArtistQualityReport[];
}

export function sanitizeData(data: ProcessedData): { data: ProcessedData; report: SanitizationReport } {
  const report: SanitizationReport = {
    correction1_dateInArtist: 0, correction1_tourInArtist: 0,
    correction2_venueInDate: 0, correction3_metadataPropagated: 0,
    correction4_duplicatesRemoved: 0, correction5_bmgNormalized: 0,
    correction6_datesNormalized: 0, correction7_cancelledShows: 0,
    correction8_djBpmExtracted: 0, correction9_territoryInferred: 0,
    finalShowCount: 0, finalSongCount: 0,
    artistQuality: [],
  };

  let shows = data.shows.map(s => ({ ...s }));
  let setlists = data.setlists.map(sl => ({
    ...sl,
    songs: sl.songs.map(s => ({ ...s })),
  }));

  // ── Correction 1: Date/tour in Artist field ──
  for (const show of shows) {
    if (isDateInArtist(show.artist)) {
      if (!show.date) show.date = normalizeDate(show.artist);
      show.artist = '';
      report.correction1_dateInArtist++;
    } else if (isTourInArtist(show.artist)) {
      show.comments = ((show.comments || '') + ` [Tour: ${show.artist}]`).trim();
      show.artist = '';
      report.correction1_tourInArtist++;
    }
  }

  // ── Correction 2: Venue/label in Date field ──
  for (const show of shows) {
    if (isVenueInDate(show.date)) {
      if (!show.venue) show.venue = show.date;
      show.date = '';
      report.correction2_venueInDate++;
    }
  }

  // ── Correction 3: Forward-fill metadata by Set List # ──
  const bySetlist = new Map<number, ShowEntry[]>();
  for (const show of shows) {
    const list = bySetlist.get(show.setListNumber) || [];
    list.push(show);
    bySetlist.set(show.setListNumber, list);
  }
  for (const group of bySetlist.values()) {
    let anchor: ShowEntry | null = null;
    for (const show of group) {
      if (show.artist && show.date) {
        anchor = show;
      } else if (anchor) {
        const fields = ['artist', 'date', 'territory', 'city', 'venue'] as const;
        for (const f of fields) {
          if (!show[f] && anchor[f]) {
            (show as any)[f] = anchor[f];
            report.correction3_metadataPropagated++;
          }
        }
      }
    }
  }

  // ── Correction 4: Deduplicate ──
  const seen = new Set<string>();
  const dedupedShows: ShowEntry[] = [];
  for (const show of shows) {
    const key = `${show.artist}|${show.date}|${show.venue}|${show.setListNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedShows.push(show);
    } else {
      report.correction4_duplicatesRemoved++;
    }
  }
  shows = dedupedShows;

  // ── Correction 5: BMG Control normalization ──
  for (const sl of setlists) {
    for (const song of sl.songs) {
      const before = song.bmgControl;
      song.bmgControl = normalizeBmgControl(song.bmgControl);
      if (before && before !== song.bmgControl) report.correction5_bmgNormalized++;
    }
  }

  // ── Correction 6: Date normalization (extended) ──
  for (const show of shows) {
    if (!show.date) continue;
    const original = show.date;
    // Handle "Tue, MAY 27, 2025" format
    const engDateMatch = show.date.match(/^\w{2,3},\s+([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
    if (engDateMatch) {
      const MONTHS: Record<string, string> = {
        JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
        JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
      };
      const mm = MONTHS[engDateMatch[1].toUpperCase()] || '01';
      const dd = engDateMatch[2].padStart(2, '0');
      show.date = `${dd}/${mm}/${engDateMatch[3]}`;
    } else {
      show.date = normalizeDate(show.date);
    }
    if (show.date !== original) report.correction6_datesNormalized++;
  }

  // ── Correction 7: Cancelled shows ──
  shows = shows.map(show => {
    const fixed = handleCancelledVenue(show);
    if (fixed !== show) report.correction7_cancelledShows++;
    return fixed;
  });

  // ── Correction 8: DJ BPM/Key extraction ──
  for (const sl of setlists) {
    for (const song of sl.songs) {
      const { cleanTitle, techNote } = extractBpmKey(song.songTitle);
      if (techNote) {
        song.songTitle = cleanTitle;
        song.comments = ((song.comments || '') + ` ${techNote}`).trim();
        report.correction8_djBpmExtracted++;
      }
    }
  }

  // ── Correction 9: Infer territory from comments (M16) ──
  for (const show of shows) {
    const before = show.territory;
    show.territory = inferTerritoryFromComment(show.comments, show.territory);
    if (show.territory !== before && show.territory) {
      report.correction9_territoryInferred++;
    }
  }

  // Remove shows with no artist AND no date AND no associated songs
  shows = shows.filter(s => s.artist || s.date);

  report.finalShowCount = shows.length;
  report.finalSongCount = setlists.reduce((sum, sl) => sum + sl.songs.length, 0);

  const sanitized: ProcessedData = {
    ...data,
    shows,
    setlists,
  };

  report.artistQuality = generateArtistQualityReport(sanitized);

  return { data: sanitized, report };
}
