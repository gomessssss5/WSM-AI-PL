const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

code = code.replace(
  'import { extractWsmTask, extractWsmTasks, cleanWsmTaskTags } from \'../utils/taskParser\';',
  'import { extractWsmTask, extractWsmTasks, cleanWsmTaskTags } from \'../utils/taskParser\';\nimport { cleanWorkspaceTags } from \'../utils/workspaceParser\';'
);

code = code.replace(
  `const cleanWorkspaceTags = (text: string) => {
  if (!text) return "";
  return text.replace(/<wsm_workspace_action[\\s\\S]*?\\/>/g, "").trim();
};`,
  ''
);

fs.writeFileSync('src/components/ChatWindow.tsx', code);
