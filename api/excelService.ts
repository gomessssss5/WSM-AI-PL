import ExcelJS from 'exceljs';
import crypto from 'crypto';

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

export interface XlsxValidationResult {
  valid: boolean;
  versionId: string;
  sheetCount: number;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  sheets: Array<{ name: string; rows: number; columns: number }>;
  formulasCount: number;
  sha256: string;
  byteSize: number;
  error?: string;
  summary?: string;
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

  // 2. Try parsing Markdown Tables (| Col1 | Col2 |)
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(line => line.includes('|'));

  if (tableLines.length >= 2) {
    const rawHeaders = tableLines[0].split('|').map(s => s.trim()).filter(s => s !== '');
    const dataLines = tableLines.slice(1).filter(l => !/^[|\s:-]+$/.test(l));

    const rows: (string | number)[][] = dataLines.map(line => {
      const cells = line.split('|').map(s => s.trim());
      if (line.startsWith('|')) cells.shift();
      if (line.endsWith('|')) cells.pop();
      return cells.map(cell => {
        const cleanCell = cell.replace(/[*_`]/g, '');
        const num = Number(cleanCell.replace(',', '.'));
        return !isNaN(num) && cleanCell !== '' ? num : cleanCell;
      });
    });

    if (rawHeaders.length > 0) {
      return {
        headers: rawHeaders.map(h => h.replace(/[*_`]/g, '')),
        rows
      };
    }
  }

  // 3. CSV parsing fallback
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
        const num = Number(c.replace(',', '.'));
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

/**
 * Validates an XLSX buffer semantically:
 * - Verifies ZIP container magic header (PK\x03\x04)
 * - Loads with ExcelJS to ensure true OpenXML spreadsheet integrity
 * - Verifies sheet names, row counts, cell counts
 * - Scans for corrupted binary fragments inside cells (e.g. PK, xl/styles.xml, docProps/)
 * - Computes exact SHA-256 and byteSize
 */
export async function validateXlsxBuffer(buffer: Buffer, versionIndex = 1): Promise<XlsxValidationResult> {
  const byteSize = buffer ? buffer.length : 0;
  const sha256 = buffer && buffer.length > 0
    ? crypto.createHash('sha256').update(buffer).digest('hex')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const versionId = `v${versionIndex}_${sha256.substring(0, 8)}`;

  if (!buffer || buffer.length < 100) {
    return {
      valid: false,
      versionId,
      sheetCount: 0,
      rowCount: 0,
      columnCount: 0,
      cellCount: 0,
      sheets: [],
      formulasCount: 0,
      sha256,
      byteSize,
      error: `Buffer XLSX vazio ou muito pequeno (${byteSize} bytes).`
    };
  }

  // 1. Verify ZIP container magic bytes: 0x50 0x4B 0x03 0x04 (PK\x03\x04)
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
    return {
      valid: false,
      versionId,
      sheetCount: 0,
      rowCount: 0,
      columnCount: 0,
      cellCount: 0,
      sheets: [],
      formulasCount: 0,
      sha256,
      byteSize,
      error: 'Arquivo não possui cabeçalho de contêiner ZIP válido (Magic Header PK ausente).'
    };
  }

  // 2. Load with ExcelJS
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheetsInfo: Array<{ name: string; rows: number; columns: number }> = [];
    let totalRows = 0;
    let totalColumns = 0;
    let totalCells = 0;
    let formulasCount = 0;
    const corruptionErrors: string[] = [];

    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      return {
        valid: false,
        versionId,
        sheetCount: 0,
        rowCount: 0,
        columnCount: 0,
        cellCount: 0,
        sheets: [],
        formulasCount: 0,
        sha256,
        byteSize,
        error: 'O arquivo XLSX não contém nenhuma aba (worksheet) válida.'
      };
    }

