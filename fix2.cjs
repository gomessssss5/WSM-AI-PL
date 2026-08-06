const fs = require("fs");
const lines = fs.readFileSync("src/utils/excelGenerator.ts", "utf8").split("\n");
lines[121] = "  const sheetName = (title || 'Planilha').replace(/\\.xlsx$/i, '').replace(/[*?:/\\\\[\\\\]]/g, '').substring(0, 31) || 'Planilha1';";
fs.writeFileSync("src/utils/excelGenerator.ts", lines.join("\n"));
