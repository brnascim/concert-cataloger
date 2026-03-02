import type { ProcessedData, ShowEntry, SongEntry, SetlistData, UploadedFile, FileStatus } from './types';
import { isValidShow, isValidSongTitle, isNoiseLine } from './validator';
import { normalizeText, normalizeDate } from './normalizer';
import { parseXlsxContentAsync } from './xlsxParser';
import { extractDocxText, extractRtfText } from './docxParser';
import { inferTerritory, inferTerritoryFromComment } from './territory';

/** Extract composer names from parentheses or "written by" patterns */
function extractComposersFromLine(line: string): string {
  // "Song Title (John Smith / Jane Doe)"
  const parenMatch = line.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const inside = parenMatch[1];
    // Check if it looks like names (contains letters, not just numbers)
    if (/[A-Za-zÀ-ÿ]/.test(inside) && !/^\d+$/.test(inside.trim())) {
      return inside.trim();
    }
  }

  // "written by Name1, Name2" or "music by Name" or "author: Name"
  const writtenByMatch = line.match(/(?:written\s+by|music\s+by|composed\s+by|author\s*:)\s*(.+)/i);
  if (writtenByMatch) {
    return writtenByMatch[1].trim();
  }

  return '';
}

/** Extract clean song title (without composer parentheses) */
function cleanSongTitle(title: string): string {
  // Remove trailing parenthesized composer info
  return title.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

function parseTxtContent(content: string, fileName: string): { shows: ShowEntry[]; setlists: SetlistData[]; alerts: string[] } {
  const lines = normalizeText(content).split('\n').map(l => l.trim()).filter(Boolean);
  const shows: ShowEntry[] = [];
  const alerts: string[] = [];
  const songsMap: Map<string, SongEntry[]> = new Map();

  let currentArtist = '';
  let currentDate = '';
  let currentVenue = '';
  let currentCity = '';
  let currentTerritory = '';
  let currentSongs: SongEntry[] = [];
  let inBis = false;
  let documentComposers = ''; // Composers found in document header

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Skip noise lines (footers, legal, page numbers)
    if (isNoiseLine(line)) continue;

    // Detect "written by" or "composed by" at document level
    const docComposerMatch = line.match(/^(?:written\s+by|composed\s+by|music\s+by|author\s*:)\s*(.+)/i);
    if (docComposerMatch) {
      documentComposers = docComposerMatch[1].trim();
      continue;
    }

    // Detect artist line (multi-language labels)
    const artistMatch = line.match(/^(?:artista|artist|banda|band|künstler|artiste|act|performer)\s*:\s*(.+)/i);
    if (artistMatch) {
      currentArtist = artistMatch[1].trim();
      continue;
    }

    // Detect date/venue combined line
    const dateVenueMatch = line.match(/^(?:data|date|datum|fecha)\s*:\s*(.+?)\s*[—–\-]\s*(.+)/i);
    if (dateVenueMatch) {
      if (currentSongs.length > 0) finishShow();
      currentDate = normalizeDate(dateVenueMatch[1]);
      const rest = dateVenueMatch[2].split(',').map(s => s.trim());
      currentVenue = rest[0] || '';
      currentCity = rest[1] || '';
      const territoryPart = rest.slice(2).join(' ');
      currentTerritory = inferTerritory(territoryPart || currentCity || currentVenue) || territoryPart;
      currentSongs = [];
      inBis = false;
      continue;
    }

    // Alternate: just a date line
    const justDateMatch = line.match(/^(?:data|date|datum|fecha)\s*:\s*(.+)/i);
    if (justDateMatch && !dateVenueMatch) {
      if (currentSongs.length > 0) finishShow();
      currentDate = normalizeDate(justDateMatch[1]);
      currentSongs = [];
      inBis = false;
      continue;
    }

    // Detect standalone date (no label)
    const standaloneDateMatch = line.match(/^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})(?:\s*[—–\-]\s*(.+))?$/);
    if (standaloneDateMatch) {
      if (currentSongs.length > 0) finishShow();
      currentDate = normalizeDate(standaloneDateMatch[1]);
      if (standaloneDateMatch[2]) {
        const rest = standaloneDateMatch[2].split(',').map(s => s.trim());
        currentVenue = rest[0] || currentVenue;
        currentCity = rest[1] || currentCity;
      }
      currentSongs = [];
      inBis = false;
      continue;
    }

    // Detect venue line (multi-language)
    const venueMatch = line.match(/^(?:venue|local|casa de show|lieu|ort|lugar|sala|location)\s*:\s*(.+)/i);
    if (venueMatch) {
      const parts = venueMatch[1].split(',').map(s => s.trim());
      currentVenue = parts[0] || '';
      currentCity = parts[1] || currentCity;
      if (parts[2]) currentTerritory = inferTerritory(parts[2]) || parts[2];
      continue;
    }

    // Detect city line
    const cityMatch = line.match(/^(?:city|cidade|ciudad|ville|stadt)\s*:\s*(.+)/i);
    if (cityMatch) {
      currentCity = cityMatch[1].trim();
      continue;
    }

    // Detect territory line
    const territoryMatch = line.match(/^(?:territory|país|pais|country|region|região|pays|land)\s*:\s*(.+)/i);
    if (territoryMatch) {
      currentTerritory = inferTerritory(territoryMatch[1].trim()) || territoryMatch[1].trim();
      continue;
    }

    // Detect BIS/Encore
    if (/^(bis|encore|zugabe|rappel)\s*:?\s*$/i.test(line)) {
      inBis = true;
      continue;
    }

    // Detect separator (----, ====, etc.)
    if (/^[-=_]{3,}$/.test(line)) {
      if (currentSongs.length > 0) finishShow();
      continue;
    }

    // Detect numbered/bulleted song line
    const songMatch = line.match(/^(?:\d+[\.\)\-\:]|\-|\•|\*|\>)\s*(.+)/);
    if (songMatch) {
      const rawTitle = songMatch[1].trim();
      if (rawTitle.length >= 2) {
        const lineComposers = extractComposersFromLine(rawTitle);
        const title = lineComposers ? cleanSongTitle(rawTitle) : rawTitle;
        currentSongs.push({
          songTitle: title,
          composers: lineComposers || documentComposers || currentArtist || '',
          bmgControl: '',
          iMaestroSongCode: '',
          prsTunecode: '',
          comments: inBis ? 'Bis' : '',
        });
      }
      continue;
    }

    // If we have a date or venue set and the line looks like a song title
    if ((currentDate || currentVenue) && !line.includes(':') && line.length >= 2 && line.length < 120) {
      if (/^(set\s*list|setlist|repertório|tracklist|encore|bis|page|página)/i.test(line)) continue;
      if (/^(total|end|fim|note|obs)/i.test(line)) continue;

      const lineComposers = extractComposersFromLine(line);
      const title = lineComposers ? cleanSongTitle(line) : line;
      currentSongs.push({
        songTitle: title,
        composers: lineComposers || documentComposers || currentArtist || '',
        bmgControl: '',
        iMaestroSongCode: '',
        prsTunecode: '',
        comments: inBis ? 'Bis' : '',
      });
    }
  }

  if (currentSongs.length > 0) finishShow();

  function finishShow() {
    const songsKey = currentSongs.map(s => s.songTitle).join('|');
    let setlistNum: number;

    if (songsMap.has(songsKey)) {
      const existing = [...songsMap.entries()];
      setlistNum = existing.findIndex(([k]) => k === songsKey) + 1;
    } else {
      songsMap.set(songsKey, [...currentSongs]);
      setlistNum = songsMap.size;
    }

    shows.push({
      artist: currentArtist,
      date: currentDate,
      territory: currentTerritory,
      city: currentCity,
      venue: currentVenue,
      venueAddress: '',
      prsVenueId: '',
      localPromoterContactInfo: '',
      comments: '',
      setListNumber: setlistNum,
      headlinerYN: '',
      headlinerIfN: '',
      sourceFile: fileName,
    });

    if (currentArtist && currentSongs.some(s => s.composers === currentArtist)) {
      alerts.push(`[${fileName}]: Compositores inferidos como "${currentArtist}" — informação não disponível na fonte.`);
    }

    currentSongs = [];
    inBis = false;
  }

  const setlists: SetlistData[] = [...songsMap.entries()].map(([, songs], i) => ({
    number: i + 1,
    songs,
  }));

  return { shows, setlists, alerts };
}

