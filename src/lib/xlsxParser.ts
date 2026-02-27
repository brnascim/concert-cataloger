/**
 * XLSX/XLSM parser: reads workbook, identifies relevant sheets, extracts shows and setlists.
 */
import * as XLSX from 'xlsx';
import type { ShowEntry, SongEntry, SetlistData } from './types';
import { normalizeDate } from './normalizer';

const SETLIST_KEYWORDS = ['set list', 'setlist', 'set_list', 'songs', 'músicas', 'tracklist', 'repertório', 'repertorio', 'playlist'];
const DATES_KEYWORDS = ['dates', 'venues', 'datas', 'shows', 'schedule', 'agenda', 'tour', 'itinerary', 'gigs'];

interface SheetClassification {
  name: string;
  type: 'setlist' | 'dates' | 'unknown';
  data: Record<string, unknown>[];
  headers: string[];
}

function classifySheet(name: string, headers: string[]): 'setlist' | 'dates' | 'unknown' {
  const nameLower = name.toLowerCase();
  const headersLower = headers.map(h => h.toLowerCase());

  const isSetlist = SETLIST_KEYWORDS.some(k => nameLower.includes(k)) ||
    headersLower.some(h => h.includes('song') || h.includes('título') || h.includes('title') || h.includes('track'));

  const isDates = DATES_KEYWORDS.some(k => nameLower.includes(k)) ||
    headersLower.some(h => h.includes('date') || h.includes('venue') || h.includes('city') || h.includes('data'));

  if (isSetlist) return 'setlist';
  if (isDates) return 'dates';
  return 'unknown';
}

// M5: Fuzzy column name matching
const TITLE_COLUMN_ALIASES = [
  'song title', 'title', 'título', 'track', 'faixa', 'música',
  'name', 'song', 'track name', 'track title', 'canção', 'werkname',
];

function fuzzyMatch(candidate: string, targets: string[], cutoff = 0.6): string | null {
  const c = candidate.toLowerCase().trim();
  // Exact substring match first
  for (const t of targets) {
    if (c.includes(t) || t.includes(c)) return t;
  }
  // Simple similarity based on shared characters
  for (const t of targets) {
    const longer = c.length > t.length ? c : t;
    const shorter = c.length > t.length ? t : c;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    if (matches / longer.length >= cutoff) return t;
  }
  return null;
}

function findColumn(headers: string[], ...patterns: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim());
  // Exact substring match
  for (const p of patterns) {
    const idx = lower.findIndex(h => h.includes(p));
    if (idx >= 0) return idx;
  }
  // Fuzzy match fallback
  for (let i = 0; i < lower.length; i++) {
    if (fuzzyMatch(lower[i], patterns)) return i;
  }
  return -1;
}

function findTitleColumn(headers: string[]): number {
  const idx = findColumn(headers, ...TITLE_COLUMN_ALIASES);
  if (idx >= 0) return idx;
  // Heuristic: column with most unique non-empty text values might be title
  return -1;
}

