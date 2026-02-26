import * as XLSX from 'xlsx';
import type { ProcessedData } from './types';

export function exportToExcel(data: ProcessedData): void {
  const wb = XLSX.utils.book_new();

  // Dates & Venues sheet
  const dvHeaders = [
    'Artist', 'Date', 'Territory', 'City', 'Venue', 'Venue Address',
    'PRS Venue ID', 'Local Promoter Contact Info', 'Comments',
    'Set List Number', 'Headliner Y/N', 'Headliner if N'
  ];
  const dvData = data.shows.map(s => [
    s.artist, s.date, s.territory, s.city, s.venue, s.venueAddress,
    s.prsVenueId, s.localPromoterContactInfo, s.comments,
    s.setListNumber, s.headlinerYN, s.headlinerIfN,
  ]);
  const dvSheet = XLSX.utils.aoa_to_sheet([dvHeaders, ...dvData]);
  
  // Column widths
  dvSheet['!cols'] = dvHeaders.map(h => ({ wch: Math.max(h.length + 4, 14) }));
  
  XLSX.utils.book_append_sheet(wb, dvSheet, 'Dates & Venues');

  // Setlist sheets
  const slHeaders = [
    'Song Title', 'Composer(s)', 'BMG Control Y/N',
    'iMaestro Song Code', 'PRS Tunecode', 'Comments'
  ];

  for (const sl of data.setlists) {
    const slData = sl.songs.map(s => [
      s.songTitle, s.composers, s.bmgControl,
      s.iMaestroSongCode, s.prsTunecode, s.comments,
    ]);
    const slSheet = XLSX.utils.aoa_to_sheet([slHeaders, ...slData]);
    slSheet['!cols'] = slHeaders.map(h => ({ wch: Math.max(h.length + 4, 14) }));
    XLSX.utils.book_append_sheet(wb, slSheet, `Set List ${sl.number}`);
  }

  // Download
  XLSX.writeFile(wb, 'setlists_consolidated.xlsx');
}
