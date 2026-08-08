import ExcelJS from 'exceljs';

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

function cleanContentString(content: string): string {
  if (!content) return '';
  let str = content.trim();
  // Strip markdown code fences if present: ```json ... ``` or ```xlsx ... ``` or ``` ... ```
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
      // Clean potential control chars or unescaped newlines in JSON strings
      const jsonCandidate = trimmed.startsWith('{') || trimmed.startsWith('[') 
        ? trimmed 
        : trimmed.substring(trimmed.indexOf('{'));
      
      const parsed = JSON.parse(jsonCandidate);
      
      // Format: { sheets: [{ headers: [...], rows: [...] }] }
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        const firstSheet = parsed.sheets[0];
        const headers = Array.isArray(firstSheet.headers) ? firstSheet.headers.map(String) :
                        Array.isArray(firstSheet.columns) ? firstSheet.columns.map(String) : [];
        const rows = Array.isArray(firstSheet.rows) ? firstSheet.rows.map((r: any) => Array.isArray(r) ? r : [String(r)]) : [];
        return {
          headers: headers.length > 0 ? headers : (rows[0] ? rows[0].map((_, i) => `Coluna ${i + 1}`) : ['Coluna 1']),
          rows
        };
      }

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
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
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

      // Format: Array of arrays [["Header1", "Header2"], ["Val1", "Val2"]]
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
        const headers = parsed[0].map((h: any) => String(h));
        const rows = parsed.slice(1).map((r: any) => Array.isArray(r) ? r : [String(r)]);
        return { headers, rows };
      }
    } catch (e) {
      // JSON parse failed on JSON-like text
      console.warn("Failed to parse JSON table content:", e);
    }
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
      if (line.startsWith('|')) cells.shift();
      if (line.endsWith('|')) cells.pop();
      
      return cells.map(cell => {
        const cleanCell = cell.replace(/[*_`]/g, '');
        const isCurrency = /^R?\$\s*[\d.,]+$/.test(cleanCell.trim());
        const cleanedStr = isCurrency ? cleanCell.replace(/[^\d.,]/g, '') : cleanCell;
        const parseNumStr = cleanedStr.includes(',') && cleanedStr.indexOf(',') > cleanedStr.lastIndexOf('.')
          ? cleanedStr.replace(/\./g, '').replace(',', '.')
          : cleanedStr.replace(/,/g, '');
          
        const num = Number(parseNumStr);
        if (!isNaN(num) && cleanedStr !== '' && !cleanedStr.startsWith('0') && cleanedStr.length < 15) {
          if (isCurrency) return '___CURRENCY___' + num;
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

  // 3. Fallback: CSV (ONLY IF NOT A FAILED JSON STRING to prevent 145 comma-split columns)
  if (!isLikelyJson) {
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
  }

  return {
    headers: ['Dados da Planilha'],
    rows: [[content]]
  };
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export function parseMultiSheetData(content: string): SheetData[] {
  if (!content) return [];
  const trimmed = cleanContentString(content);

  try {
    const isJson = trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('"sheets"') || trimmed.includes('"planilhas"');
    if (isJson) {
      const jsonCandidate = trimmed.startsWith('{') || trimmed.startsWith('[') 
        ? trimmed 
        : trimmed.substring(trimmed.indexOf('{'));
      
      const parsed = JSON.parse(jsonCandidate);
      
      const sheetsArray = parsed?.sheets || parsed?.planilhas || parsed?.tables;
      if (Array.isArray(sheetsArray) && sheetsArray.length > 0) {
        return sheetsArray.map((s: any, idx: number) => {
          const sheetName = (s.name || s.title || `Aba ${idx + 1}`).replace(/[*?:/\\[\\]]/g, '').substring(0, 31);
          let headers: string[] = [];
          let rows: (string | number)[][] = [];

          if (Array.isArray(s.headers)) {
            headers = s.headers.map((h: any) => String(h));
          } else if (Array.isArray(s.columns)) {
            headers = s.columns.map((c: any) => String(c));
          }

          if (Array.isArray(s.rows)) {
            rows = s.rows.map((r: any) => Array.isArray(r) ? r : [String(r)]);
          }

          if (headers.length === 0 && rows.length > 0) {
            headers = rows[0].map((_, i) => `Coluna ${i + 1}`);
          }

          return { name: sheetName, headers, rows };
        });
      }
    }
  } catch (e) {
    // Fall back
  }

  return [];
}

export async function generateExcelBlob(title: string, content: string): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Omnix AI';
  workbook.created = new Date();

  const multiSheets = parseMultiSheetData(content);

  const buildWorksheet = (worksheet: ExcelJS.Worksheet, headers: string[], rows: (string | number)[][]) => {
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
      const row = worksheet.addRow(rowValues.map(val => {
        if (typeof val === 'string' && val.startsWith('=')) {
          return { formula: val.substring(1) };
        }
        return val;
      }));
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
        } else if (typeof cell.value === 'string' && cell.value.startsWith('___CURRENCY___')) {
          cell.value = Number(cell.value.replace('___CURRENCY___', ''));
          cell.numFmt = '"R$" #,##0.00';
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
  };

  if (multiSheets.length > 0) {
    multiSheets.forEach((sd) => {
      const ws = workbook.addWorksheet(sd.name, { views: [{ showGridLines: true }] });
      buildWorksheet(ws, sd.headers, sd.rows);
    });
  } else {
    const sheetName = (title || 'Planilha').replace(/\.xlsx$/i, '').replace(/[*?:/\\[\\]]/g, '').substring(0, 31) || 'Planilha1';
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    const { headers, rows } = parseTableDataFromContent(content);
    buildWorksheet(worksheet, headers, rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
