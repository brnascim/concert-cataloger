import ExcelJS from 'exceljs';
import type { ProcessedData } from './types';
import { fillMissing, normalizeComposers } from './infoNaoLocalizada';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
};

const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F5F5' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Arial',
  size: 10,
  bold: true,
};

const BODY_FONT: Partial<ExcelJS.Font> = {
  name: 'Arial',
  size: 10,
};

function styleHeaders(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = HEADER_FONT;
  row.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    };
  });
}

function styleBody(sheet: ExcelJS.Worksheet, startRow: number) {
  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    row.font = BODY_FONT;
    if ((r - startRow) % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = ALT_ROW_FILL;
      });
    }
  }
}

export async function exportToExcel(data: ProcessedData): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Dates & Venues sheet
  const dvSheet = workbook.addWorksheet('Dates & Venues');
  const dvHeaders = [
    'Artist', 'Date', 'Territory', 'City', 'Venue', 'Venue Address',
    'PRS Venue ID', 'Local Promoter Contact Info', 'Comments',
    'Set List Number', 'Headliner Y/N', 'Headliner if N', 'Source File'
  ];
  dvSheet.addRow(dvHeaders);
  styleHeaders(dvSheet);

  for (const s of data.shows) {
    dvSheet.addRow([
      fillMissing(s.artist), fillMissing(s.date), fillMissing(s.territory),
      fillMissing(s.city), fillMissing(s.venue), fillMissing(s.venueAddress),
      fillMissing(s.prsVenueId), fillMissing(s.localPromoterContactInfo),
      fillMissing(s.comments), s.setListNumber,
      fillMissing(s.headlinerYN), fillMissing(s.headlinerIfN),
      fillMissing(s.sourceFile),
    ]);
  }

  styleBody(dvSheet, 2);
  dvHeaders.forEach((_, i) => { dvSheet.getColumn(i + 1).width = 20; });

  // Setlist sheets
  const slHeaders = [
    'Song Title', 'Composer(s)', 'BMG Control Y/N',
    'iMaestro Song Code', 'PRS Tunecode', 'Comments'
  ];

  for (const sl of data.setlists) {
    const slSheet = workbook.addWorksheet(`Set List ${sl.number}`);
    slSheet.addRow(slHeaders);
    styleHeaders(slSheet);

    for (let i = 0; i < sl.songs.length; i++) {
      const s = sl.songs[i];
      const title = s.songTitle?.trim()
        ? s.songTitle
        : `[título não localizado — faixa ${i + 1}]`;
      slSheet.addRow([
        title, normalizeComposers(s.composers), fillMissing(s.bmgControl),
        fillMissing(s.iMaestroSongCode), fillMissing(s.prsTunecode),
        fillMissing(s.comments),
      ]);
    }

    styleBody(slSheet, 2);
    slHeaders.forEach((_, i) => { slSheet.getColumn(i + 1).width = 20; });
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
