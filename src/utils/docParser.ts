import { WsmDocument } from '../types';
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

  // 4. Fix AI tokenizer hallucination where __main__ becomes __mainజ్య__
  str = str.replace(/__mainజ్య__/g, '__main__');
  // General fix for any trailing weird characters after __main
  str = str.replace(/__main[\u0C00-\u0C7F]+__/g, '__main__'); // Telugu block

  return str;
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
      if (!jsonStr.startsWith('{') && (jsonStr.startsWith('<!DOCTYPE') || jsonStr.startsWith('<html') || (jsonStr.includes('<head>') && jsonStr.includes('</body>')))) {
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
          } else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') {
            format = 'xlsx';
          } else if (rawFormat === 'csv') {
            format = 'csv';
          }

          let validationState = parsedDoc.validation;
          if (!validationState) {
            validationState = {
              status: 'ARTEFATO_CRIADO',
              statusLabel: 'Arquivo criado; validação pendente',
              version: '1.0.0',
              hash: Math.random().toString(36).substring(2, 10),
              filesGenerated: [title],
              commandsReproduced: ['pytest --version', 'flake8 ' + title],
              metRequirements: ['Gerar estrutura de arquivo e cabeçalhos'],
              unmetRequirements: []
            };
          } else {
            // Check if there are unmet requirements
            if (validationState.unmetRequirements && validationState.unmetRequirements.length > 0) {
              validationState.status = 'VALIDAÇÃO_FALHOU';
              validationState.statusLabel = 'Validação Falhou (Requisitos pendentes)';
            } else if (!validationState.status || validationState.status === 'pending' || validationState.status === 'running') {
              validationState.status = 'ARTEFATO_CRIADO';
              validationState.statusLabel = 'Arquivo criado; validação pendente';
            }
          }

          rawDocObjs.push({
            title,
            content,
            format,
            validation: validationState
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
             else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') format = 'xlsx';
             else if (rawFormat === 'csv') format = 'csv';

             rawDocObjs.push({ title, content, format, validation: parsedDoc.validation });
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

  // 2.5. Intercept raw JSON Excel sheets blocks e.g. ```json {"sheets": ...} ``` or standalone {"sheets": ...}
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
