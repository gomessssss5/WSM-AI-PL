const str = `{
  "title": "index.html",
  "format": "html",
  "content": "<!DOCTYPE html>\n<html>\n</html>"
}`;

  let content = '';
  const contentStartIdx = str.search(/"content"\s*:\s*["'`]/i);
  if (contentStartIdx !== -1) {
    const colonIdx = str.indexOf(':', contentStartIdx);
    const match = str.substring(colonIdx).match(/["'`]/);
    if (match) {
      const quoteChar = match[0];
      const quoteStart = colonIdx + match.index;
      let rest = str.substring(quoteStart + 1);
      
      console.log("REST before:", JSON.stringify(rest));
      rest = rest.replace(new RegExp(quoteChar + "\\s*,\\s*\\\"format\\\"[\\s\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\s*,\\s*\\\"title\\\"[\\s\\S]*$", "i"), '');
      rest = rest.replace(new RegExp(quoteChar + "\\s*\\}[\\s\\S]*$", "i"), '');
      rest = rest.replace(/["'`]$/, '');

      console.log("REST after:", JSON.stringify(rest));
      content = rest;
    }
  }
