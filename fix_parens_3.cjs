const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

code = code.replace(
  "cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags(rawText)))).trim();",
  "cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags(rawText))))).trim();"
);

fs.writeFileSync('src/components/ChatWindow.tsx', code);
