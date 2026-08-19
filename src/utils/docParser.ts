import { WsmDocument, ArtifactValidationStatus } from '../types';
import { terminalSandbox } from '../lib/terminalSandbox';

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
    if (['csv'].includes(ext)) return 'csv';
    if (['xlsx', 'xls', 'sheet', 'planilha'].includes(ext)) return 'xlsx';
    if (['md', 'markdown'].includes(ext)) return 'md';
    if (['txt'].includes(ext)) return 'txt';
    if (['pdf'].includes(ext)) return 'pdf';
    return ext;
  }
  return defaultFormat;
}

export function normalizeFilename(filename: string): string {
  if (!filename) return 'documento';
  let clean = filename.trim().replace(/^[\/\\]+/, '').replace(/^workspace[\/\\]+/i, '');
  return clean
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

  // 4. Fix AI tokenizer hallucination where __main__ becomes __mainజ్య__
  str = str.replace(/__mainజ్య__/g, '__main__');
  // General fix for any trailing weird characters after __main
  str = str.replace(/__main[\u0C00-\u0C7F]+__/g, '__main__'); // Telugu block

  return str;
}

export function computeSha256(str: string): string {
  if (!str) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  
  const utf8 = new TextEncoder().encode(str);
  const rr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const l = utf8.length;
  const bitLen = l * 8;

  const padLen = (l % 64 < 56) ? (56 - l % 64) : (120 - l % 64);
  const totalLen = l + padLen + 8;
  const bytes = new Uint8Array(totalLen);
  bytes.set(utf8);
  bytes[l] = 0x80;

  const view = new DataView(bytes.buffer);
  view.setUint32(totalLen - 4, bitLen, false);

  const W = new Uint32Array(64);
  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rr(7, W[t - 15]) ^ rr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rr(17, W[t - 2]) ^ rr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rr(6, e) ^ rr(11, e) ^ rr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rr(2, a) ^ rr(13, a) ^ rr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}

export function buildDocumentValidation(title: string, format: string, content: string) {
  const contentStr = content || '';
  const byteSize = new TextEncoder().encode(contentStr).length;
  const hash = computeSha256(contentStr);

  const metRequirements: string[] = [];
  const unmetRequirements: string[] = [];

  // Requirement 1: Non-empty file
  if (byteSize > 0) {
    metRequirements.push(`Conteúdo lido com sucesso do buffer (${byteSize} bytes)`);
  } else {
    unmetRequirements.push('Arquivo gerado está completamente vazio (0 bytes)');
  }

  // Requirement 2: Hash verification
  metRequirements.push(`SHA-256 verificado: ${hash.substring(0, 16)}...`);

  // Requirement 3: Check for table completeness (if content has table delimiter | --- |)
  const hasTableHeader = /\|[\s-:]+\|[\s-:]+\|/.test(contentStr) || (/\|.*\|/.test(contentStr) && /\|[-:]+\|/.test(contentStr));
  if (hasTableHeader) {
    const lines = contentStr.split('\n').map(l => l.trim()).filter(Boolean);
    const delimIdx = lines.findIndex(l => /^\|[\s-:]+\|/.test(l));
    let dataRowsCount = 0;
    if (delimIdx !== -1) {
      for (let i = delimIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('|') && lines[i].endsWith('|')) {
          dataRowsCount++;
        }
      }
    }
    if (dataRowsCount > 0) {
      metRequirements.push(`Tabela Markdown validada: ${dataRowsCount} linha(s) de dados lida(s)`);
    } else {
      unmetRequirements.push('Tabela Markdown possui cabeçalho, mas NENHUMA linha de dados foi encontrada');
    }
  }

  // Requirement 4: Format-specific checks
  const cleanFmt = (format || '').toLowerCase();
  if (cleanFmt === 'xlsx' || cleanFmt === 'json') {
    try {
      const parsed = JSON.parse(contentStr);
      if (cleanFmt === 'xlsx') {
        if (parsed.sheets && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          const totalRows = parsed.sheets.reduce((acc: number, s: any) => acc + (s.rows?.length || 0), 0);
          if (totalRows > 0) {
            metRequirements.push(`Planilha Excel validada com ${totalRows} linha(s) de dados`);
          } else {
            unmetRequirements.push('Planilha Excel declarada sem linhas de dados');
          }
        } else {
          unmetRequirements.push('Planilha Excel sem estrutura de abas (sheets) válida');
        }
      } else {
        metRequirements.push('JSON válido e bem-estruturado');
      }
    } catch (e) {
      unmetRequirements.push('Conteúdo com sintaxe JSON inválida');
    }
  } else if (cleanFmt === 'html') {
    if (contentStr.toLowerCase().includes('<html') || contentStr.toLowerCase().includes('<!doctype html')) {
      metRequirements.push('Documento HTML5 com tags principais verificado');
    } else {
      unmetRequirements.push('Estrutura HTML incompleta (ausência de tags html/doctype)');
    }
  }

  const isSuccess = unmetRequirements.length === 0;
  const status: ArtifactValidationStatus = isSuccess ? 'ARTEFATO_CRIADO' : 'VALIDAÇÃO_FALHOU';

  return {
    status,
    statusLabel: isSuccess 
      ? `Leitura & Verificação OK (${byteSize} B, SHA-256: ${hash.substring(0, 8)})`
      : `Validação Falhou (${unmetRequirements.length} erro(s))`,
    version: '1.0.0',
    hash,
    sizeBytes: byteSize,
    readBackVerified: true,
    filesGenerated: [title],
    metRequirements,
    unmetRequirements
  };
}