export function parseXlsxContent(binaryString: string, fileName: string): {
  shows: ShowEntry[];
  setlists: SetlistData[];
  alerts: string[];
} {
  const shows: ShowEntry[] = [];
  const setlists: SetlistData[] = [];
  const alerts: string[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(binaryString, { type: 'binary', cellDates: true });
  } catch (e) {
    alerts.push(`[${fileName}]: Erro ao ler arquivo Excel — ${e instanceof Error ? e.message : String(e)}`);
    return { shows, setlists, alerts };
  }

  const sheets: SheetClassification[] = wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    return {
      name,
      type: classifySheet(name, headers),
      data: jsonData,
      headers,
    };
  });

  // Process dates/venues sheets
  for (const sheet of sheets.filter(s => s.type === 'dates')) {
    const h = sheet.headers;
    const iArtist = findColumn(h, 'artist', 'artista', 'banda', 'band');
    const iDate = findColumn(h, 'date', 'data');
    const iTerritory = findColumn(h, 'territory', 'país', 'region', 'região');
    const iCity = findColumn(h, 'city', 'cidade');
    const iVenue = findColumn(h, 'venue', 'local', 'casa de show');
    const iVenueAddr = findColumn(h, 'venue address', 'endereço');
    const iPrsVenue = findColumn(h, 'prs venue');
    const iPromoter = findColumn(h, 'promoter', 'promotor');
    const iComments = findColumn(h, 'comment', 'observ', 'notas');
    const iSetNum = findColumn(h, 'set list number', 'setlist', 'set list #');
    const iHeadliner = findColumn(h, 'headliner y/n', 'headliner');
    const iHeadlinerN = findColumn(h, 'headliner if');

    for (const row of sheet.data) {
      const vals = Object.values(row);
      const get = (idx: number) => idx >= 0 && idx < vals.length ? String(vals[idx] ?? '').trim() : '';

      shows.push({
        artist: get(iArtist),
        date: normalizeDate(vals[iDate >= 0 ? iDate : -1] as string),
        territory: get(iTerritory),
        city: get(iCity),
        venue: get(iVenue),
        venueAddress: get(iVenueAddr),
        prsVenueId: get(iPrsVenue),
        localPromoterContactInfo: get(iPromoter),
        comments: get(iComments),
        setListNumber: parseInt(get(iSetNum)) || 1,
        headlinerYN: get(iHeadliner),
        headlinerIfN: get(iHeadlinerN),
      });
    }
  }

  // Process setlist sheets
  let setlistCounter = 1;
  for (const sheet of sheets.filter(s => s.type === 'setlist')) {
    const h = sheet.headers;
    const iTitle = findTitleColumn(h);
    const iComposer = findColumn(h, 'composer', 'compositor', 'komponist', 'artist', 'artista');
    const iBmg = findColumn(h, 'bmg', 'verlag');
    const iMaestro = findColumn(h, 'maestro', 'code', 'código');
    const iPrs = findColumn(h, 'prs', 'tunecode');
    const iComments = findColumn(h, 'comment', 'observ', 'notas');

    if (iTitle < 0) {
      alerts.push(`[${fileName}/${sheet.name}]: Coluna de título não encontrada — aba ignorada.`);
      continue;
    }

    const songs: SongEntry[] = [];
    for (const row of sheet.data) {
      const vals = Object.values(row);
      const get = (idx: number) => idx >= 0 && idx < vals.length ? String(vals[idx] ?? '').trim() : '';
      const title = get(iTitle);
      if (!title) continue;

      songs.push({
        songTitle: title,
        composers: get(iComposer),
        bmgControl: get(iBmg),
        iMaestroSongCode: get(iMaestro),
        prsTunecode: get(iPrs),
        comments: get(iComments),
      });
    }

    if (songs.length > 0) {
      setlists.push({ number: setlistCounter++, songs });
    }
  }

  // If no classified sheets, try treating all sheets as potential data
  if (shows.length === 0 && setlists.length === 0) {
    alerts.push(`[${fileName}]: Nenhuma aba reconhecida automaticamente — tentando extração genérica.`);
    for (const sheet of sheets.filter(s => s.type === 'unknown' && s.data.length > 0)) {
      const h = sheet.headers;
      const iTitle = findColumn(h, 'song', 'título', 'title', 'track', 'faixa', 'música');
      if (iTitle >= 0) {
        const songs: SongEntry[] = [];
        for (const row of sheet.data) {
          const vals = Object.values(row);
          const title = String(vals[iTitle] ?? '').trim();
          if (title) {
            songs.push({
              songTitle: title,
              composers: '',
              bmgControl: '',
              iMaestroSongCode: '',
              prsTunecode: '',
              comments: '',
            });
          }
        }
        if (songs.length > 0) {
          setlists.push({ number: setlistCounter++, songs });
        }
      }
    }
  }

  return { shows, setlists, alerts };
}
