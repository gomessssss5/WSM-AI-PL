const fs = require('fs');
let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

const targetStr = `  for (const doc of rawDocObjs) {
    doc.title = normalizeFilename(doc.title);
    const key = \`\${doc.title.toLowerCase()}:::\${doc.content.substring(0, 100)}\`;`;

const replaceStr = `  for (const doc of rawDocObjs) {
    doc.title = normalizeFilename(doc.title);
    
    if (doc.format) {
      const ext = \`.\${doc.format.toLowerCase()}\`;
      if (!doc.title.toLowerCase().endsWith(ext)) {
        doc.title += ext;
      }
    }

    const key = \`\${doc.title.toLowerCase()}:::\${doc.content.substring(0, 100)}\`;`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/utils/docParser.ts', code);
console.log('docParser patched');
