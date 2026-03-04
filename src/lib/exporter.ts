import ExcelJS from 'exceljs';
import type { ProcessedData } from './types';
import { fillMissing, normalizeComposers } from './infoNaoLocalizada';
import type { Locale } from './i18n';

/** Dark teal/blue header — matching BMG corporate report style */
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E5F' },
};

const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F7F9' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Arial',
  size: 10,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const BODY_FONT: Partial<ExcelJS.Font> = {
  name: 'Arial',
  size: 10,
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FF0D3340' } },
  right: { style: 'thin', color: { argb: 'FF2A6B7C' } },
};

function styleHeaders(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = HEADER_FONT;
  row.height = 28;
  row.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.border = HEADER_BORDER;
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  // Auto-filter on header row
  const lastCol = sheet.columnCount;
  if (lastCol > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: lastCol },
    };
  }
}

function styleBody(sheet: ExcelJS.Worksheet, startRow: number) {
  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    row.font = BODY_FONT;
    row.alignment = { vertical: 'middle', wrapText: true };
    if ((r - startRow) % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = ALT_ROW_FILL;
      });
    }
    // Light grid borders
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        right: { style: 'hair', color: { argb: 'FFE0E0E0' } },
      };
    });
  }
}

export async function exportToExcel(data: ProcessedData, locale: Locale = 'pt'): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const fm = (v: string | null | undefined) => fillMissing(v, locale);
  const nc = (v: string) => normalizeComposers(v, locale);

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
      fm(s.artist), fm(s.date), fm(s.territory),
      fm(s.city), fm(s.venue), fm(s.venueAddress),
      fm(s.prsVenueId), fm(s.localPromoterContactInfo),
      fm(s.comments), s.setListNumber,
      fm(s.headlinerYN), fm(s.headlinerIfN),
      fm(s.sourceFile),
    ]);
  }

  styleBody(dvSheet, 2);
  // Column widths matching reference layout
  const dvWidths = [16, 12, 10, 16, 22, 28, 14, 26, 28, 14, 12, 16, 18];
  dvWidths.forEach((w, i) => { dvSheet.getColumn(i + 1).width = w; });

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
        : `[${locale === 'en' ? 'title not found' : locale === 'es' ? 'título no localizado' : locale === 'de' ? 'Titel nicht gefunden' : 'título não localizado'} — ${locale === 'en' ? 'track' : locale === 'es' ? 'pista' : locale === 'de' ? 'Track' : 'faixa'} ${i + 1}]`;
      slSheet.addRow([
        title, nc(s.composers), fm(s.bmgControl),
        fm(s.iMaestroSongCode), fm(s.prsTunecode),
        fm(s.comments),
      ]);
    }

    styleBody(slSheet, 2);
    const slWidths = [30, 28, 14, 18, 16, 24];
    slWidths.forEach((w, i) => { slSheet.getColumn(i + 1).width = w; });
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
