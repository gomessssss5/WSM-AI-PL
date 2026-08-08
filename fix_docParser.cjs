const fs = require('fs');
let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

const functionStart = code.indexOf('export function parseJsonDocSafely(jsonStr: string)');
const functionEnd = code.indexOf('export function extractWsmDoc');

const newFunction = `export function parseJsonDocSafely(jsonStr: string): { title?: string; content?: string; format?: string } | null {
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
      rest = rest.replace(/["'\`]\\s*,\\s*"format"[\\s\\S]*$/i, '');
      // 2. replace trailing ', "title": "index.html" }'
      rest = rest.replace(/["'\`]\\s*,\\s*"title"[\\s\\S]*$/i, '');
      // 3. replace trailing '}'
      rest = rest.replace(/["'\`]\\s*\\}[\\s\\S]*$/i, '');
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

`;

code = code.substring(0, functionStart) + newFunction + code.substring(functionEnd);
fs.writeFileSync('src/utils/docParser.ts', code);
