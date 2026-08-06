const fs = require("fs");
const lines = fs.readFileSync("src/components/ChatWindow.tsx", "utf8").split("\n");
lines[717] = "      const senderName = msg.sender === 'user' ? 'Usuário' : 'WSM 1.6';";
lines[718] = "      const senderEmoji = msg.sender === 'user' ? '👤' : '🤖';";
lines[719] = "      md += `### ${senderEmoji} **${senderName}** (${new Date(msg.timestamp).toLocaleTimeString()})\\n\\n`;";
lines.splice(720, 0, "      if (exportedText) {");
fs.writeFileSync("src/components/ChatWindow.tsx", lines.join("\n"));
