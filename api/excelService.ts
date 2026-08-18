import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

function cleanContentString(content: string): string {
  if (!content) return '';
  let str = content.trim();
  if (str.startsWith('```')) {
    str = str.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/\s*```$/, '').trim();
  }
  return str;
}

export function parseTableDataFromContent(content: string): TableData {
  if (!content) return { headers: ['Coluna 1'], rows: [] };

  const trimmed = cleanContentString(content);

  // 1. Try parsing JSON structure
  const isLikelyJson = trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('"sheets"') || trimmed.includes('"headers"') || trimmed.includes('"rows"');
  
  if (isLikelyJson) {
    try {
      let cleaned = trimmed;
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const idx = cleaned.search(/[\{\[]/);
        if (idx !== -1) cleaned = cleaned.substring(idx);
      }
      const parsed = JSON.parse(cleaned);
      if (parsed) {
        if (Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          const firstSheet = parsed.sheets[0];
          const headers = Array.isArray(firstSheet.headers) ? firstSheet.headers.map(String) :
                          Array.isArray(firstSheet.columns) ? firstSheet.columns.map(String) : [];
          const rows = Array.isArray(firstSheet.rows) ? firstSheet.rows.map((r: any) => Array.isArray(r) ? r : [String(r)]) : [];
          if (headers.length > 0 || rows.length > 0) {
            return { headers: headers.length > 0 ? headers : ['Coluna 1'], rows };
          }
        }
        if (Array.isArray(parsed.headers) || Array.isArray(parsed.rows)) {
          const headers = Array.isArray(parsed.headers) ? parsed.headers.map(String) : ['Coluna 1'];
          const rows = Array.isArray(parsed.rows) ? parsed.rows.map((r: any) => Array.isArray(r) ? r : [String(r)]) : [];
          return { headers, rows };
        }
      }
    } catch {}
  }

  // 2. CSV parsing fallback
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const delimiter = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
    const splitRow = (rowStr: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = splitRow(lines[0]);
    const rows: (string | number)[][] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('|---') || lines[i].startsWith('---')) continue;
      const cells = splitRow(lines[i]).map(c => {
        const num = Number(c);
        return !isNaN(num) && c !== '' ? num : c;
      });
      if (cells.length > 0 && cells.some(c => c !== '')) {
        rows.push(cells);
      }
    }

    if (headers.length > 0) {
      return { headers, rows };
    }
  }

  return { headers: ['Item', 'Valor'], rows: [['Exemplo', 100]] };
}

export async function generateExcelBuffer(title: string, content: string): Promise<Buffer> {
  const tableData = parseTableDataFromContent(content);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Omnix AI';
  workbook.lastModifiedBy = 'Omnix AI';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = (title.replace(/\.xlsx$/i, '') || 'Planilha').slice(0, 31);
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  const columns = tableData.headers.map((header) => ({
    header,
    key: header.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    width: Math.max(header.length + 5, 14)
  }));
  worksheet.columns = columns;

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 24;

  // Add data rows
  tableData.rows.forEach((row, rowIdx) => {
    const r = worksheet.addRow(row);
    r.font = { name: 'Calibri', size: 10 };
    r.height = 20;
    r.alignment = { vertical: 'middle', horizontal: 'left' };

    // Zebra striping
    if (rowIdx % 2 === 1) {
      r.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F4F7' }
      };
    }

    // Number formatting
    row.forEach((cellVal, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      if (typeof cellVal === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (Number.isInteger(cellVal)) {
          cell.numFmt = '#,##0';
        } else {
          cell.numFmt = '#,##0.00';
        }
      }
    });
  });

  // Auto-adjust column widths
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
