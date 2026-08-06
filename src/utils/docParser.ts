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
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed) {
            const title = (parsed.title || 'Documento').trim();
            let content = parsed.content || '';
            
            if (typeof content === 'string') {
              // Unescape double escaped JSON strings (literal \n, \", \t, \\)
              try {
                if (content.trim().startsWith('"') && content.trim().endsWith('"')) {
                  content = JSON.parse(content);
                } else {
                  content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
                }
              } catch (e) {
                content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
              }
            }
            
            let rawFormat = (parsed.format || parsed.type || '').toString().toLowerCase();

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
        } catch (e) {
          console.warn("Failed to parse wsm_doc JSON directly, attempting recovery...", e);
          let recoveredDoc: WsmDocument | null = null;
          
          // Fallback 1: Extract content using string bounds or regex
          const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/i);
          const formatMatch = jsonStr.match(/"format"\s*:\s*"([^"]+)"/i);
          const contentMatch = jsonStr.match(/"content"\s*:\s*"([\s\S]*)"/i);

          let rawContent = "";
          if (contentMatch) {
            rawContent = contentMatch[1];
            // If rawContent ends with JSON closing markup like '", "format"...}' or '", "title"...}' or '"}'
            rawContent = rawContent.replace(/",\s*"format"[\s\S]*$/i, '')
                                  .replace(/",\s*"title"[\s\S]*$/i, '')
                                  .replace(/"\s*}\s*$/i, '');
          } else {
            rawContent = jsonStr;
          }

          if (rawContent.length > 0) {
            const cleanContent = rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
            const docTitle = titleMatch ? titleMatch[1].trim() : 'index.html';
            const docFormat = formatMatch ? formatMatch[1].toLowerCase() : (cleanContent.includes('<!DOCTYPE') || cleanContent.includes('<html') ? 'html' : 'txt');
            
            recoveredDoc = {
              title: docTitle,
              content: cleanContent,
              format: docFormat
            };
          }

          if (recoveredDoc) {
            rawDocObjs.push(recoveredDoc);
          }
        }
      }
    } else {
      // Partial form (streaming doc tag) - strip from openTag onwards
      const openRegex = /<(wsm_doc)(?:\s+[^>]*)?>/i;
      const openMatch = openRegex.exec(currentText);
      if (openMatch) {
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

  // 3. Intercept markdown code blocks and convert them to wsm_doc
  const codeBlockRegex = /```([a-z]+)\n([\s\S]*?)(?:```|$)/gi;
  let match;
  while ((match = codeBlockRegex.exec(currentText)) !== null) {
    const rawFmt = match[1].toLowerCase();
    const supportedCodeFormats = ['html', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css', 'sql', 'md', 'markdown', 'txt'];
    if (supportedCodeFormats.includes(rawFmt)) {
       const fmt = (rawFmt === 'markdown' ? 'md' : rawFmt);
       const titlePrefix = (fmt === 'md' ? 'Documento Markdown' : fmt === 'txt' ? 'Documento de Texto' : 'Código ' + fmt.toUpperCase());
       rawDocObjs.push({
         title: titlePrefix,
         content: match[2].trim(),
         format: fmt
       });
       currentText = currentText.replace(match[0], '');
       codeBlockRegex.lastIndex = 0;
    }
  }

  // 4. Clean leftover orphaned code headers or html tags
  currentText = currentText
    .replace(/(?:^|\n)\s*```(?:html|xml|javascript|json|css|py|js|ts)?\s*(?=\n|$)/gi, '')
    .replace(/(?:^|\n)\s*html\s*(?=\n+<!DOCTYPE|\n+<html|\n+$)/gi, '')
    .replace(/(?:^|\n)\s*```\s*$/g, '');

  // Deduplicate docObjs by title / content signature
  const docObjs: WsmDocument[] = [];
  const seenKeys = new Set<string>();

  for (const doc of rawDocObjs) {
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
