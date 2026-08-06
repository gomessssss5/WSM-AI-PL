const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

code = code.replace(
  /\{message.id === messages\[messages.length - 1\]\?.id && !isThinking && \(/g,
  `{message.id === messages[messages.length - 1]?.id && !isThinking && message.text?.includes('\u26A0\uFE0F') && (`
);
fs.writeFileSync('src/components/ChatWindow.tsx', code);
