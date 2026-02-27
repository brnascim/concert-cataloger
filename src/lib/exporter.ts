import ExcelJS from 'exceljs';
import type { ProcessedData } from './types';

export async function exportToExcel(data: ProcessedData): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Dates & Venues sheet
  const dvSheet = workbook.addWorksheet('Dates & Venues');
  const dvHeaders = [
    'Artist', 'Date', 'Territory', 'City', 'Venue', 'Venue Address',
    'PRS Venue ID', 'Local Promoter Contact Info', 'Comments',
    'Set List Number', 'Headliner Y/N', 'Headliner if N'
  ];
  dvSheet.addRow(dvHeaders);
  dvSheet.getRow(1).font = { bold: true };

  for (const s of data.shows) {
    dvSheet.addRow([
      s.artist, s.date, s.territory, s.city, s.venue, s.venueAddress,
      s.prsVenueId, s.localPromoterContactInfo, s.comments,
      s.setListNumber, s.headlinerYN, s.headlinerIfN,
    ]);
  }

  dvHeaders.forEach((_, i) => {
    dvSheet.getColumn(i + 1).width = 18;
  });

  // Setlist sheets
  const slHeaders = [
    'Song Title', 'Composer(s)', 'BMG Control Y/N',
    'iMaestro Song Code', 'PRS Tunecode', 'Comments'
  ];

  for (const sl of data.setlists) {
    const slSheet = workbook.addWorksheet(`Set List ${sl.number}`);
    slSheet.addRow(slHeaders);
    slSheet.getRow(1).font = { bold: true };

    for (const s of sl.songs) {
      slSheet.addRow([
        s.songTitle, s.composers, s.bmgControl,
        s.iMaestroSongCode, s.prsTunecode, s.comments,
      ]);
    }

    slHeaders.forEach((_, i) => {
      slSheet.getColumn(i + 1).width = 18;
    });
  }

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'setlists_consolidated.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
