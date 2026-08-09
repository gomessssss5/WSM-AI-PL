const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

code = code.replace(
  "cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags(extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.text)).cleanText).cleanText)))}",
  "cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags(extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.text)).cleanText).cleanText))))}"
);

fs.writeFileSync('src/components/ChatWindow.tsx', code);
