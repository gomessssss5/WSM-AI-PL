const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode1 = `          const modelPartsForContents = (hasNativeCalls && modelContent?.parts)
            ? modelContent.parts
            : [
                ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
                ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
              ];

          currentContents.push({ role: "model", parts: modelPartsForContents });`;

const newCode1 = `          const modelPartsForContents = [
            ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
            ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
          ];

          currentContents.push({ role: "model", parts: modelPartsForContents });`;

const oldCode2 = `            currentContents.push({ 
              role: "model", 
              parts: (modelContent?.parts && modelContent.parts.length > 0) ? modelContent.parts : [{ text: textForThisTurn || "Processando requisição..." }] 
            });`;

const newCode2 = `            currentContents.push({ 
              role: "model", 
              parts: [{ text: textForThisTurn || "Processando requisição..." }] 
            });`;

const oldCode3 = `            currentContents.push({ 
              role: "model", 
              parts: (modelContent?.parts && modelContent.parts.length > 0) ? modelContent.parts : [{ text: textForThisTurn || "" }] 
            });`;

const newCode3 = `            currentContents.push({ 
              role: "model", 
              parts: [{ text: textForThisTurn || "" }] 
            });`;

code = code.replace(oldCode1, newCode1).replace(oldCode2, newCode2).replace(oldCode3, newCode3);
fs.writeFileSync('api/index.ts', code);
