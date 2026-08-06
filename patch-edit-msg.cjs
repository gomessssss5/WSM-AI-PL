const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const handleEditMessage = async \(msgId: string, newText: string\) => \{([\s\S]*?)await handleSendMessage\(newText, false, overrideMessages\);\s*\};/m,
  `const handleEditMessage = async (msgId: string, newText: string) => {$1
    const userMessage = currentSession.messages[idx];
    await handleSendMessage(newText, isSearchActiveRef.current, overrideMessages, userMessage.attachments, false, userMessage.isComputerEnabled || false);
  };`
);
fs.writeFileSync('src/App.tsx', code);
