const fs = require("fs");
const lines = fs.readFileSync("src/components/MarkdownRenderer.tsx", "utf8").split("\n");

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes("if (seenAgenticTypes.has(type)) {")) {
    lines[i] = "      if (seenAgenticTypes.has(tagContent.toLowerCase())) {";
  }
  if (lines[i].includes("seenAgenticTypes.add(type);")) {
    lines[i] = "      seenAgenticTypes.add(tagContent.toLowerCase());";
  }
}
fs.writeFileSync("src/components/MarkdownRenderer.tsx", lines.join("\n"));
console.log("Fixed deduplication!");
