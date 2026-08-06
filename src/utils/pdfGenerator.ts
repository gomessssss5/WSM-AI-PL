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

/**
 * Converts raw HTML string to structured Markdown text if HTML is detected.
 */
function convertHtmlToMarkdown(html: string): string {
  if (!html) return '';
  const trimmed = html.trim().toLowerCase();
  const isHtml = trimmed.startsWith('<!doctype html') || 
                 trimmed.startsWith('<html') || 
                 (trimmed.includes('<head>') && trimmed.includes('</head>')) || 
                 (trimmed.includes('<body>') && trimmed.includes('</body>')) ||
                 /<(h[1-6]|p|div|style|script)\b/i.test(html);

  if (!isHtml) return html;

  let text = html;

  // 1. Remove <head>...</head>, <style>...</style>, <script>...</script>
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');

  // 2. Preserve & convert Images before stripping tags
  text = text.replace(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*?alt=["']([^"']+)["'][^>]*?\/?>/gi, '\n\n![$2]($1)\n\n');
  text = text.replace(/<img\s+[^>]*?alt=["']([^"']+)["'][^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi, '\n\n![$1]($2)\n\n');
  text = text.replace(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi, '\n\n![Imagem]($1)\n\n');

  // 3. Convert Headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');

  // 4. Convert Paragraphs & Line Breaks
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // 5. Convert Lists
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

  // 6. Convert Bold & Italic
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*');

  // 7. Convert Blockquotes & Divs
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n\n> $1\n\n');
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // 8. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 9. Decode HTML entities
  if (typeof document !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.body.textContent || text;
    } catch {
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
  }

  // 10. Clean up excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
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

/**
 * Loads an image from Data URI, HTTP URL, or Blob URL and converts it to PNG bytes.
 */
async function loadImageAsPngBytes(src: string): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  if (!src) return null;

  // Method 1: HTML Canvas conversion (handles WEBP, PNG, JPEG, GIF, SVG, Data URIs, etc.)
  if (typeof document !== 'undefined') {
    const canvasResult = await new Promise<{ bytes: Uint8Array; width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width || 400;
          const naturalH = img.naturalHeight || img.height || 300;

          const canvas = document.createElement('canvas');
          canvas.width = naturalW;
          canvas.height = naturalH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          const base64Str = dataUrl.split(',')[1];
          if (!base64Str) return resolve(null);

          const binaryStr = atob(base64Str);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          resolve({ bytes, width: naturalW, height: naturalH });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });

    if (canvasResult) return canvasResult;
  }

  // Method 2: Direct Base64 decoding if canvas is unavailable or failed
  if (src.startsWith('data:image/')) {
    try {
      const parts = src.split(',');
      if (parts.length === 2) {
        const base64Str = parts[1];
        const binaryStr = atob(base64Str);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return { bytes, width: 600, height: 400 };
      }
    } catch (e) {
      console.warn('Direct base64 decode failed:', e);
    }
  }

  // Method 3: Fetch fallback for HTTP/HTTPS URLs
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const res = await fetch(src);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        return { bytes, width: 600, height: 400 };
      }
    } catch (e) {
      console.warn('Fetch fallback failed:', e);
    }
  }

  return null;
}

export async function generatePdfBlob(title: string, rawContent: string, attachedImages?: string[]): Promise<Blob> {
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

  // Convert raw HTML into clean Markdown if HTML tags are present
  const content = convertHtmlToMarkdown(rawContent || '');

  // 1. Title Header
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

  // Track if any image was embedded from markdown tags
  let hasEmbeddedImage = false;

  // Function to render an image onto the page
  const renderImageToPage = async (srcUrl: string) => {
    const loaded = await loadImageAsPngBytes(srcUrl);
    if (!loaded) return false;

    let embeddedImg = null;
    try {
      embeddedImg = await pdfDoc.embedPng(loaded.bytes);
    } catch {
      try {
        embeddedImg = await pdfDoc.embedJpg(loaded.bytes);
      } catch {
        embeddedImg = null;
      }
    }

    if (!embeddedImg) return false;

    // Normal, elegant size scaling for A4 page
    const maxWidth = printableWidth;
    const maxHeight = 260; // Clean, standard height
    const wRatio = maxWidth / loaded.width;
    const hRatio = maxHeight / loaded.height;
    const scale = Math.min(1, wRatio, hRatio);

    const renderW = Math.round(loaded.width * scale);
    const renderH = Math.round(loaded.height * scale);

    checkPageBreak(renderH + 20);

    const xPos = marginLeft + (printableWidth - renderW) / 2;

    page.drawImage(embeddedImg, {
      x: xPos,
      y: y - renderH,
      width: renderW,
      height: renderH,
    });

    y -= (renderH + 16);
    hasEmbeddedImage = true;
    return true;
  };

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

    // Check for Markdown image tag: ![alt](url)
    const markdownImgMatch = trimmed.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (markdownImgMatch) {
      let imgSrc = markdownImgMatch[2].trim();
      // If there are spaces (like a title or comment added by the AI), the URL is just the first part
      imgSrc = imgSrc.split(/\s+/)[0];
      // If imgSrc is a alias/placeholder, try attachedImages
      if ((imgSrc.length < 20 || !imgSrc.includes(':')) && attachedImages && attachedImages.length > 0) {
        imgSrc = attachedImages[0];
      }
      const success = await renderImageToPage(imgSrc);
      if (!success) {
        // Render a placeholder instead of dumping base64 or long URLs
        const altText = markdownImgMatch[1] || 'Imagem';
        const fontSize = 12;
        checkPageBreak(17);
        page.drawText(`[${altText}]`, {
          x: marginLeft,
          y,
          size: fontSize,
          font: fontOblique,
          color: rgb(0.5, 0.55, 0.6),
        });
        y -= 17;
      }
      continue;
    }

    // Check for inline data:image/... base64 or stand-alone image URL
    if (trimmed.startsWith('data:image/') || /^https?:\/\/.+\.(png|jpe?g|webp|gif)$/i.test(trimmed)) {
      const success = await renderImageToPage(trimmed);
      if (!success && trimmed.startsWith('data:image/')) {
        continue; // Do not render giant base64 text if it failed
      }
      if (success) continue;
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
      y -= 4;
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
      y -= 4;
      continue;
    }

    
    // Basic Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const cells = trimmed.split('|').map(s => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const isSeparator = cells.every(c => /^[-\s:]+$/.test(c));
      
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
        const text = sanitizePdfText(cells[c].replace(/[*_`]/g, ''));
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

    // Regular paragraph line
    const cleanParagraph = sanitizePdfText(rawLine);
    const fontSize = 12;
    const lineHeight = 17;
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
    y -= 6;
  }

  // If user attached images and none were explicitly placed via markdown tag, auto-embed attached image
  if (!hasEmbeddedImage && attachedImages && attachedImages.length > 0) {
    for (const attImg of attachedImages) {
      if (attImg) {
        await renderImageToPage(attImg);
      }
    }
  }

  // 3. Page numbers at footer
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = sanitizePdfText(`Página ${i + 1} de ${totalPages} • Ominx 1.6`);
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
