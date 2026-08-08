const fs = require('fs');
let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

// We want to keep everything BEFORE export function parseJsonDocSafely
const startIdx = code.indexOf('export function parseJsonDocSafely(jsonStr: string)');
const prefix = code.substring(0, startIdx);

// And we want to keep extractWsmDoc. 
// We will just rewrite the rest of the file completely cleanly.
const suffix = `export function parseJsonDocSafely(jsonStr: string): { title?: string; content?: string; format?: string } | null {
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
    const sanitized = str.replace(/("(?:[^"\\\\]|\\\\.)*")/g, (match) => {
      return match.replace(/\\n/g, '\\\\n').replace(/\\r/g, '\\\\r').replace(/\\t/g, '\\\\t');
    });
    let parsed = JSON.parse(sanitized);
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    const unwrapped = unwrapDocObj(parsed);
    if (unwrapped) return unwrapped;
  } catch (e) {}

  // 3. Fallback regex extraction if JSON is malformed
  const titleMatch = str.match(/"title"\\s*:\\s*"([^"]+)"/i);
  const formatMatch = str.match(/"format"\\s*:\\s*"([^"]+)"/i);

  let content = '';
  const contentStartIdx = str.search(/"content"\\s*:\\s*["'\`]/i);
  if (contentStartIdx !== -1) {
    const colonIdx = str.indexOf(':', contentStartIdx);
    const match = str.substring(colonIdx).match(/["'\`]/);
    if (match) {
      const quoteChar = match[0];
      const quoteStart = colonIdx + match.index;
      let rest = str.substring(quoteStart + 1);
      
      // Heuristic: remove known trailing JSON parts from the end
      // 1. replace trailing ', "format": "html" }'
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"format\\\"[\\\\s\\\\S]*$", "i"), '');
      // 2. replace trailing ', "title": "index.html" }'
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"title\\\"[\\\\s\\\\S]*$", "i"), '');
      // 3. replace trailing '}'
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*\\\\}[\\\\s\\\\S]*$", "i"), '');
      // 4. replace trailing quote if it still exists
      rest = rest.replace(/["'\`]$/, '');

      content = rest;
    }
  }

  if (titleMatch || content || formatMatch) {
    return {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      content: content || str,
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
  const regex = /<(wsm_doc)(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/\\1>/i;
  
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
        const titleTagMatch = jsonStr.match(/<title>([^<]+)<\\/title>/i);
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
          let content = parsedDoc.content || '';
          
          if (typeof content === 'string') {
            // Unescape escaped characters (literal \\n, \\", \\t, \\\\)
            content = content.replace(/\\\\n/g, '\\n').replace(/\\\\"/g, '"').replace(/\\\\t/g, '\\t').replace(/\\\\\\\\/g, '\\\\');
          }
          
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
      // Partial form (streaming doc tag) - strip from openTag onwards
      const openRegex = /<(wsm_doc)(?:\\s+[^>]*)?>/i;
      const openMatch = openRegex.exec(currentText);
      if (openMatch) {
        currentText = currentText.substring(0, openMatch.index);
      }
      break;
    }
  }

  // 2. Intercept raw HTML document blocks or standalone html\\n<!DOCTYPE html ... blocks
  const rawHtmlBlockRegex = /(?:\`\`\`(?:html)?\\s*)?(?:html\\s*\\n+)?(<!DOCTYPE html[\\s\\S]*?(?:<\\/html>|\`\`\`|$)|<html[\\s\\S]*?(?:<\\/html>|\`\`\`|$))/gi;
  let htmlMatch;
  while ((htmlMatch = rawHtmlBlockRegex.exec(currentText)) !== null) {
    const fullMatchedString = htmlMatch[0];
    const htmlCode = htmlMatch[1].replace(/\`\`\`$/g, '').trim();

    if (htmlCode.length > 30) {
      let docTitle = 'Site HTML';
      const titleTagMatch = htmlCode.match(/<title>([^<]+)<\\/title>/i);
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

  // 3. Deduplicate docObjs by title / content signature
  const docObjs: WsmDocument[] = [];
  const seenKeys = new Set<string>();

  for (const doc of rawDocObjs) {
    const key = \`\${doc.title.toLowerCase()}:::\${doc.content.substring(0, 100)}\`;
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
      finalCleanText = \`Gerei o arquivo **\${firstDoc.title}** para você. Você pode acessá-lo e baixá-lo no card abaixo:\`;
    }
  }

  return { 
    cleanText: finalCleanText, 
    docObj: docObjs.length > 0 ? docObjs[0] : null,
    docObjs 
  };
}
`;

fs.writeFileSync('src/utils/docParser.ts', prefix + suffix);