    workbook.eachSheet((worksheet, sheetId) => {
      const sName = worksheet.name || `Aba ${sheetId}`;
      const rCount = worksheet.rowCount || 0;
      const cCount = worksheet.columnCount || 0;
      sheetsInfo.push({ name: sName, rows: rCount, columns: cCount });
      totalRows += rCount;
      totalColumns = Math.max(totalColumns, cCount);

      // Scan cells for binary corruption fragments
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          totalCells++;
          const val = cell.value;
          if (val && typeof val === 'object' && 'formula' in val) {
            formulasCount++;
          }
          if (typeof val === 'string') {
            if (
              val.includes('xl/styles.xml') ||
              val.includes('[Content_Types].xml') ||
              val.includes('docProps/app.xml') ||
              val.includes('xl/worksheets/') ||
              val.startsWith('PK\x03\x04') ||
              (val.length > 50 && /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(val))
            ) {
              corruptionErrors.push(`Célula [${rowNumber}, ${colNumber}] na aba "${sName}" contém fragmentos binários ou tags XML corrompidas: "${val.substring(0, 30)}..."`);
            }
          }
        });
      });
    });

    if (corruptionErrors.length > 0) {
      return {
        valid: false,
        versionId,
        sheetCount: sheetsInfo.length,
        rowCount: totalRows,
        columnCount: totalColumns,
        cellCount: totalCells,
        sheets: sheetsInfo,
        formulasCount,
        sha256,
        byteSize,
        error: `Corrupção semântica detectada no conteúdo das células: ${corruptionErrors.slice(0, 2).join('; ')}`
      };
    }

    const summary = `${sheetsInfo.length} aba(s), ${totalRows} linha(s), ${totalColumns} coluna(s), ${totalCells} célula(s) validadas com integridade`;

    return {
      valid: true,
      versionId,
      sheetCount: sheetsInfo.length,
      rowCount: totalRows,
      columnCount: totalColumns,
      cellCount: totalCells,
      sheets: sheetsInfo,
      formulasCount,
      sha256,
      byteSize,
      summary
    };
  } catch (err: any) {
    return {
      valid: false,
      versionId,
      sheetCount: 0,
      rowCount: 0,
      columnCount: 0,
      cellCount: 0,
      sheets: [],
      formulasCount: 0,
      sha256,
      byteSize,
      error: `Falha ao carregar e decodificar planilha XLSX: ${err?.message || err}`
    };
  }
}

/**
 * Generates and semantically validates an XLSX buffer.
 */
export async function generateExcelBuffer(title: string, content: string | Buffer | Uint8Array, versionIndex = 1): Promise<Buffer> {
  // If content is already a valid XLSX Buffer or Uint8Array
  if (content instanceof Buffer || content instanceof Uint8Array) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const val = await validateXlsxBuffer(buf, versionIndex);
    if (val.valid) {
      (buf as any).validation = val;
      return buf;
    }
  }

  // If content is a binary string starting with PK magic bytes
  if (typeof content === 'string' && (content.startsWith('PK\x03\x04') || content.startsWith('UEsDBBQ'))) {
    try {
      const buf = content.startsWith('UEsDBBQ')
        ? Buffer.from(content, 'base64')
        : Buffer.from(content, 'binary');
      const val = await validateXlsxBuffer(buf, versionIndex);
      if (val.valid) {
        (buf as any).validation = val;
        return buf;
      }
    } catch {}
  }

  const tableData = parseTableDataFromContent(typeof content === 'string' ? content : '');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Omnix AI';
  workbook.lastModifiedBy = 'Omnix AI';
  workbook.created = new Date();
  workbook.modified = new Date();

  const cleanTitle = (title || 'Planilha').replace(/\.xlsx$/i, '').replace(/[*?:/\\[\\]]/g, '').trim();
  const sheetName = (cleanTitle || 'Planilha').slice(0, 31);
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
    const r = worksheet.addRow(row.map(cellVal => {
      if (typeof cellVal === 'string' && cellVal.startsWith('=')) {
        return { formula: cellVal.substring(1).trim() };
      }
      return cellVal;
    }));
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

    // Number & Formula formatting
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
    column.width = Math.min(Math.max(maxLength + 4, 12), 45);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validate the generated buffer
  const validation = await validateXlsxBuffer(buffer, versionIndex);
  if (!validation.valid) {
    console.error('[ExcelService] Falha na validação do buffer gerado:', validation.error);
  }

  (buffer as any).validation = validation;
  return buffer;
}

export async function generateExcelBufferWithValidation(title: string, content: string, versionIndex = 1): Promise<{ buffer: Buffer; validation: XlsxValidationResult }> {
  const buffer = await generateExcelBuffer(title, content, versionIndex);
  const validation = (buffer as any).validation || await validateXlsxBuffer(buffer, versionIndex);
  return { buffer, validation };
}

