import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function sanitizePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/[^\x00-\xFF]/g, '');
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  if (!text) return [''];
  
  // Clean markdown bold/italic inline markers for clean PDF display
  const cleanedText = text.replace(/[*_`#~]/g, '');

  const words = cleanedText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    let width = 0;
    try {
      width = font.widthOfTextAtSize(testLine, fontSize);
    } catch {
      width = testLine.length * (fontSize * 0.5);
    }

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

export async function generatePdfBlob(title: string, content: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28;  // A4 width
  const pageHeight = 841.89; // A4 height
  const marginLeft = 54;
  const marginRight = 54;
  const marginTop = 54;
  const marginBottom = 54;
  const printableWidth = pageWidth - marginLeft - marginRight;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < marginBottom) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  };

  // 1. Title Header - Only draw if title is a real title (not a filename like .pdf) and content doesn't already have an H1
  const isFilename = /\.(pdf|docx?|txt|md|xlsx?|json|csv|html?)$/i.test((title || '').trim()) || (title || '').includes('_');
  const contentHasH1 = /^\s*#\s+/m.test(content || '');
  const shouldDrawTitleHeader = !isFilename && !contentHasH1 && (title || '').trim().length > 0;

  const sanitizedTitle = sanitizePdfText(title || 'Documento');

  if (shouldDrawTitleHeader) {
    checkPageBreak(50);
    
    // Title text
    const titleFontSize = 24;
    const titleLines = wrapText(sanitizedTitle, fontBold, titleFontSize, printableWidth);
    
    // Center title lines
    for (const line of titleLines) {
      checkPageBreak(36);
      const lineWidth = fontBold.widthOfTextAtSize(line, titleFontSize);
      const xPos = marginLeft + (printableWidth - lineWidth) / 2;
      page.drawText(line, {
        x: xPos,
        y,
        size: titleFontSize,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.45),
      });
      y -= 32;
    }

    // Decorative blue line below title, centered
    checkPageBreak(25);
    y -= 8;
    const lineLength = printableWidth * 0.4;
    const lineStart = marginLeft + (printableWidth - lineLength) / 2;
    page.drawLine({
      start: { x: lineStart, y },
      end: { x: lineStart + lineLength, y },
      thickness: 2,
      color: rgb(0.2, 0.4, 0.8),
    });
    y -= 25;
  }

  // 2. Content Processing Line by Line
  const rawLines = (content || '').split('\n');
  let inCodeBlock = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const trimmed = rawLine.trim();

    // Check code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      y -= 4;
      continue;
    }

    if (inCodeBlock) {
      const sanitizedCode = sanitizePdfText(rawLine);
      const codeFontSize = 9;
      const codeLineHeight = 12;
      const codeLines = wrapText(sanitizedCode, fontMono, codeFontSize, printableWidth - 16);
      
      for (const cLine of codeLines) {
        checkPageBreak(codeLineHeight + 4);
        page.drawRectangle({
          x: marginLeft,
          y: y - 2,
          width: printableWidth,
          height: codeLineHeight + 2,
          color: rgb(0.95, 0.96, 0.98),
        });
        page.drawText(cLine, {
          x: marginLeft + 8,
          y,
          size: codeFontSize,
          font: fontMono,
          color: rgb(0.2, 0.25, 0.35),
        });
        y -= codeLineHeight;
      }
      continue;
    }

    if (!trimmed) {
      y -= 8;
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      const text = sanitizePdfText(trimmed.substring(2));
      const fontSize = 20;
      const lineHeight = 26;
      checkPageBreak(lineHeight + 10);
      y -= 8;
      const wrapped = wrapText(text, fontBold, fontSize, printableWidth);
      for (const wLine of wrapped) {
        checkPageBreak(lineHeight);
        page.drawText(wLine, {
          x: marginLeft,
          y,
          size: fontSize,
          font: fontBold,
          color: rgb(0.15, 0.2, 0.35),
        });
        y -= lineHeight;
      }
      y -= 6;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const text = sanitizePdfText(trimmed.substring(3));
      const fontSize = 16;
      const lineHeight = 22;
      checkPageBreak(lineHeight + 8);
      y -= 6;
      const wrapped = wrapText(text, fontBold, fontSize, printableWidth);
      for (const wLine of wrapped) {
        checkPageBreak(lineHeight);
        page.drawText(wLine, {
          x: marginLeft,
          y,
          size: fontSize,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.4),
        });
        y -= lineHeight;
      }
      y -= 4;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const text = sanitizePdfText(trimmed.substring(4));
      const fontSize = 14;
      const lineHeight = 19;
      checkPageBreak(lineHeight + 6);
      y -= 4;
      const wrapped = wrapText(text, fontBold, fontSize, printableWidth);
      for (const wLine of wrapped) {
        checkPageBreak(lineHeight);
        page.drawText(wLine, {
          x: marginLeft,
          y,
          size: fontSize,
          font: fontBold,
          color: rgb(0.25, 0.3, 0.45),
        });
        y -= lineHeight;
      }
      y -= 2;
      continue;
    }

    // Bullet points / lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s+/.test(trimmed)) {
      const isNumbered = /^\d+\.\s+/.test(trimmed);
      let prefix = '• ';
      let cleanText = trimmed;
      if (isNumbered) {
        const match = trimmed.match(/^(\d+\.)\s+(.*)/);
        if (match) {
          prefix = match[1] + ' ';
          cleanText = match[2];
        }
      } else {
        cleanText = trimmed.substring(2);
      }

      cleanText = sanitizePdfText(cleanText);
      const fontSize = 12;
      const lineHeight = 16.5;
      const indent = 16;
      
      const wrapped = wrapText(cleanText, fontRegular, fontSize, printableWidth - indent);
      for (let i = 0; i < wrapped.length; i++) {
        checkPageBreak(lineHeight);
        if (i === 0) {
          page.drawText(sanitizePdfText(prefix), {
            x: marginLeft,
            y,
            size: fontSize,
            font: fontBold,
            color: rgb(0.2, 0.4, 0.8),
          });
        }
        page.drawText(wrapped[i], {
          x: marginLeft + indent,
          y,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= lineHeight;
      }
      y -= 4; // Add more spacing after list items
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const text = sanitizePdfText(trimmed.substring(2));
      const fontSize = 12;
      const lineHeight = 16.5;
      const wrapped = wrapText(text, fontOblique, fontSize, printableWidth - 16);
      for (const wLine of wrapped) {
        checkPageBreak(lineHeight + 2);
        page.drawLine({
          start: { x: marginLeft + 4, y: y - 2 },
          end: { x: marginLeft + 4, y: y + 12 },
          thickness: 2,
          color: rgb(0.7, 0.75, 0.85),
        });
        page.drawText(wLine, {
          x: marginLeft + 14,
          y,
          size: fontSize,
          font: fontOblique,
          color: rgb(0.35, 0.4, 0.45),
        });
        y -= lineHeight;
      }
      y -= 4; // Add more spacing after blockquote
      continue;
    }

    // Regular paragraph line
    const cleanParagraph = sanitizePdfText(rawLine);
    const fontSize = 12; // Increased base font size
    const lineHeight = 17; // Increased line height
    const wrapped = wrapText(cleanParagraph, fontRegular, fontSize, printableWidth);

    for (const wLine of wrapped) {
      checkPageBreak(lineHeight);
      page.drawText(wLine, {
        x: marginLeft,
        y,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= lineHeight;
    }
    y -= 6; // Add more spacing between paragraphs
  }

  // 3. Page numbers at footer
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = sanitizePdfText(`Página ${i + 1} de ${totalPages} • WSM 1.6`);
    const footerFontSize = 8;
    const textWidth = fontRegular.widthOfTextAtSize(footerText, footerFontSize);
    
    // Top header line on pages 2+
    if (i > 0) {
      p.drawText(sanitizedTitle.substring(0, 50), {
        x: marginLeft,
        y: pageHeight - 32,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.6),
      });
      p.drawLine({
        start: { x: marginLeft, y: pageHeight - 38 },
        end: { x: pageWidth - marginRight, y: pageHeight - 38 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.88),
      });
    }

    // Footer line
    p.drawLine({
      start: { x: marginLeft, y: 38 },
      end: { x: pageWidth - marginRight, y: 38 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });

    p.drawText(footerText, {
      x: (pageWidth - textWidth) / 2,
      y: 24,
      size: footerFontSize,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
