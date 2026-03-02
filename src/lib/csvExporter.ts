import type { ProcessedData } from './types';
import { fillMissing, normalizeComposers } from './infoNaoLocalizada';

export function exportToCsv(data: ProcessedData): void {
  const rows: string[][] = [];
  
  // Header
  rows.push([
    'Artist', 'Date', 'Territory', 'City', 'Venue', 'Set List #',
    'Song Order', 'Song Title', 'Composers', 'BMG Control',
    'iMaestro Code', 'PRS Tunecode', 'Show Comments', 'Song Comments', 'Source File'
  ]);

  for (const show of data.shows) {
    const setlist = data.setlists.find(sl => sl.number === show.setListNumber);
    if (setlist) {
      for (let i = 0; i < setlist.songs.length; i++) {
        const song = setlist.songs[i];
        const title = song.songTitle?.trim()
          ? song.songTitle
          : `[título não localizado — faixa ${i + 1}]`;
        rows.push([
          fillMissing(show.artist), fillMissing(show.date), fillMissing(show.territory),
          fillMissing(show.city), fillMissing(show.venue),
          String(show.setListNumber), String(i + 1),
          title, normalizeComposers(song.composers), fillMissing(song.bmgControl),
          fillMissing(song.iMaestroSongCode), fillMissing(song.prsTunecode),
          fillMissing(show.comments), fillMissing(song.comments), fillMissing(show.sourceFile),
        ]);
      }
    }
  }

  const csvContent = rows.map(row =>
    row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'setlists_consolidated.csv';
  a.click();
  URL.revokeObjectURL(url);
}
