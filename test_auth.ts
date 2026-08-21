import fs from 'fs';
const content = fs.readFileSync('api/index.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('app.use(')) {
    console.log("Found app.use around line " + (i+1));
    console.log(lines.slice(Math.max(0, i-2), Math.min(lines.length, i+5)).join('\n'));
  }
});
