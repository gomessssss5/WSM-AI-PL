const fs = require("fs");
const lines = fs.readFileSync("src/components/MarkdownRenderer.tsx", "utf8").split("\n");

// We need to inject the logic to skip duplicate agentic types
// We will look for line 786 "currentText = currentText.replace(agenticRegex, (match, tagContent) => {"
let foundIdx = -1;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes("currentText = currentText.replace(agenticRegex, (match, tagContent) => {")) {
    foundIdx = i;
    break;
  }
}

if(foundIdx !== -1) {
  lines.splice(foundIdx, 0, "    const seenAgenticTypes = new Set<string>();");
  
  // Now look for "agenticTokens.push({ id, type, text: tagContent });" and replace
  for(let i=foundIdx; i<lines.length; i++) {
    if(lines[i].includes("agenticTokens.push({ id, type, text: tagContent });")) {
      lines[i] = `
      if (seenAgenticTypes.has(type)) {
        return ''; // Completely remove duplicate tag from text
      }
      seenAgenticTypes.add(type);
      agenticTokens.push({ id, type, text: tagContent });
      `;
      break;
    }
  }
  fs.writeFileSync("src/components/MarkdownRenderer.tsx", lines.join("\n"));
  console.log("Replaced!");
} else {
  console.log("Not found!");
}
