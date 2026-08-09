const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

const oldCode = `const cleanWriterUpdateTags = (text: string) => {
  if (!text) return "";
  return text.replace(/<wsm_writer_update>[\\s\\S]*?<\\/wsm_writer_update>/g, "").trim();
};`;

const newCode = `const cleanWriterUpdateTags = (text: string) => {
  if (!text) return "";
  return text.replace(/<wsm_writer_update>[\\s\\S]*?<\\/wsm_writer_update>/g, "").trim();
};

const cleanWorkspaceTags = (text: string) => {
  if (!text) return "";
  return text.replace(/<wsm_workspace_action[\\s\\S]*?\\/>/g, "").trim();
};`;

code = code.replace(oldCode, newCode);

code = code.replace(
  'cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(',
  'cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags('
);
code = code.replace(
  'cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(',
  'cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags('
);
code = code.replace(
  'cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(',
  'cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags('
);
code = code.replace(
  'cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(',
  'cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags('
);
code = code.replace(
  'cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(',
  'cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags('
);
code = code.replace(
  'cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(',
  'cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(cleanWorkspaceTags('
);


fs.writeFileSync('src/components/ChatWindow.tsx', code);
