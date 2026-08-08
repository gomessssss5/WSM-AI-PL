const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

const oldCode = `    // Prevent paragraph breaking across pages (orphan/widow strict control)
    const neededHeightForParagraph = wrapped.length * lineHeight;
    checkPageBreak(neededHeightForParagraph);

    for (let lIdx = 0; lIdx < wrapped.length; lIdx++) {
      const wLine = wrapped[lIdx];
      page.drawText(wLine, {`;

const newCode = `    // Prevent paragraph breaking across pages (orphan/widow strict control)
    const neededHeightForParagraph = wrapped.length * lineHeight;
    // If the paragraph fits on a single page, try to keep it together.
    // If it's too long to fit on a single page, we MUST break it line-by-line.
    const maxPageHeight = height - marginTop - marginBottom;
    
    if (neededHeightForParagraph <= maxPageHeight) {
      checkPageBreak(neededHeightForParagraph);
    } else {
      // It's a huge paragraph. Make sure we have at least 3 lines of space before starting,
      // to avoid orphans (a single line at the bottom of a page).
      checkPageBreak(lineHeight * 3);
    }

    for (let lIdx = 0; lIdx < wrapped.length; lIdx++) {
      // Ensure we don't draw off the page. checkPageBreak handles adding new pages.
      checkPageBreak(lineHeight);
      
      const wLine = wrapped[lIdx];
      page.drawText(wLine, {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/utils/pdfGenerator.ts', code);
