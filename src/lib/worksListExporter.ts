import ExcelJS from 'exceljs';
import type { WorksListEntry } from './aiReview';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E5F' },
};
const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F9' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const BODY_FONT: Partial<ExcelJS.Font> = { name: 'Arial', size: 10 };

export async function exportWorksList(works: WorksListEntry[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Works List');

  const headers = ['Song Title', 'Composer(s)', 'Artist', 'Confidence', 'Source'];
  sheet.addRow(headers);

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.height = 28;
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF0D3340' } } };
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  for (const work of works) {
    sheet.addRow([work.songTitle, work.composers, work.artist, work.confidence, work.source]);
  }

  // Style body
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    row.font = BODY_FONT;
    row.alignment = { vertical: 'middle', wrapText: true };
    if ((r - 2) % 2 === 1) {
      row.eachCell(cell => { cell.fill = ALT_ROW_FILL; });
    }
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        right: { style: 'hair', color: { argb: 'FFE0E0E0' } },
      };
    });
  }

  const widths = [30, 28, 20, 12, 24];
  widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'works_list.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
