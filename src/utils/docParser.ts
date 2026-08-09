import { WsmDocument } from '../types';

export function inferFormatFromTitle(title: string, defaultFormat = 'pdf'): string {
  if (!title) return defaultFormat;
  const cleanTitle = title.trim().toLowerCase();
  const extMatch = cleanTitle.match(/\.([a-z0-9]+)$/i);
  if (extMatch) {
    const ext = extMatch[1];
    if (['html', 'htm'].includes(ext)) return 'html';
    if (['js', 'jsx'].includes(ext)) return 'js';
    if (['ts', 'tsx'].includes(ext)) return 'ts';
    if (['py'].includes(ext)) return 'py';
    if (['json'].includes(ext)) return 'json';
    if (['css'].includes(ext)) return 'css';
    if (['sql'].includes(ext)) return 'sql';
    if (['csv', 'xlsx', 'xls', 'sheet', 'planilha'].includes(ext)) return 'xlsx';
    if (['md', 'markdown'].includes(ext)) return 'md';
    if (['txt'].includes(ext)) return 'txt';
    if (['pdf'].includes(ext)) return 'pdf';
    return ext;
  }
  return defaultFormat;
}

export function normalizeFilename(filename: string): string {
  if (!filename) return 'documento';
  return filename
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace anything not alphanumeric, dot, dash, or underscore with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with a single one
    .trim();
}

export function sanitizeDocumentContent(rawContent: string): string {
  if (!rawContent) return '';
  let str = rawContent.trim();

  // 1. Unwrap JSON wrapper if content is stringified JSON e.g. {"title": "...", "content": "..."}
  if (str.startsWith('{') && (str.includes('"content"') || str.includes('"code"') || str.includes('"html"'))) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        if (parsed.content !== undefined) {
          str = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content);
        } else if (parsed.code !== undefined) {
          str = typeof parsed.code === 'string' ? parsed.code : JSON.stringify(parsed.code);
        }
      }
    } catch (e) {
      const match = str.match(/"content"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"format"|,\s*"title"|\})/i);
      if (match) {
        str = match[1];
      }
    }
  }

  // 2. Unescape escaped characters
  if (typeof str === 'string') {
    str = str.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  }

  // 3. Clean markdown fences e.g. ```html ... ```
  if (str.startsWith('```')) {
    str = str.replace(/^```[a-zA-Z0-9_-]*\s*/i, '').replace(/\s*```$/, '').trim();
  }

  return str;
}

