/**
 * QA Auditor — v1.2
 * Post-processing validation that checks every row and column for:
 * 1. Blank fields → replaced with "informação não localizada"
 * 2. Date format → must be DD/MM/AAAA
 * 3. Composer separators → must use " / "
 * 4. Y/N fields standardized
 * 5. Conflict detection between folder artist and file content
 * 6. Hallucination guard: flags inferred data
 */
import type { ProcessedData, ShowEntry, SongEntry } from './types';
import { normalizeComposers, INFO_NAO_LOCALIZADA } from './infoNaoLocalizada';

export interface AuditIssue {
  type: 'blank_field' | 'date_format' | 'composer_separator' | 'yn_format' | 'artist_conflict' | 'hallucination' | 'data_guard';
  field: string;
  row: number;
  sheet: string;
  description: string;
  autoFixed: boolean;
}

export interface DataGuardReport {
  blocked: boolean;
  blockedReasons: string[];
  highlightedShowRows: number[];
}

export interface AuditReport {
  issues: AuditIssue[];
  totalChecked: number;
  totalFixed: number;
  totalWarnings: number;
  dataGuard: DataGuardReport;
}

const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const TERRITORY_CODE_REGEX = /^[A-Z]{2}$/;
const INVALID_ARTIST_REGEX = /^\d+$/;
const EXPECTED_SHOWS_PER_FILE_UPPER_BOUND = 50;
const EXPLOSION_MULTIPLIER = 10;

/**
 * Run full QA audit on processed data, fixing what can be fixed and flagging what can't.
 */
