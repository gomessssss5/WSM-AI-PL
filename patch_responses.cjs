const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `          currentContents.push({ role: "user", parts: functionResponseParts });`;

const newCode = `          // Rewrite auto-injected function responses to plain text so Gemini 3.0 doesn't crash expecting a thought_signature in previous turn
          for (let i = 0; i < functionResponseParts.length; i++) {
            const p = functionResponseParts[i];
            if (p.functionResponse) {
               const autoCall = functionCallsForThisTurn.find(fc => fc.name === p.functionResponse.name && fc.isAutoInjected);
               if (autoCall) {
                  functionResponseParts[i] = { text: \`[Sistema: Ferramenta \${autoCall.name} auto-executada] Resultado:\\n\${JSON.stringify(p.functionResponse.response)}\` };
               }
            }
          }

          currentContents.push({ role: "user", parts: functionResponseParts });`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', code);
