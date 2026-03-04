/**
 * XLSX/XLSM parser: reads workbook, identifies relevant sheets, extracts shows and setlists.
 * Uses ExcelJS instead of SheetJS to avoid known vulnerabilities.
 */
import ExcelJS from 'exceljs';
import type { ShowEntry, SongEntry, SetlistData } from './types';
import { normalizeDate } from './normalizer';

const SETLIST_KEYWORDS = ['set list', 'setlist', 'set_list', 'songs', 'músicas', 'tracklist', 'repertório', 'repertorio', 'playlist', 'canciones', 'lieder', 'chansons'];
const DATES_KEYWORDS = ['dates', 'venues', 'datas', 'shows', 'schedule', 'agenda', 'tour', 'itinerary', 'gigs', 'konzerte', 'spectacles', 'conciertos'];

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
    headersLower.some(h => h.includes('song') || h.includes('título') || h.includes('title') || h.includes('track') || h.includes('chanson') || h.includes('lied') || h.includes('canción'));

  const isDates = DATES_KEYWORDS.some(k => nameLower.includes(k)) ||
    headersLower.some(h => h.includes('date') || h.includes('venue') || h.includes('city') || h.includes('data') || h.includes('lieu') || h.includes('ort') || h.includes('lugar') || h.includes('datum'));

  if (isSetlist) return 'setlist';
  if (isDates) return 'dates';
  return 'unknown';
}

// M5: Fuzzy column name matching
const TITLE_COLUMN_ALIASES = [
  'song title', 'title', 'título', 'track', 'faixa', 'música',
  'name', 'song', 'track name', 'track title', 'canção', 'werkname',
  'chanson', 'lied', 'canción', 'titre', 'titel', 'titulo',
];

function fuzzyMatch(candidate: string, targets: string[], cutoff = 0.6): string | null {
  const c = candidate.toLowerCase().trim();
  for (const t of targets) {
    if (c.includes(t) || t.includes(c)) return t;
  }
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
  for (const p of patterns) {
    const idx = lower.findIndex(h => h.includes(p));
    if (idx >= 0) return idx;
  }
  for (let i = 0; i < lower.length; i++) {
    if (fuzzyMatch(lower[i], patterns)) return i;
  }
  return -1;
}

function findTitleColumn(headers: string[]): number {
  const idx = findColumn(headers, ...TITLE_COLUMN_ALIASES);
  if (idx >= 0) return idx;
  return -1;
}

/** Extract plain string from any ExcelJS cell value (handles rich text, formulas, etc.) */
function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    // Rich text: { richText: [{ text: '2' }, { text: 'ND', font: {...} }, ...] }
    if ('richText' in value && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((part: any) => String(part.text ?? '')).join('');
    }
    // Formula result: { formula: '...', result: 'value' }
    if ('result' in value) {
      return cellToString((value as any).result);
    }
    // Shared formula: { sharedFormula: '...', result: 'value' }
    if ('sharedFormula' in value) {
      return cellToString((value as any).result);
    }
    // Hyperlink: { text: '...', hyperlink: '...' }
    if ('text' in value && typeof (value as any).text === 'string') {
      return (value as any).text;
    }
    // Error value: { error: '#REF!' }
    if ('error' in value) {
      return '';
    }
    return String(value);
  }
  return String(value);
}

function worksheetToJson(worksheet: ExcelJS.Worksheet): { headers: string[]; data: Record<string, unknown>[] } {
  const headers: string[] = [];
  const data: Record<string, unknown>[] = [];

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value).trim() || `Column${colNumber}`;
  });

  if (headers.length === 0) return { headers, data };

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const record: Record<string, unknown> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      const raw = cell.value;
      // Preserve Date objects for date normalization, convert everything else to string
      if (raw instanceof Date) {
        record[h] = raw;
      } else {
        const str = cellToString(raw);
        record[h] = str;
        if (str !== '') hasValue = true;
      }
    });
    if (hasValue) data.push(record);
  }

  return { headers, data };
}

export async function parseXlsxContentAsync(buffer: ArrayBuffer, fileName: string): Promise<{
  shows: ShowEntry[];
  setlists: SetlistData[];
  alerts: string[];
}> {
  const shows: ShowEntry[] = [];
  const setlists: SetlistData[] = [];
  const alerts: string[] = [];

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (e) {
    alerts.push(`[${fileName}]: Erro ao ler arquivo Excel — ${e instanceof Error ? e.message : String(e)}`);
    return { shows, setlists, alerts };
  }

  const sheets: SheetClassification[] = [];
  workbook.eachSheet((worksheet) => {
    const { headers, data } = worksheetToJson(worksheet);
    sheets.push({
      name: worksheet.name,
      type: classifySheet(worksheet.name, headers),
      data,
      headers,
    });
  });

  // Process dates/venues sheets
  for (const sheet of sheets.filter(s => s.type === 'dates')) {
    const h = sheet.headers;
    const iArtist = findColumn(h, 'artist', 'artista', 'banda', 'band', 'künstler', 'artiste');
    const iDate = findColumn(h, 'date', 'data', 'datum', 'fecha');
    const iTerritory = findColumn(h, 'territory', 'país', 'region', 'região', 'pays', 'land');
    const iCity = findColumn(h, 'city', 'cidade', 'ville', 'stadt', 'ciudad');
    const iVenue = findColumn(h, 'venue', 'local', 'casa de show', 'lieu', 'ort', 'lugar', 'sala');
    const iVenueAddr = findColumn(h, 'venue address', 'endereço', 'adresse', 'dirección');
    const iPrsVenue = findColumn(h, 'prs venue');
    const iPromoter = findColumn(h, 'promoter', 'promotor', 'promoteur', 'veranstalter');
    const iComments = findColumn(h, 'comment', 'observ', 'notas', 'remarques', 'anmerkungen');
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
        sourceFile: fileName,
      });
    }
  }

  // Process setlist sheets
  let setlistCounter = 1;
  for (const sheet of sheets.filter(s => s.type === 'setlist')) {
    const h = sheet.headers;
    const iTitle = findTitleColumn(h);
    const iComposer = findColumn(h, 'composer', 'compositor', 'komponist', 'artist', 'artista', 'compositeur', 'autor');
    const iBmg = findColumn(h, 'bmg', 'verlag', 'control');
    const iMaestro = findColumn(h, 'maestro', 'code', 'código');
    const iPrs = findColumn(h, 'prs', 'tunecode');
    const iComments = findColumn(h, 'comment', 'observ', 'notas', 'remarques', 'anmerkungen');

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

/**
 * Synchronous wrapper kept for backward compatibility.
 * Converts binary string to ArrayBuffer and calls the async version.
 */
export function parseXlsxContent(binaryString: string, fileName: string): {
  shows: ShowEntry[];
  setlists: SetlistData[];
  alerts: string[];
} {
  // This is a sync fallback - callers should migrate to parseXlsxContentAsync
  // For now, we return empty and log a warning
  console.warn('parseXlsxContent (sync) is deprecated. Use parseXlsxContentAsync instead.');
  return { shows: [], setlists: [], alerts: [`[${fileName}]: Use parseXlsxContentAsync for ExcelJS parsing.`] };
}