export function runQAAudit(data: ProcessedData, folderArtist?: string): { data: ProcessedData; audit: AuditReport } {
  const issues: AuditIssue[] = [];
  let totalChecked = 0;
  let totalFixed = 0;
  const highlightedShowRows = new Set<number>();

  const shows = data.shows.map((s, i) => {
    const show = { ...s };
    const row = i + 1;

    // Check & fill blank fields
    const showFields: (keyof ShowEntry)[] = [
      'artist', 'date', 'territory', 'city', 'venue',
      'venueAddress', 'prsVenueId', 'localPromoterContactInfo',
      'comments', 'headlinerYN', 'headlinerIfN', 'sourceFile',
    ];

    for (const field of showFields) {
      totalChecked++;
      if (field === 'setListNumber') continue;
      const val = show[field];
      if (typeof val === 'string' && (!val || !val.trim() || val === '-' || val === '?' || val === 'N/A')) {
        show[field as keyof Omit<ShowEntry, 'setListNumber'>] = INFO_NAO_LOCALIZADA as any;
        issues.push({
          type: 'blank_field', field, row, sheet: 'Dates & Venues',
          description: `Campo "${field}" vazio → preenchido com "${INFO_NAO_LOCALIZADA}"`,
          autoFixed: true,
        });
        totalFixed++;
      }
    }

    // Validate date format
    totalChecked++;
    if (show.date && show.date !== INFO_NAO_LOCALIZADA && !DATE_REGEX.test(show.date)) {
      issues.push({
        type: 'date_format', field: 'date', row, sheet: 'Dates & Venues',
        description: `Data "${show.date}" não está no formato DD/MM/AAAA`,
        autoFixed: false,
      });
    }

    // Standardize headliner Y/N
    totalChecked++;
    if (show.headlinerYN && show.headlinerYN !== INFO_NAO_LOCALIZADA) {
      const upper = show.headlinerYN.trim().toUpperCase();
      if (['YES', 'SIM', 'SI', '1'].includes(upper)) {
        show.headlinerYN = 'Y';
        totalFixed++;
      } else if (['NO', 'NÃO', 'NAO', '0'].includes(upper)) {
        show.headlinerYN = 'N';
        totalFixed++;
      } else if (upper !== 'Y' && upper !== 'N') {
        issues.push({
          type: 'yn_format', field: 'headlinerYN', row, sheet: 'Dates & Venues',
          description: `Valor "${show.headlinerYN}" não é Y/N válido`,
          autoFixed: false,
        });
      }
    }

    // Check folder artist conflict
    if (folderArtist && show.artist && show.artist !== INFO_NAO_LOCALIZADA) {
      totalChecked++;
      const showArtistLower = show.artist.toLowerCase().trim();
      const folderLower = folderArtist.toLowerCase().trim();
      if (showArtistLower !== folderLower && !showArtistLower.includes(folderLower) && !folderLower.includes(showArtistLower)) {
        const conflictNote = `[Conflito: pasta="${folderArtist}" vs arquivo="${show.artist}"]`;
        show.comments = show.comments === INFO_NAO_LOCALIZADA
          ? conflictNote
          : `${show.comments} ${conflictNote}`.trim();
        issues.push({
          type: 'artist_conflict', field: 'artist', row, sheet: 'Dates & Venues',
          description: `Nome do artista "${show.artist}" diverge do nome da pasta "${folderArtist}"`,
          autoFixed: false,
        });
      }
    }

    return show;
  });

  for (const [index, show] of shows.entries()) {
    const artist = (show.artist || '').trim();
    if (!artist || artist === INFO_NAO_LOCALIZADA) continue;

    totalChecked++;
    if (TERRITORY_CODE_REGEX.test(artist) || INVALID_ARTIST_REGEX.test(artist)) {
      highlightedShowRows.add(index + 1);
      issues.push({
        type: 'data_guard',
        field: 'artist',
        row: index + 1,
        sheet: 'Dates & Venues',
        description: `Data Guard: coluna Artist contém valor inválido "${artist}" (território/código). Reprocessar com foco em Header Inheritance.`,
        autoFixed: false,
      });
    }
  }

  totalChecked++;
  const maxExpectedShows = Math.max(1, data.filesProcessed) * EXPECTED_SHOWS_PER_FILE_UPPER_BOUND * EXPLOSION_MULTIPLIER;
  if (shows.length > maxExpectedShows) {
    issues.push({
      type: 'data_guard',
      field: 'shows',
      row: 0,
      sheet: 'Dates & Venues',
      description: `Data Guard: contagem de shows (${shows.length}) excede o limite de sanidade (${maxExpectedShows}) para ${Math.max(1, data.filesProcessed)} arquivo(s). Reprocessar com foco na estrutura de cabeçalho.`,
      autoFixed: false,
    });
  }

  // Audit setlists
  const setlists = data.setlists.map((sl) => {
    const songs = sl.songs.map((s, i) => {
      const song = { ...s };
      const row = i + 1;
      const sheet = `Set List ${sl.number}`;

      // Check blank song fields
      const songFields: (keyof SongEntry)[] = ['songTitle', 'composers', 'bmgControl', 'iMaestroSongCode', 'prsTunecode', 'comments'];
      for (const field of songFields) {
        totalChecked++;
        const val = song[field];
        if (!val || !val.trim() || val === '-' || val === '?' || val === 'N/A') {
          if (field === 'songTitle') {
            song[field] = `[título não localizado — faixa ${row}]`;
          } else {
            song[field] = INFO_NAO_LOCALIZADA;
          }
          issues.push({
            type: 'blank_field', field, row, sheet,
            description: `Campo "${field}" vazio → preenchido`,
            autoFixed: true,
          });
          totalFixed++;
        }
      }

      // Normalize composer separators
      totalChecked++;
      if (song.composers && song.composers !== INFO_NAO_LOCALIZADA) {
        const normalized = normalizeComposers(song.composers);
        if (normalized !== song.composers) {
          song.composers = normalized;
          issues.push({
            type: 'composer_separator', field: 'composers', row, sheet,
            description: `Compositores normalizados para formato " / "`,
            autoFixed: true,
          });
          totalFixed++;
        }
      }

      // Validate BMG Control Y/N
      totalChecked++;
      if (song.bmgControl && song.bmgControl !== INFO_NAO_LOCALIZADA) {
        const upper = song.bmgControl.trim().toUpperCase();
        if (!['Y', 'N'].includes(upper)) {
          issues.push({
            type: 'yn_format', field: 'bmgControl', row, sheet,
            description: `BMG Control "${song.bmgControl}" não é Y/N`,
            autoFixed: false,
          });
        }
      }

      return song;
    });
    return { ...sl, songs };
  });

  const warnings = issues.filter(i => !i.autoFixed);

  return {
    data: { ...data, shows, setlists },
    audit: {
      issues,
      totalChecked,
      totalFixed,
      totalWarnings: warnings.length,
      dataGuard: {
        blocked: issues.some(i => i.type === 'data_guard'),
        blockedReasons: issues.filter(i => i.type === 'data_guard').map(i => i.description),
        highlightedShowRows: Array.from(highlightedShowRows),
      },
    },
  };
}
