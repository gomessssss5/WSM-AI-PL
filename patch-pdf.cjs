const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

const tableCode = `
    // Basic Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const cells = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const isSeparator = cells.every(c => /^[-\\s:]+$/.test(c));
      
      if (isSeparator) {
        continue;
      }

      const isHeader = idx === 0 || !(rawLines[idx-1] || '').trim().startsWith('|');
      const fontSize = 10;
      const lineHeight = 20;
      checkPageBreak(lineHeight);
      
      const colWidth = printableWidth / Math.max(cells.length, 1);
      
      page.drawRectangle({
        x: marginLeft,
        y: y - 6,
        width: printableWidth,
        height: lineHeight,
        color: isHeader ? rgb(0.92, 0.95, 0.98) : rgb(0.98, 0.98, 0.99),
        borderColor: rgb(0.85, 0.88, 0.9),
        borderWidth: 1,
      });

      for (let c = 0; c < cells.length; c++) {
        const text = sanitizePdfText(cells[c].replace(/[*_\`]/g, ''));
        const wrapped = wrapText(text, fontRegular, fontSize, colWidth - 8);
        if (wrapped.length > 0) {
            page.drawText(wrapped[0] + (wrapped.length > 1 ? '...' : ''), {
                x: marginLeft + c * colWidth + 4,
                y,
                size: fontSize,
                font: isHeader ? fontBold : fontRegular,
                color: rgb(0.2, 0.25, 0.3),
            });
        }
      }
      y -= lineHeight;
      continue;
    }

    // Regular paragraph line`;

code = code.replace('// Regular paragraph line', tableCode);
fs.writeFileSync('src/utils/pdfGenerator.ts', code);
