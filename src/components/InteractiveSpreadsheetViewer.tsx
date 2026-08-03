import React, { useState } from 'react';
import { parseTableDataFromContent, generateExcelBlob } from '../utils/excelGenerator';

interface InteractiveSpreadsheetViewerProps {
  title: string;
  content: string;
  onContentChange?: (updatedContent: string) => void;
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

export default function InteractiveSpreadsheetViewer({
  title,
  content,
  onContentChange
}: InteractiveSpreadsheetViewerProps) {
  const parsedData = parseTableDataFromContent(content);

  const [headers, setHeaders] = useState<string[]>(parsedData.headers);
  const [rows, setRows] = useState<(string | number)[][]>(parsedData.rows);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // Sync back to markdown table format for internal state persistence
  const syncToContent = (newHeaders: string[], newRows: (string | number)[][]) => {
    if (!onContentChange) return;

    const headerLine = `| ${newHeaders.join(' | ')} |`;
    const separatorLine = `| ${newHeaders.map(() => '---').join(' | ')} |`;
    const dataLines = newRows.map(r => `| ${r.map(cell => cell !== null && cell !== undefined ? String(cell) : '').join(' | ')} |`);

    const markdownTable = [headerLine, separatorLine, ...dataLines].join('\n');
    onContentChange(markdownTable);
  };

  // Cell change
  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const updatedRows = [...rows];
    const num = Number(val.replace(',', '.'));
    const finalVal = !isNaN(num) && val.trim() !== '' ? num : val;

    if (!updatedRows[rowIndex]) {
      updatedRows[rowIndex] = new Array(headers.length).fill('');
    } else {
      updatedRows[rowIndex] = [...updatedRows[rowIndex]];
    }
    updatedRows[rowIndex][colIndex] = finalVal;

    setRows(updatedRows);
    syncToContent(headers, updatedRows);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="min-w-full text-left border-collapse text-[13px] font-sans table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 shadow-sm">
            <tr>
              <th className="w-10 border-b border-r border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-850 sticky left-0 z-20"></th>
              {headers.map((_, colIdx) => (
                <th
                  key={colIdx}
                  className="w-32 px-2 py-1 text-center font-normal text-gray-600 dark:text-gray-300 border-b border-r border-gray-300 dark:border-gray-700 select-none"
                >
                  {getColumnLetter(colIdx)}
                </th>
              ))}
              <th className="w-8 border-b border-gray-300 dark:border-gray-700"></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900">
            {/* Table Header Row (Row 1 in spreadsheet) */}
            <tr>
              <td className="w-10 border-b border-r border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-850 text-center text-gray-500 font-normal select-none sticky left-0 z-10">
                1
              </td>
              {headers.map((headerText, colIdx) => (
                <td
                  key={`header-${colIdx}`}
                  className="px-2 py-1.5 border-b border-r border-gray-300 dark:border-gray-700 bg-[#1f4e78] dark:bg-[#107c41] text-white font-bold tracking-wide truncate"
                >
                  {headerText}
                </td>
              ))}
              <td className="border-b border-gray-300 dark:border-gray-700"></td>
            </tr>

            {/* Table Data Rows */}
            {rows.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
              >
                <td className="w-10 border-b border-r border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-850 text-center text-gray-500 font-normal select-none sticky left-0 z-10">
                  {rowIdx + 2}
                </td>
                {headers.map((_, colIdx) => {
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const cellVal = row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx] : '';
                  const isNum = typeof cellVal === 'number';

                  return (
                    <td
                      key={colIdx}
                      onDoubleClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                      className={`px-2 py-1.5 border-b border-r border-gray-200 dark:border-gray-800 transition-colors bg-white dark:bg-gray-900 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 ${
                        isNum ? 'text-right font-mono' : 'text-left font-sans'
                      }`}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={String(cellVal)}
                          onBlur={(e) => {
                            handleCellChange(rowIdx, colIdx, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCellChange(rowIdx, colIdx, e.currentTarget.value);
                              setEditingCell(null);
                            }
                          }}
                          className="w-full h-full outline-none bg-transparent text-gray-900 dark:text-gray-100 px-1 font-sans"
                        />
                      ) : (
                        <div className="w-full truncate text-gray-800 dark:text-gray-200 px-1 min-h-[18px]">
                          {String(cellVal)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-gray-200 dark:border-gray-800"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
