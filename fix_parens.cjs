const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

code = code.replace(
  'copyToClipboard(cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags(message.text)))), message.id)',
  'copyToClipboard(cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags(message.text))))), message.id)'
);

fs.writeFileSync('src/components/ChatWindow.tsx', code);
