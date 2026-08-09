const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

code = code.replace(/cleanWorkspaceTags\(cleanWorkspaceTags\(cleanWorkspaceTags\(/g, "cleanWorkspaceTags(");
code = code.replace(/cleanWorkspaceTags\(cleanWorkspaceTags\(/g, "cleanWorkspaceTags(");

fs.writeFileSync('src/components/ChatWindow.tsx', code);
