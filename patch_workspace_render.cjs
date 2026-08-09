const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

const anchor = '{/* 3. Main AI Text response - only after reasoning sequence completes */}';

const replacement = `{/* 2.5 Workspace Tasks */}
                                  <WorkspaceTasksBlock text={message.text} />
                                  
                                  {/* 3. Main AI Text response - only after reasoning sequence completes */}`;

code = code.replace(anchor, replacement);

fs.writeFileSync('src/components/ChatWindow.tsx', code);
