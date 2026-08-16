const fs = require('fs');

let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

const partialMatchReplacement = `
    } else {
      // Partial form (streaming doc tag) - try to extract what we have before stripping
      const openRegex = /<(wsm_doc)(?:\\s+([^>]*))?>/i;
      const openMatch = openRegex.exec(currentText);
      if (openMatch) {
        const tagAttrs = extractAttributes(openMatch[2]);
        let tagFormat = tagAttrs['format'] || '';
        let tagTitle = tagAttrs['title'] || '';
        
        const incompleteContent = currentText.substring(openMatch.index + openMatch[0].length).trim();
        if (incompleteContent) {
           const parsedDoc = parseJsonDocSafely(incompleteContent);
           if (parsedDoc && (parsedDoc.title || parsedDoc.content)) {
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
           } else if (tagFormat.toLowerCase() === 'html' || incompleteContent.startsWith('<!DOCTYPE') || incompleteContent.startsWith('<html') || incompleteContent.includes('<head>')) {
              let docTitle = tagTitle || 'index.html';
              const titleTagMatch = incompleteContent.match(/<title>([^<]+)<\\/title>/i);
              if (titleTagMatch && titleTagMatch[1].trim() && !tagTitle) docTitle = titleTagMatch[1].trim() + '.html';
              if (!docTitle.toLowerCase().endsWith('.html')) docTitle += '.html';
              rawDocObjs.push({ title: docTitle, content: incompleteContent, format: 'html' });
           }
        }
        currentText = currentText.substring(0, openMatch.index);
      }
      break;
    }
  }
`;

code = code.replace(/    } else {\n      \/\/ Partial form \(streaming doc tag\) - try to extract what we have before stripping\n      const openRegex = \/<(wsm_doc)(?:\s+\[\^>\]\*)?>\/i;\n      const openMatch = openRegex\.exec\(currentText\);\n      if \(openMatch\) {\n        const incompleteContent = currentText\.substring\(openMatch\.index \+ openMatch\[0\]\.length\)\.trim\(\);\n        if \(incompleteContent\) {\n           const parsedDoc = parseJsonDocSafely\(incompleteContent\);\n           if \(parsedDoc && \(parsedDoc\.title \|\| parsedDoc\.content\)\) {\n             const title = \(parsedDoc\.title \|\| 'Documento'\)\.trim\(\);\n             const content = sanitizeDocumentContent\(parsedDoc\.content \|\| ''\);\n             let rawFormat = \(parsedDoc\.format \|\| ''\)\.toString\(\)\.toLowerCase\(\);\n             if \(\!rawFormat \|\| rawFormat === 'pdf' \|\| rawFormat === 'documento'\) {\n               const inferred = inferFormatFromTitle\(title, ''\);\n               rawFormat = inferred \|\| 'pdf';\n             }\n             let format = rawFormat;\n             if \(rawFormat === 'markdown'\) format = 'md';\n             else if \(rawFormat === 'excel' \|\| rawFormat === 'sheet' \|\| rawFormat === 'planilha'\) format = 'xlsx';\n             else if \(rawFormat === 'csv'\) format = 'csv';\n             rawDocObjs\.push\(\{ title, content, format, validation: parsedDoc\.validation \}\);\n           } else if \(incompleteContent\.startsWith\('<!DOCTYPE'\) \|\| incompleteContent\.startsWith\('<html'\) \|\| incompleteContent\.includes\('<head>'\)\) {\n              let docTitle = 'index\.html';\n              const titleTagMatch = incompleteContent\.match\(\/<title>\(\[\^<\]\+\)<\\\/title>\/i\);\n              if \(titleTagMatch && titleTagMatch\[1\]\.trim\(\)\) docTitle = titleTagMatch\[1\]\.trim\(\) \+ '\.html';\n              rawDocObjs\.push\(\{ title: docTitle, content: incompleteContent, format: 'html' \}\);\n           }\n        }\n        currentText = currentText\.substring\(0, openMatch\.index\);\n      }\n      break;\n    }\n  }/g, partialMatchReplacement);

fs.writeFileSync('src/utils/docParser.ts', code);