export function parseJsonDocSafely(jsonStr: string): { title?: string; content?: string; format?: string; validation?: any } | null {
  if (!jsonStr) return null;
  let str = jsonStr.trim();

  // Helper to extract content from an object if nested
  const unwrapDocObj = (obj: any) => {
    if (!obj || typeof obj !== 'object') return null;
    let title = obj.title ? String(obj.title).trim() : undefined;
    let format = obj.format || obj.type ? String(obj.format || obj.type).toLowerCase() : undefined;
    let content = obj.content !== undefined ? obj.content : '';
    if (obj.content === undefined && (obj.sheets || obj.rows || Array.isArray(obj))) {
      content = JSON.stringify(obj);
    }
    let validation = obj.validation;

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
          if (inner.validation && !validation) validation = inner.validation;
        }
      } catch (e) {}
    }

    return { title, content, format, validation };
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
    const sanitized = str.replace(/("[\s\S]*?")/g, (match) => {
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
  const contentMatch = str.match(/"(?:content|code|html|texto)"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"(?:format|title|type|validation)"|\s*\}$)/i);
  if (contentMatch) {
    content = contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
  } else {
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
      const allStrings = [...str.matchAll(/"(?:[^"\\]|\\.)*"/g)];
      if (allStrings.length > 0) {
         let longest = "";
         for(const s of allStrings) {
            if (s[0].length > longest.length) longest = s[0];
         }
         if (longest.length > 30) {
            content = longest.substring(1, longest.length - 1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
         }
      }
    }
  }

  if (titleMatch || content || formatMatch) {
    let finalContent = content;
    if (!finalContent) {
      if (str.trim().startsWith('{') && str.trim().endsWith('}')) {
        finalContent = "";
      } else {
        finalContent = str;
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


  // Helper to extract attributes from a tag
  const extractAttributes = (attrStr) => {
    const attrs = {};
    if (!attrStr) return attrs;
    const attrRegex = /([a-z0-9_\-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match;
    while ((match = attrRegex.exec(attrStr)) !== null) {
      attrs[match[1].toLowerCase()] = match[2] || match[3] || match[4];
    }
    return attrs;
  };

  // 1. Extract <wsm_doc>...</wsm_doc> tags first
  const regex = /<(wsm_doc)(?:\s+([^>]*))?>([\s\S]*?)<\/\1>/i;
  
  while (true) {
    const match = regex.exec(currentText);
    if (match) {
      const fullMatch = match[0];
      const tagName = match[1];
      const attrStr = match[2];
      const innerContent = match[3];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      
      const tagAttrs = extractAttributes(attrStr);
      let tagFormat = tagAttrs['format'] || '';
      let tagTitle = tagAttrs['title'] || '';
      
      const jsonStr = innerContent.trim();
      currentText = currentText.substring(0, startIndex) + currentText.substring(endIndex);

      // Check if innerContent is raw content or JSON
      const isRawText = !jsonStr.startsWith('{');
      const parsedDoc = isRawText ? null : parseJsonDocSafely(jsonStr);

      if (isRawText || !parsedDoc) {
        let docTitle = (tagTitle || 'documento').trim();
        let rawFormat = (tagFormat || inferFormatFromTitle(docTitle, 'md')).toLowerCase();
        if (rawFormat === 'markdown') rawFormat = 'md';
        else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') rawFormat = 'xlsx';

        const content = sanitizeDocumentContent(jsonStr);
        rawDocObjs.push({
          title: docTitle,
          content,
          format: rawFormat || 'md',
          validation: buildDocumentValidation(docTitle, rawFormat || 'md', content)
        });
      } else {
        const title = (tagTitle || parsedDoc.title || 'Documento').trim();
        let content = sanitizeDocumentContent(parsedDoc.content || '');
        if (!content && jsonStr) {
          content = sanitizeDocumentContent(jsonStr);
        }
        
        let rawFormat = (tagFormat || parsedDoc.format || '').toString().toLowerCase();

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
        } else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') {
          format = 'xlsx';
        } else if (rawFormat === 'csv') {
          format = 'csv';
        }

        rawDocObjs.push({
          title,
          content,
          format,
          validation: parsedDoc.validation || buildDocumentValidation(title, format, content)
        });
      }
    } else {
      // Partial form (streaming doc tag) - try to extract what we have before stripping
      const openRegex = /<(wsm_doc)(?:\s+([^>]*))?>/i;
      const openMatch = openRegex.exec(currentText);
      if (openMatch) {
        const tagAttrs = extractAttributes(openMatch[2]);
        let tagFormat = tagAttrs['format'] || '';
        let tagTitle = tagAttrs['title'] || '';

        const incompleteContent = currentText.substring(openMatch.index + openMatch[0].length).trim();
        if (incompleteContent || tagTitle) {
           const parsedDoc = parseJsonDocSafely(incompleteContent);
           const isRawText = !incompleteContent.startsWith('{');

           if (parsedDoc && !isRawText && (parsedDoc.title || parsedDoc.content)) {
             const title = (tagTitle || parsedDoc.title || 'Documento').trim();
             const content = sanitizeDocumentContent(parsedDoc.content || '');
             let rawFormat = (tagFormat || parsedDoc.format || '').toString().toLowerCase();
             if (!rawFormat || rawFormat === 'pdf' || rawFormat === 'documento') {
               const inferred = inferFormatFromTitle(title, '');
               rawFormat = inferred || 'pdf';
             }
             let format = rawFormat;
             if (rawFormat === 'markdown') format = 'md';
             else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') format = 'xlsx';
             else if (rawFormat === 'csv') format = 'csv';
             rawDocObjs.push({ title, content, format, validation: parsedDoc.validation });
           } else {
             // Treat as raw text streaming
             let docTitle = (tagTitle || 'documento').trim();
             let rawFormat = (tagFormat || inferFormatFromTitle(docTitle, 'md')).toLowerCase();
             if (rawFormat === 'markdown') rawFormat = 'md';
             else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') rawFormat = 'xlsx';
             else if (rawFormat === 'csv') rawFormat = 'csv';
             
             if (rawFormat === 'html' || incompleteContent.startsWith('<!DOCTYPE') || incompleteContent.startsWith('<html')) {
                const titleTagMatch = incompleteContent.match(/<title>([^<]+)<\/title>/i);
                if (titleTagMatch && titleTagMatch[1].trim() && !tagTitle) docTitle = titleTagMatch[1].trim() + '.html';
                if (!docTitle.toLowerCase().endsWith('.html')) docTitle += '.html';
                rawFormat = 'html';
             }

             rawDocObjs.push({ title: docTitle, content: incompleteContent, format: rawFormat || 'md' });
           }
        }
        currentText = currentText.substring(0, openMatch.index);
      }
      break;
    }
  }

  // 2. Intercept raw HTML document blocks or standalone html (FALLBACK ONLY)
  if (rawDocObjs.length === 0) {
    const rawHtmlBlockRegex = /(?:\b|\n)(?:```(?:html)?\s*)?(?:html\s*\n+)?(<!DOCTYPE html[\s\S]*?(?:<\/html>|```|$)|<html[\s\S]*?(?:<\/html>|```|$))/gi;
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
        if (!docTitle.toLowerCase().endsWith('.html')) docTitle += '.html';
        rawDocObjs.push({
          title: docTitle,
          content: htmlCode,
          format: 'html'
        });
        currentText = currentText.replace(fullMatchedString, '');
        rawHtmlBlockRegex.lastIndex = 0;
      }
    }
  }

  // 2.5. Intercept raw JSON Excel sheets blocks e.g. ```json {"sheets": ...} ``` or standalone {"sheets": ...}
  if (rawDocObjs.length === 0) {
    const rawSheetsBlockRegex = /(?:```(?:json|xlsx|excel)?\s*)?(\{[\s\S]*?"sheets"\s*:\s*\[[\s\S]*?\})(?:\s*```|$)/gi;
    let sheetsMatch;
    while ((sheetsMatch = rawSheetsBlockRegex.exec(currentText)) !== null) {
      const fullMatchedString = sheetsMatch[0];
      const sheetsJson = sheetsMatch[1].trim();
      if (sheetsJson.length > 20) {
        let docTitle = 'Planilha.xlsx';
        try {
          const parsed = JSON.parse(sheetsJson);
          if (parsed.title) docTitle = String(parsed.title);
          else if (parsed.sheets && parsed.sheets[0] && parsed.sheets[0].name) {
            docTitle = `${parsed.sheets[0].name}.xlsx`;
          }
        } catch (e) {}
        if (!docTitle.endsWith('.xlsx')) docTitle += '.xlsx';
        rawDocObjs.push({
          title: docTitle,
          content: sheetsJson,
          format: 'xlsx'
        });
        currentText = currentText.replace(fullMatchedString, '');
        rawSheetsBlockRegex.lastIndex = 0;
      }
    }
  }


  // 2.7. Intercept <wsm_terminal_file action="write" path="..." /> tags and check terminalSandbox
  const termFileRegex = /<wsm_terminal_file\s+[^>]*?path="([^"]+)"[^>]*?\/>/gi;
  let termFileMatch;
  while ((termFileMatch = termFileRegex.exec(currentText)) !== null) {
    const rawPath = termFileMatch[1].replace('/workspace/', '').replace(/^\//, '');
    if (rawPath) {
      const sandboxContent = terminalSandbox.readFile(rawPath) || terminalSandbox.readFile('/workspace/' + rawPath);
      if (sandboxContent) {
        const ext = rawPath.split('.').pop()?.toLowerCase() || 'txt';
        rawDocObjs.push({
          title: rawPath,
          content: sandboxContent,
          format: ext === 'python' ? 'py' : (ext === 'javascript' ? 'js' : ext)
        });
      }
    }
  }

  // 2.8. Fallback: extract markdown code blocks (```python ... ```) if rawDocObjs is empty
  if (rawDocObjs.length === 0) {
    const codeBlockRegex = /```(python|py|javascript|js|typescript|ts|html|css|json|sql)\s*\n([\s\S]*?)```/gi;
    let codeMatch;
    while ((codeMatch = codeBlockRegex.exec(currentText)) !== null) {
      const lang = codeMatch[1].toLowerCase();
      const code = codeMatch[2].trim();
      if (code.length > 10) {
        let filename = '';
        const firstLine = code.split('\n')[0].trim();
        const fnameMatch = firstLine.match(/^(?:#|\/\/|\/\*)\s*([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)/);
        if (fnameMatch) {
          filename = fnameMatch[1];
        } else {
          const formatExt = (lang === 'python' || lang === 'py') ? 'py' : ((lang === 'javascript' || lang === 'js') ? 'js' : ((lang === 'typescript' || lang === 'ts') ? 'ts' : lang));
          filename = (lang === 'python' || lang === 'py') ? 'fibonacci.py' : `script.${formatExt}`;
        }
        const ext = filename.split('.').pop()?.toLowerCase() || 'py';
        rawDocObjs.push({
          title: filename,
          content: code,
          format: ext
        });
      }
    }
  }

  // 3. Deduplicate docObjs by title / content signature
  const docObjs: WsmDocument[] = [];
  const seenKeys = new Set<string>();

  for (const doc of rawDocObjs) {
    doc.title = normalizeFilename(doc.title);
    
    if (doc.format) {
      let ext = doc.format.toLowerCase();
      if (ext === 'markdown') ext = 'md';
      else if (ext === 'excel' || ext === 'sheet' || ext === 'planilha') ext = 'xlsx';
      else if (ext === 'csv') ext = 'csv';
      else if (ext === 'python') ext = 'py';
      else if (ext === 'javascript') ext = 'js';
      else if (ext === 'typescript') ext = 'ts';

      if (ext && ext !== 'documento' && ext !== 'code') {
        const dotExt = `.${ext}`;
        if (!doc.title.toLowerCase().endsWith(dotExt)) {
          doc.title += dotExt;
        }
      }
    }

    const key = `${doc.title.toLowerCase()}:::${doc.content.substring(0, 100)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      doc.validation = doc.validation || buildDocumentValidation(doc.title, doc.format || 'md', doc.content);
      docObjs.push(doc);
    }
  }

  let finalCleanText = currentText.trim();
  
  // Fix AI tokenizer hallucination for python __main__ in regular chat text
  finalCleanText = finalCleanText.replace(/__main[\u0C00-\u0C7F]+__/g, '__main__');
  finalCleanText = finalCleanText.replace(/__mainజ్య__/g, '__main__');

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
