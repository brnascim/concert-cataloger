import type { ProcessedData } from './types';

export function exportToCsv(data: ProcessedData): void {
  const rows: string[][] = [];
  
  // Header
  rows.push([
    'Artist', 'Date', 'Territory', 'City', 'Venue', 'Set List #',
    'Song Order', 'Song Title', 'Composers', 'BMG Control',
    'iMaestro Code', 'PRS Tunecode', 'Show Comments', 'Song Comments'
  ]);

  for (const show of data.shows) {
    const setlist = data.setlists.find(sl => sl.number === show.setListNumber);
    if (setlist) {
      for (let i = 0; i < setlist.songs.length; i++) {
        const song = setlist.songs[i];
        rows.push([
          show.artist, show.date, show.territory, show.city, show.venue,
          String(show.setListNumber), String(i + 1),
          song.songTitle, song.composers, song.bmgControl,
          song.iMaestroSongCode, song.prsTunecode,
          show.comments, song.comments,
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
