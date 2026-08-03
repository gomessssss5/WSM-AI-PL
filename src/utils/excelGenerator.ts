import ExcelJS from 'exceljs';

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

export function parseTableDataFromContent(content: string): TableData {
  if (!content) return { headers: ['Coluna 1'], rows: [] };

  const trimmed = content.trim();

  // 1. Try parsing JSON structure
  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      
      // Format: { columns: ["A", "B"], rows: [["a1", "b1"], ["a2", "b2"]] }
      if (parsed && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
        return {
          headers: parsed.columns.map((c: any) => String(c)),
          rows: parsed.rows.map((r: any) => Array.isArray(r) ? r : [String(r)])
        };
      }

      // Format: { headers: ["A", "B"], rows: [["a1", "b1"]] }
      if (parsed && Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
        return {
          headers: parsed.headers.map((h: any) => String(h)),
          rows: parsed.rows.map((r: any) => Array.isArray(r) ? r : [String(r)])
        };
      }

      // Format: Array of objects [{ "Nome": "Ana", "Idade": 25 }, ...]
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        const headersSet = new Set<string>();
        parsed.forEach(item => {
          if (item && typeof item === 'object') {
            Object.keys(item).forEach(k => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        const rows = parsed.map(item => headers.map(h => item[h] !== undefined ? item[h] : ''));
        return { headers, rows };
      }
    }
  } catch (e) {
    // Not valid JSON, fall through to Markdown / CSV
  }

  // 2. Try parsing Markdown Tables
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(line => line.includes('|'));

  if (tableLines.length >= 2) {
    const rawHeaders = tableLines[0].split('|').map(s => s.trim()).filter(s => s !== '');
    
    // Skip separator line (e.g. |---|---|)
    const dataLines = tableLines.slice(1).filter(l => !/^[|\s:-]+$/.test(l));

    const rows: (string | number)[][] = dataLines.map(line => {
      const cells = line.split('|').map(s => s.trim());
      // Handle leading/trailing empty string from split
      if (line.startsWith('|')) cells.shift();
      if (line.endsWith('|')) cells.pop();
      
      return cells.map(cell => {
        const cleanCell = cell.replace(/[*_`]/g, '');
        // Convert to number if numeric
        const num = Number(cleanCell.replace(',', '.'));
        if (!isNaN(num) && cleanCell !== '' && !cleanCell.startsWith('0') && cleanCell.length < 15) {
          return num;
        }
        return cleanCell;
      });
    });

    if (rawHeaders.length > 0) {
      return {
        headers: rawHeaders.map(h => h.replace(/[*_`]/g, '')),
        rows
      };
    }
  }

  // 3. Fallback: CSV or Line-by-Line
  const csvRows: (string | number)[][] = lines.map(line => {
    const delimiter = line.includes(';') ? ';' : ',';
    return line.split(delimiter).map(cell => {
      const clean = cell.trim();
      const num = Number(clean.replace(',', '.'));
      return !isNaN(num) && clean !== '' ? num : clean;
    });
  });

  if (csvRows.length > 0) {
    const headers = csvRows[0].map((c, i) => String(c) || `Coluna ${i + 1}`);
    const rows = csvRows.slice(1);
    return { headers, rows };
  }

  return {
    headers: ['Conteúdo'],
    rows: [[content]]
  };
}

export async function generateExcelBlob(title: string, content: string): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WSM AI';
  workbook.created = new Date();

  const sheetName = (title || 'Planilha').replace(/[*?:/\\[\]]/g, '').substring(0, 31) || 'Planilha1';
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  const { headers, rows } = parseTableDataFromContent(content);

  // Set columns
  worksheet.columns = headers.map(h => ({
    header: h,
    key: h,
    width: Math.max(h.length + 6, 14)
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E78' } // Dark Navy
    };
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: '103050' } },
      left: { style: 'thin', color: { argb: '103050' } },
      bottom: { style: 'medium', color: { argb: '0A2035' } },
      right: { style: 'thin', color: { argb: '103050' } }
    };
  });

  // Add Data Rows
  rows.forEach((rowValues, rowIndex) => {
    const row = worksheet.addRow(rowValues);
    row.height = 22;

    const isEven = rowIndex % 2 === 0;
    const bgArgb = isEven ? 'FFFFFF' : 'F4F7FA';

    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };
      cell.font = {
        name: 'Arial',
        size: 10,
        color: { argb: '222222' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };

      if (typeof cell.value === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });
  });

  // Auto-adjust column widths based on maximum length of cell content
  worksheet.columns.forEach(col => {
    let maxLen = col.header ? String(col.header).length : 10;
    col.eachCell!({ includeEmpty: false }, cell => {
      const valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    col.width = Math.min(Math.max(maxLen + 4, 12), 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
