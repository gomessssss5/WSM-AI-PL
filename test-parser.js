const lines = [
  "- Cálculos finais:",
  "  - 400 - 60 = 340"
];

let i = 0;
const listItems = [];
while (
  i < lines.length &&
  (lines[i].trim().startsWith('- ') ||
    lines[i].trim().startsWith('* ') ||
    lines[i].trim().startsWith('• '))
) {
  const indent = lines[i].match(/^\s*/)[0].length;
  listItems.push({ text: lines[i].trim().replace(/^[-*•]\s*/, ''), indent });
  i++;
}

console.log(listItems);