export function parseJsonDocSafely(jsonStr: string): { title?: string; content?: string; format?: string } | null {
  if (!jsonStr) return null;
  let str = jsonStr.trim();

  // Helper to extract content from an object if nested
  const unwrapDocObj = (obj: any) => {
    if (!obj || typeof obj !== 'object') return null;
    let title = obj.title ? String(obj.title).trim() : undefined;
    let format = obj.format || obj.type ? String(obj.format || obj.type).toLowerCase() : undefined;
    let content = obj.content !== undefined ? obj.content : '';

    if (typeof content === 'object' && content !== null) {
      try { content = JSON.stringify(content); } catch (e) { content = String(content); }
    } else {
      content = String(content);
    }

    if (typeof content === 'string' && content.trim().startsWith('{') && content.includes('"content"')) {
      try {
        const inner = JSON.parse(content.trim());
        if (inner && typeof inner === 'object') {
          if (inner.content !== undefined) content = String(inner.content);
          if (inner.title && !title) title = String(inner.title).trim();
          if (inner.format && !format) format = String(inner.format).toLowerCase();
        }
      } catch (e) {}
    }

    return { title, content, format };
  };

  try {
    let parsed = JSON.parse(str);
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    const unwrapped = unwrapDocObj(parsed);
    if (unwrapped) return unwrapped;
  } catch (e) {}

  try {
    const sanitized = str.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    let parsed = JSON.parse(sanitized);
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    const unwrapped = unwrapDocObj(parsed);
    if (unwrapped) return unwrapped;
  } catch (e) {}

  // 3. Fallback regex extraction if JSON is malformed
  const titleMatch = str.match(/"title"\s*:\s*"([^"]+)"/i);
  const formatMatch = str.match(/"format"\s*:\s*"([^"]+)"/i);

  let content = '';
  let contentStartIdx = str.search(/"(content|code|html|texto)"\s*:\s*["'`]/i);
  if (contentStartIdx !== -1) {
    const colonIdx = str.indexOf(':', contentStartIdx);
    const match = str.substring(colonIdx).match(/["'`]/);
    if (match) {
      const quoteChar = match[0];
      const quoteStart = colonIdx + match.index;
      let rest = str.substring(quoteStart + 1);
      
      rest = rest.replace(new RegExp(quoteChar + "\\s*,\\s*\"format\"[\\s\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\s*,\\s*\"title\"[\\s\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\s*,\\s*\"type\"[\\s\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\s*\\}[\\s\\S]*$", "i"), '');
      rest = rest.replace(/["'`]$/, '');

      content = rest;
    }
  } else {
    // If we really can't find a content field, but it's clearly a JSON wrapper,
    // let's try to extract whatever is the longest string value.
    const allStrings = [...str.matchAll(/"(?:[^"\\]|\\.)*"/g)];
    if (allStrings.length > 0) {
       let longest = "";
       for(const s of allStrings) {
          if (s[0].length > longest.length) longest = s[0];
       }
       // If the longest string is at least 30 chars, assume it's the content
       if (longest.length > 30) {
          content = longest.substring(1, longest.length - 1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
       }
    }
  }

  if (titleMatch || content || formatMatch) {
    let finalContent = content;
    // Don't fall back to returning the raw JSON wrapper if we extracted a title/format but no content
    if (!finalContent) {
      if (str.trim().startsWith('{') && str.trim().endsWith('}')) {
        finalContent = ""; // It's just a broken JSON with no content
      } else {
        finalContent = str; // Maybe the whole string IS the content
      }
    }
    
    return {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      content: finalContent,
      format: formatMatch ? formatMatch[1].toLowerCase() : undefined
    };
  }

  return null;
}

export function extractWsmDoc(text: string | undefined): { cleanText: string, docObj: WsmDocument | null, docObjs: WsmDocument[] } {
  if (!text) return { cleanText: "", docObj: null, docObjs: [] };

  const openTag = "<wsm_doc>";
  const closeTag = "</wsm_doc>";
  
  let currentText = text;
  const rawDocObjs: WsmDocument[] = [];

  // 1. Extract <wsm_doc>...</wsm_doc> tags first
  const regex = /<(wsm_doc)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/i;
  
  while (true) {
    const match = regex.exec(currentText);
    if (match) {
      const [fullMatch, tagName, innerContent] = match;
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      
      const jsonStr = innerContent.trim();
      currentText = currentText.substring(0, startIndex) + currentText.substring(endIndex);

      // Check if innerContent is raw HTML / XML without JSON wrapping
      if (jsonStr.startsWith('<!DOCTYPE') || jsonStr.startsWith('<html') || (jsonStr.includes('<head>') && jsonStr.includes('</body>'))) {
        let docTitle = 'index.html';
        const titleTagMatch = jsonStr.match(/<title>([^<]+)<\/title>/i);
        if (titleTagMatch && titleTagMatch[1].trim()) {
          docTitle = titleTagMatch[1].trim() + '.html';
        }
        rawDocObjs.push({
          title: docTitle,
          content: jsonStr,
          format: 'html'
        });
      } else {
        const parsedDoc = parseJsonDocSafely(jsonStr);
        if (parsedDoc) {
          const title = (parsedDoc.title || 'Documento').trim();
          let content = sanitizeDocumentContent(parsedDoc.content || '');
          
          let rawFormat = (parsedDoc.format || '').toString().toLowerCase();

          if (!rawFormat || rawFormat === 'pdf' || rawFormat === 'documento') {
            const inferred = inferFormatFromTitle(title, '');
            if (inferred) {
              rawFormat = inferred;
            } else {
              const trimmedContent = content.trim().toLowerCase();
              if (trimmedContent.startsWith('<!doctype html') || trimmedContent.startsWith('<html') || (trimmedContent.includes('<head>') && trimmedContent.includes('</body>'))) {
                rawFormat = 'html';
              } else {
                rawFormat = rawFormat || 'pdf';
              }
            }
          }

          let format = rawFormat;
          if (rawFormat === 'markdown') {
            format = 'md';
          } else if (rawFormat === 'excel' || rawFormat === 'csv' || rawFormat === 'sheet' || rawFormat === 'planilha') {
            format = 'xlsx';
          }

          rawDocObjs.push({
            title,
            content,
            format
          });
        }
      }
    } else {
      // Partial form (streaming doc tag) - try to extract what we have before stripping
      const openRegex = /<(wsm_doc)(?:\s+[^>]*)?>/i;
      const openMatch = openRegex.exec(currentText);
      if (openMatch) {
        const incompleteContent = currentText.substring(openMatch.index + openMatch[0].length).trim();
        if (incompleteContent) {
           const parsedDoc = parseJsonDocSafely(incompleteContent);
           if (parsedDoc && (parsedDoc.title || parsedDoc.content)) {
             const title = (parsedDoc.title || 'Documento').trim();
             const content = sanitizeDocumentContent(parsedDoc.content || '');
             let rawFormat = (parsedDoc.format || '').toString().toLowerCase();
             if (!rawFormat || rawFormat === 'pdf' || rawFormat === 'documento') {
               const inferred = inferFormatFromTitle(title, '');
               rawFormat = inferred || 'pdf';
             }
             let format = rawFormat;
             if (rawFormat === 'markdown') format = 'md';
             else if (rawFormat === 'excel' || rawFormat === 'csv' || rawFormat === 'sheet' || rawFormat === 'planilha') format = 'xlsx';

             rawDocObjs.push({ title, content, format });
           } else if (incompleteContent.startsWith('<!DOCTYPE') || incompleteContent.startsWith('<html') || incompleteContent.includes('<head>')) {
              let docTitle = 'index.html';
              const titleTagMatch = incompleteContent.match(/<title>([^<]+)<\/title>/i);
              if (titleTagMatch && titleTagMatch[1].trim()) docTitle = titleTagMatch[1].trim() + '.html';
              rawDocObjs.push({ title: docTitle, content: incompleteContent, format: 'html' });
           }
        }
        currentText = currentText.substring(0, openMatch.index);
      }
      break;
    }
  }

  // 2. Intercept raw HTML document blocks or standalone html\n<!DOCTYPE html ... blocks
  const rawHtmlBlockRegex = /(?:```(?:html)?\s*)?(?:html\s*\n+)?(<!DOCTYPE html[\s\S]*?(?:<\/html>|```|$)|<html[\s\S]*?(?:<\/html>|```|$))/gi;
  let htmlMatch;
  while ((htmlMatch = rawHtmlBlockRegex.exec(currentText)) !== null) {
    const fullMatchedString = htmlMatch[0];
    const htmlCode = htmlMatch[1].replace(/```$/g, '').trim();

    if (htmlCode.length > 30) {
      let docTitle = 'Site HTML';
      const titleTagMatch = htmlCode.match(/<title>([^<]+)<\/title>/i);
      if (titleTagMatch && titleTagMatch[1].trim()) {
        docTitle = titleTagMatch[1].trim() + '.html';
      }

      rawDocObjs.push({
        title: docTitle,
        content: htmlCode,
        format: 'html'
      });

      currentText = currentText.replace(fullMatchedString, '');
      rawHtmlBlockRegex.lastIndex = 0;
    }
  }

  // 3. Fallback for AI claiming to create PDF/Document without <wsm_doc> tag
  if (rawDocObjs.length === 0 && text) {
    const lowerText = text.toLowerCase();
    const claimsPdf = lowerText.includes('pdf') || lowerText.includes('relatório') || lowerText.includes('artigo') || lowerText.includes('documento pdf') || lowerText.includes('criei o arquivo');
    const claimsExcel = lowerText.includes('excel') || lowerText.includes('planilha') || lowerText.includes('.xlsx');
    const claimsHtml = lowerText.includes('criei o site') || lowerText.includes('página web') || lowerText.includes('arquivo html');

    if ((claimsPdf || claimsExcel || claimsHtml) && text.length > 150) {
      let title = claimsExcel ? 'Planilha_Dados.xlsx' : claimsHtml ? 'Pagina.html' : 'Documento_Gerado.pdf';
      let format = claimsExcel ? 'xlsx' : claimsHtml ? 'html' : 'pdf';

      const firstLines = text.split('\n').filter(l => l.trim().length > 0);
      for (const line of firstLines) {
        if (line.startsWith('# ') || line.startsWith('## ')) {
          const candidateTitle = line.replace(/^[#\s]+/, '').trim();
          if (candidateTitle.length > 3 && candidateTitle.length < 50) {
            title = candidateTitle.replace(/[^a-zA-Z0-9_-]/g, '_') + (format === 'xlsx' ? '.xlsx' : format === 'html' ? '.html' : '.pdf');
            break;
          }
        }
      }

      rawDocObjs.push({
        title,
        content: text,
        format
      });
    }
  }

  // 3. Deduplicate docObjs by title / content signature
  const docObjs: WsmDocument[] = [];
  const seenKeys = new Set<string>();

  for (const doc of rawDocObjs) {
    doc.title = normalizeFilename(doc.title);
    const key = `${doc.title.toLowerCase()}:::${doc.content.substring(0, 100)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      docObjs.push(doc);
    }
  }

  let finalCleanText = currentText.trim();

  // If text became empty after stripping document/code dumps, provide a friendly fallback text
  if (!finalCleanText && docObjs.length > 0) {
    const firstDoc = docObjs[0];
    if (firstDoc.format === 'html') {
      finalCleanText = 'Criei o arquivo do site HTML solicitado! Você pode visualizar e interagir com ele no card abaixo:';
    } else {
      finalCleanText = `Gerei o arquivo **${firstDoc.title}** para você. Você pode acessá-lo e baixá-lo no card abaixo:`;
    }
  }

  return { 
    cleanText: finalCleanText, 
    docObj: docObjs.length > 0 ? docObjs[0] : null,
    docObjs 
  };
}
