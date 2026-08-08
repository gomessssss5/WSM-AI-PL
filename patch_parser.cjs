const fs = require('fs');
let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

// Replace the fallback regex block in parseJsonDocSafely
code = code.replace(
  /const contentStartIdx = str\.search\(\/"content"\\s\*:\\s\*\"\/i\);[\s\S]*?if \(titleMatch \|\| content \|\| formatMatch\) {/m,
  `const contentStartIdx = str.search(/"content"\\s*:\\s*["'\`]/i);
  if (contentStartIdx !== -1) {
    const colonIdx = str.indexOf(':', contentStartIdx);
    // Find the first quote, single quote, or backtick after the colon
    const match = str.substring(colonIdx).match(/["'\`]/);
    if (match) {
      const quoteChar = match[0];
      const quoteStart = colonIdx + match.index;
      let rest = str.substring(quoteStart + 1);
      
      // Look for the last matching quote character followed by , or }
      const endRegex = new RegExp(quoteChar + '\\s*(,|})[\\\\s\\\\S]*$', 'i');
      const possibleEndMatch = rest.match(endRegex);
      
      if (possibleEndMatch) {
         // Instead of removing from the first match, we just want to remove the trailing JSON parts.
         // A simpler approach for HTML/Markdown: just find the last closing bracket } and work backwards, or remove common endings.
      }
      
      // Better: just remove trailing JSON closure heuristically from the END of the string
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"format\\\"[\\\\s\\\\S]*$", "i"), '')
                 .replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"title\\\"[\\\\s\\\\S]*$", "i"), '')
                 .replace(new RegExp(quoteChar + "\\\\s*\\\\}\\\\s*[\\\\s\\\\S]*$", "i"), '');
                 
      // If it still ends with quotes/backticks somehow
      rest = rest.replace(/["'\`]$/, '');
                 
      content = rest;
    }
  }

  if (titleMatch || content || formatMatch) {`
);

fs.writeFileSync('src/utils/docParser.ts', code);
