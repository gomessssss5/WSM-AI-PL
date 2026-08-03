const fs = require('fs');

const text = "Some text\n```html\n<div></div>\n```";

function extractWsmDoc(text) {
  if (!text) return { cleanText: "", docObj: null, docObjs: [] };

  const openTag = "<wsm_doc>";
  const closeTag = "</wsm_doc>";
  
  let currentText = text;
  const rawDocObjs = [];

  while (true) {
    const startIndex = currentText.indexOf(openTag);
    if (startIndex === -1) break;

    const endIndex = currentText.indexOf(closeTag, startIndex);
    if (endIndex !== -1) {
      // Full doc is present
      const jsonStr = currentText.substring(startIndex + openTag.length, endIndex).trim();
      currentText = currentText.substring(0, startIndex) + currentText.substring(endIndex + closeTag.length);
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed) {
          const rawFormat = (parsed.format || parsed.type || 'pdf').toString().toLowerCase();
          let format = rawFormat;
          if (rawFormat === 'markdown') {
            format = 'md';
          } else if (rawFormat === 'excel' || rawFormat === 'csv' || rawFormat === 'sheet' || rawFormat === 'planilha') {
            format = 'xlsx';
          }
          rawDocObjs.push({
            title: (parsed.title || 'Documento').trim(),
            content: parsed.content || '',
            format
          });
        }
      } catch (e) {
        console.error("Failed to parse wsm_doc JSON", e);
      }
    } else {
      // Partial form (streaming doc tag)
      currentText = currentText.substring(0, startIndex);
      break;
    }
  }

  // Also extract markdown HTML code blocks
  const htmlOpenTags = ["```html\n", "```htm\n", "```html\r\n", "```htm\r\n"];
  const htmlCloseTag = "```";
  
  while (true) {
    let htmlStartIndex = -1;
    let usedOpenTag = "";
    
    for (const tag of htmlOpenTags) {
      const idx = currentText.indexOf(tag);
      if (idx !== -1 && (htmlStartIndex === -1 || idx < htmlStartIndex)) {
        htmlStartIndex = idx;
        usedOpenTag = tag;
      }
    }
    
    if (htmlStartIndex === -1) break;
    
    const htmlEndIndex = currentText.indexOf(htmlCloseTag, htmlStartIndex + usedOpenTag.length);
    if (htmlEndIndex !== -1) {
      // Full HTML block is present
      const htmlContent = currentText.substring(htmlStartIndex + usedOpenTag.length, htmlEndIndex).trim();
      currentText = currentText.substring(0, htmlStartIndex) + currentText.substring(htmlEndIndex + htmlCloseTag.length);
      
      rawDocObjs.push({
        title: 'Código HTML',
        content: htmlContent,
        format: 'html'
      });
    } else {
      // Partial form (streaming HTML block)
      currentText = currentText.substring(0, htmlStartIndex);
      break;
    }
  }

  // Deduplicate docObjs by title (or title + trimmed content signature)
  const docObjs = [];
  const seenKeys = new Set();

  for (const doc of rawDocObjs) {
    const key = `${doc.title.toLowerCase()}:::${doc.content.substring(0, 100)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      docObjs.push(doc);
    }
  }

  return { 
    cleanText: currentText.trim(), 
    docObj: docObjs.length > 0 ? docObjs[0] : null,
    docObjs 
  };
}

console.log(extractWsmDoc(text));
