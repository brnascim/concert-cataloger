import type { ProcessedData } from './types';
import { fillMissing, normalizeComposers } from './infoNaoLocalizada';
import type { Locale } from './i18n';

export function exportToCsv(data: ProcessedData, locale: Locale = 'pt'): void {
  const rows: string[][] = [];
  const fm = (v: string | null | undefined) => fillMissing(v, locale);
  const nc = (v: string) => normalizeComposers(v, locale);
  
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
          : `[${locale === 'en' ? 'title not found' : locale === 'es' ? 'título no localizado' : locale === 'de' ? 'Titel nicht gefunden' : 'título não localizado'} — ${locale === 'en' ? 'track' : locale === 'es' ? 'pista' : locale === 'de' ? 'Track' : 'faixa'} ${i + 1}]`;
        rows.push([
          fm(show.artist), fm(show.date), fm(show.territory),
          fm(show.city), fm(show.venue),
          String(show.setListNumber), String(i + 1),
          title, nc(song.composers), fm(song.bmgControl),
          fm(song.iMaestroSongCode), fm(song.prsTunecode),
          fm(show.comments), fm(song.comments), fm(show.sourceFile),
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
