const fs = require('fs');
let code = fs.readFileSync('src/utils/excelGenerator.ts', 'utf8');

code = code.replace(
  /const sheetName = \(title \|\| 'Planilha'\)\.replace\(\/\[\*\?:\/\\\\\\[\\]\]\/g, ''\)\.substring\(0, 31\) \|\| 'Planilha1';/,
  `const sheetName = (title || 'Planilha').replace(/\\.[^/.]+$/, '').replace(/[*?:/\\\\\\[\\]]/g, '').substring(0, 31) || 'Planilha1';`
);

fs.writeFileSync('src/utils/excelGenerator.ts', code);