/**
 * Extract potential artist name from the file path/name.
 */
function inferArtistFromPath(fileName: string): string {
  const segments = fileName.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length > 1) {
    const folder = segments[segments.length - 2].trim();
    const generic = ['set list', 'setlist', 'setlists', 'dates', 'tour', 'shows', 'music', 'documents', 'downloads', '2024', '2025', '2026'];
    if (folder && !generic.some(g => folder.toLowerCase().includes(g))) {
      return folder;
    }
    // Also check grandparent folder
    if (segments.length > 2) {
      const grandparent = segments[segments.length - 3].trim();
      if (grandparent && !generic.some(g => grandparent.toLowerCase().includes(g))) {
        return grandparent;
      }
    }
  }
  const baseName = segments[segments.length - 1].replace(/\.[^.]+$/, '');
  const artistFromName = baseName.match(/^([A-Za-zÀ-ÿ\s]+?)[\s_\-]+(tour|dates|setlist|set list|2\d{3})/i);
  if (artistFromName) {
    return artistFromName[1].trim();
  }
  return '';
}

/**
 * De-duplicate shows: group entries with same date+venue into a single show.
 * Multiple songs for the same date+venue = 1 show, not N shows.
 */
function deduplicateShows(shows: ShowEntry[]): ShowEntry[] {
  const grouped = new Map<string, ShowEntry>();
  
  for (const show of shows) {
    // Key by date + venue + artist (case-insensitive)
    const key = `${(show.date || '').toLowerCase()}|${(show.venue || '').toLowerCase()}|${(show.artist || '').toLowerCase()}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, { ...show });
    }
    // If duplicate, just skip — setlist is already shared via setListNumber
  }
  
  return [...grouped.values()];
}

export async function processFiles(files: UploadedFile[]): Promise<ProcessedData> {
  const allShows: ShowEntry[] = [];
  const allSetlists: SetlistData[] = [];
  const allAlerts: string[] = [];
  const fileStatuses: FileStatus[] = [];
  let setlistOffset = 0;
  let totalRejectedLines = 0;

  for (const file of files) {
    const ext = file.name.toLowerCase();
    const isXlsx = ext.endsWith('.xlsx') || ext.endsWith('.xlsm');
    const isDocx = ext.endsWith('.docx');
    const isRtf = ext.endsWith('.rtf');
    let result: { shows: ShowEntry[]; setlists: SetlistData[]; alerts: string[] };

    const folderArtist = inferArtistFromPath(file.name);

    try {
      if (isXlsx) {
        const buf = new ArrayBuffer(file.content.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < file.content.length; i++) {
          view[i] = file.content.charCodeAt(i) & 0xFF;
        }
        result = await parseXlsxContentAsync(buf, file.name);
      } else if (isDocx) {
        const buf = new ArrayBuffer(file.content.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < file.content.length; i++) {
          view[i] = file.content.charCodeAt(i) & 0xFF;
        }
        const text = await extractDocxText(buf);
        result = parseTxtContent(text, file.name);
      } else if (isRtf) {
        const text = extractRtfText(file.content);
        result = parseTxtContent(text, file.name);
      } else {
        result = parseTxtContent(file.content, file.name);
      }
    } catch (e) {
      const msg = `[${file.name}]: Falha total ao processar — ${e instanceof Error ? e.message : String(e)}`;
      allAlerts.push(msg);
      fileStatuses.push({ name: file.name, status: 'failure', alerts: [msg], rejectedLines: 0 });
      continue;
    }

    // Propagate folder artist to shows missing artist
    if (folderArtist) {
      for (const show of result.shows) {
        if (!show.artist || !show.artist.trim()) {
          show.artist = folderArtist;
          allAlerts.push(`[${file.name}]: Artista "${folderArtist}" inferido do nome da pasta/arquivo.`);
        }
      }
    }

    // Validate shows — requires at least Date or Venue
    let rejectedShows = 0;
    const validShows: ShowEntry[] = [];
    for (const show of result.shows) {
      if (isValidShow(show)) {
        show.setListNumber += setlistOffset;
        validShows.push(show);
      } else {
        rejectedShows++;
      }
    }

    // De-duplicate shows (same date + venue + artist = 1 show)
    const dedupedShows = deduplicateShows(validShows);
    const deduplicatedCount = validShows.length - dedupedShows.length;
    if (deduplicatedCount > 0) {
      allAlerts.push(`[${file.name}]: ${deduplicatedCount} registros duplicados agrupados (mesma data/venue/artista).`);
    }

    // Validate setlist songs
    let rejectedSongs = 0;
    const validSetlists: SetlistData[] = [];
    for (const sl of result.setlists) {
      const validSongs = sl.songs.filter(s => {
        if (isValidSongTitle(s.songTitle)) return true;
        rejectedSongs++;
        return false;
      });
      if (validSongs.length > 0) {
        validSetlists.push({ number: sl.number + setlistOffset, songs: validSongs });
      }
    }

    const fileRejected = rejectedShows + rejectedSongs;
    totalRejectedLines += fileRejected;

    allShows.push(...dedupedShows);
    allSetlists.push(...validSetlists);
    setlistOffset += validSetlists.length;
    allAlerts.push(...result.alerts);

    if (fileRejected > 0) {
      allAlerts.push(`[${file.name}]: ${fileRejected} linhas rejeitadas (campos obrigatórios ausentes ou corrompidos).`);
    }

    const hasAlerts = result.alerts.length > 0 || fileRejected > 0 || deduplicatedCount > 0;
    fileStatuses.push({
      name: file.name,
      status: hasAlerts ? 'alert' : 'success',
      alerts: result.alerts,
      rejectedLines: fileRejected,
    });
  }

  // Sanity check: warn if show count seems unreasonable
  if (allShows.length > files.length * 500) {
    allAlerts.push(`⚠️ Sanidade numérica: ${allShows.length} shows gerados de ${files.length} arquivo(s). Re-validando separação de registros.`);
  }

  if (allShows.length === 0 && files.length > 0) {
    allAlerts.push('Nenhum show identificado nos arquivos. Verifique o formato dos dados.');
  }

  return {
    shows: allShows,
    setlists: allSetlists,
    alerts: allAlerts,
    filesProcessed: files.length,
    filesSuccess: fileStatuses.filter(f => f.status === 'success').length,
    filesWithAlerts: fileStatuses.filter(f => f.status === 'alert').length,
    filesWithFailures: fileStatuses.filter(f => f.status === 'failure').length,
    rejectedLines: totalRejectedLines,
    fileStatuses,
  };
}
