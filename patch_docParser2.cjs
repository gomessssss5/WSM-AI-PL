const fs = require('fs');

let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

const replacement = `
  // 2. Intercept raw HTML document blocks or standalone html (FALLBACK ONLY)
  if (rawDocObjs.length === 0) {
    const rawHtmlBlockRegex = /(?:\\b|\\n)(?:\`\`\`(?:html)?\\s*)?(?:html\\s*\\n+)?(<!DOCTYPE html[\\s\\S]*?(?:<\\/html>|\`\`\`|$)|<html[\\s\\S]*?(?:<\\/html>|\`\`\`|$))/gi;
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

  // 2.5. Intercept raw JSON Excel sheets blocks e.g. \`\`\`json {"sheets": ...} \`\`\` or standalone {"sheets": ...}
  if (rawDocObjs.length === 0) {
    const rawSheetsBlockRegex = /(?:\`\`\`(?:json|xlsx|excel)?\\s*)?(\\{[\\s\\S]*?"sheets"\\s*:\\s*\\[[\\s\\S]*?\\})(?:\\s*\`\`\`|$)/gi;
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
            docTitle = \`\${parsed.sheets[0].name}.xlsx\`;
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
`;

code = code.replace(/  \/\/ 2\. Intercept raw HTML document blocks[\s\S]*?rawSheetsBlockRegex\.lastIndex = 0;\n    }\n  }/g, replacement);

fs.writeFileSync('src/utils/docParser.ts', code);
