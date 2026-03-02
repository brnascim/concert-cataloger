import type { ProcessedData, ShowEntry, SongEntry, SetlistData, UploadedFile, FileStatus } from './types';
import { isValidShow, isValidSongTitle } from './validator';
import { normalizeText, normalizeDate } from './normalizer';
import { parseXlsxContentAsync } from './xlsxParser';
import { inferTerritory, inferTerritoryFromComment } from './territory';

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

  for (const line of lines) {
    // Detect artist line
    const artistMatch = line.match(/^(?:artista|artist|banda|band)\s*:\s*(.+)/i);
    if (artistMatch) {
      currentArtist = artistMatch[1].trim();
      continue;
    }

    // Detect date/venue line: "Data: DD/MM/YYYY — Venue, City, Territory" or similar
    const dateVenueMatch = line.match(/^(?:data|date)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s*[—–\-]\s*(.+)/i);
    if (dateVenueMatch) {
      // Save previous show if exists
      if (currentSongs.length > 0) {
        finishShow();
      }
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
    const justDateMatch = line.match(/^(?:data|date)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (justDateMatch && !dateVenueMatch) {
      if (currentSongs.length > 0) finishShow();
      currentDate = normalizeDate(justDateMatch[1]);
      currentSongs = [];
      inBis = false;
      continue;
    }

    // Detect venue line
    const venueMatch = line.match(/^(?:venue|local|casa de show)\s*:\s*(.+)/i);
    if (venueMatch) {
      const parts = venueMatch[1].split(',').map(s => s.trim());
      currentVenue = parts[0] || '';
      currentCity = parts[1] || currentCity;
      if (parts[2]) currentTerritory = inferTerritory(parts[2]) || parts[2];
      continue;
    }

    // Detect city line
    const cityMatch = line.match(/^(?:city|cidade)\s*:\s*(.+)/i);
    if (cityMatch) {
      currentCity = cityMatch[1].trim();
      continue;
    }

    // Detect BIS/Encore
    if (/^(bis|encore)\s*:?\s*$/i.test(line)) {
      inBis = true;
      continue;
    }

    // Detect separator
    if (/^[-=_]{3,}$/.test(line)) {
      if (currentSongs.length > 0) finishShow();
      continue;
    }

    // Detect song line: "1. Song Title" or "- Song Title" or "• Song Title"
    const songMatch = line.match(/^(?:\d+[\.\)\-]|\-|\•|\*)\s*(.+)/);
    if (songMatch) {
      const title = songMatch[1].trim();
      currentSongs.push({
        songTitle: title,
        composers: currentArtist || '',
        bmgControl: '',
        iMaestroSongCode: '',
        prsTunecode: '',
        comments: inBis ? 'Bis' : '',
      });
      continue;
    }

    // If we have a date set and the line looks like a song title (no special prefix)
    if (currentDate && !line.includes(':') && line.length > 1 && line.length < 100) {
      currentSongs.push({
        songTitle: line,
        composers: currentArtist || '',
        bmgControl: '',
        iMaestroSongCode: '',
        prsTunecode: '',
        comments: inBis ? 'Bis' : '',
      });
    }
  }

  // Finish last show
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

// normalizeDate is now imported from ./normalizer

export async function processFiles(files: UploadedFile[]): Promise<ProcessedData> {
  const allShows: ShowEntry[] = [];
  const allSetlists: SetlistData[] = [];
  const allAlerts: string[] = [];
  const fileStatuses: FileStatus[] = [];
  let setlistOffset = 0;
  let totalRejectedLines = 0;

  for (const file of files) {
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm');
    let result: { shows: ShowEntry[]; setlists: SetlistData[]; alerts: string[] };

    try {
      if (isXlsx) {
        // Convert binary string to ArrayBuffer for ExcelJS
        const buf = new ArrayBuffer(file.content.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < file.content.length; i++) {
          view[i] = file.content.charCodeAt(i) & 0xFF;
        }
        result = await parseXlsxContentAsync(buf, file.name);
      } else {
        result = parseTxtContent(file.content, file.name);
      }
    } catch (e) {
      const msg = `[${file.name}]: Falha total ao processar — ${e instanceof Error ? e.message : String(e)}`;
      allAlerts.push(msg);
      fileStatuses.push({ name: file.name, status: 'failure', alerts: [msg], rejectedLines: 0 });
      continue;
    }

    // Validate shows — reject empty lines
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

    // Validate setlist songs — reject invalid titles
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

    allShows.push(...validShows);
    allSetlists.push(...validSetlists);
    setlistOffset += validSetlists.length;
    allAlerts.push(...result.alerts);

    if (fileRejected > 0) {
      allAlerts.push(`[${file.name}]: ${fileRejected} linhas rejeitadas (campos obrigatórios ausentes ou corrompidos).`);
    }

    const hasAlerts = result.alerts.length > 0 || fileRejected > 0;
    fileStatuses.push({
      name: file.name,
      status: hasAlerts ? 'alert' : 'success',
      alerts: result.alerts,
      rejectedLines: fileRejected,
    });
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
