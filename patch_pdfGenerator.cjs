const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

const oldCode = `    // Widow and orphan control:
    // If the entire paragraph is short (3 lines or fewer), keep it together on the current page if it fits;
    // otherwise move the whole paragraph to the new page.
    // If it's a longer paragraph, ensure at least 2 lines fit on the current page before starting it.
    const neededHeightForParagraph = wrapped.length * lineHeight;
    if (wrapped.length <= 3) {
      checkPageBreak(neededHeightForParagraph);
    } else {
      checkPageBreak(lineHeight * 2);
    }

    for (let lIdx = 0; lIdx < wrapped.length; lIdx++) {
      const wLine = wrapped[lIdx];
      // For middle/end lines of a multi-line paragraph, ensure page break if remaining vertical space is exceeded
      checkPageBreak(lineHeight);`;

const newCode = `    // Prevent paragraph breaking across pages (orphan/widow strict control)
    const neededHeightForParagraph = wrapped.length * lineHeight;
    checkPageBreak(neededHeightForParagraph);

    for (let lIdx = 0; lIdx < wrapped.length; lIdx++) {
      const wLine = wrapped[lIdx];`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/utils/pdfGenerator.ts', code);
