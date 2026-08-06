const fs = require("fs");
let content = fs.readFileSync("src/utils/excelGenerator.ts", "utf8");
content = content.replace("  const sheetName = (title || 'Planilha').replace(/[*?:/\\[\\]]/g, '').substring(0, 31) || 'Planilha1';", "  const sheetName = (title || 'Planilha').replace(/\\.xlsx$/i, '').replace(/[*?:/\\\\[\\\\]]/g, '').substring(0, 31) || 'Planilha1';");
fs.writeFileSync("src/utils/excelGenerator.ts", content);
