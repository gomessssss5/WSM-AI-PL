const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `                textForThisTurn += part.text;
                fullOutput += part.text;
                // Real-time token streaming to frontend
                sendEvent({ type: "chunk", text: part.text });`;

const newCode = `                textForThisTurn += part.text;
                fullOutput += part.text;
                // Send text in simulated stream chunks for smooth UI typewriter feel
                const words = part.text.split(/(\\s+)/);
                let chunkGroup = "";
                for (let i = 0; i < words.length; i++) {
                  chunkGroup += words[i];
                  if (i % 6 === 0 || i === words.length - 1) {
                    sendEvent({ type: "chunk", text: chunkGroup });
                    chunkGroup = "";
                    await new Promise(r => setTimeout(r, 15));
                  }
                }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', code);
