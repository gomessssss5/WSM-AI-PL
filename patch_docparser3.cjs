const fs = require('fs');
let code = fs.readFileSync('src/utils/docParser.ts', 'utf8');

const oldCode = `  const contentStartIdx = str.search(/"content"\\s*:\\s*["'\`]/i);
  if (contentStartIdx !== -1) {
    const colonIdx = str.indexOf(':', contentStartIdx);
    const match = str.substring(colonIdx).match(/["'\`]/);
    if (match) {
      const quoteChar = match[0];
      const quoteStart = colonIdx + match.index;
      let rest = str.substring(quoteStart + 1);
      
      // Heuristic: remove known trailing JSON parts from the end
      // 1. replace trailing ', "format": "html" }'
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"format\\\"[\\\\s\\\\S]*$", "i"), '');
      // 2. replace trailing ', "title": "index.html" }'
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"title\\\"[\\\\s\\\\S]*$", "i"), '');
      // 3. replace trailing '}'
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*\\\\}[\\\\s\\\\S]*$", "i"), '');
      // 4. replace trailing quote if it still exists
      rest = rest.replace(/["'\`]$/, '');

      content = rest;
    }
  }

  if (titleMatch || content || formatMatch) {
    return {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      content: content || str,
      format: formatMatch ? formatMatch[1].toLowerCase() : undefined
    };
  }`;

const newCode = `  let contentStartIdx = str.search(/"(content|code|html|texto)"\\s*:\\s*["'\`]/i);
  if (contentStartIdx !== -1) {
    const colonIdx = str.indexOf(':', contentStartIdx);
    const match = str.substring(colonIdx).match(/["'\`]/);
    if (match) {
      const quoteChar = match[0];
      const quoteStart = colonIdx + match.index;
      let rest = str.substring(quoteStart + 1);
      
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"format\\\"[\\\\s\\\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"title\\\"[\\\\s\\\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*,\\\\s*\\\"type\\\"[\\\\s\\\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\\\s*\\\\}[\\\\s\\\\S]*$", "i"), '');
      rest = rest.replace(/["'\`]$/, '');

      content = rest;
    }
  } else {
    // If we really can't find a content field, but it's clearly a JSON wrapper,
    // let's try to extract whatever is the longest string value.
    const allStrings = [...str.matchAll(/"(?:[^"\\\\]|\\\\.)*"/g)];
    if (allStrings.length > 0) {
       let longest = "";
       for(const s of allStrings) {
          if (s[0].length > longest.length) longest = s[0];
       }
       // If the longest string is at least 30 chars, assume it's the content
       if (longest.length > 30) {
          content = longest.substring(1, longest.length - 1).replace(/\\\\n/g, '\\n').replace(/\\\\"/g, '"').replace(/\\\\t/g, '\\t');
       }
    }
  }

  if (titleMatch || content || formatMatch) {
    let finalContent = content;
    // Don't fall back to returning the raw JSON wrapper if we extracted a title/format but no content
    if (!finalContent) {
      if (str.trim().startsWith('{') && str.trim().endsWith('}')) {
        finalContent = ""; // It's just a broken JSON with no content
      } else {
        finalContent = str; // Maybe the whole string IS the content
      }
    }
    
    return {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      content: finalContent,
      format: formatMatch ? formatMatch[1].toLowerCase() : undefined
    };
  }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/utils/docParser.ts', code);
