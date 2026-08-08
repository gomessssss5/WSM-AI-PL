const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `          const modelPartsForContents = (modelContent?.parts && modelContent.parts.length > 0) 
            ? modelContent.parts 
            : [
                ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
                ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
              ];`;

const newCode = `          const modelPartsForContents = [
            ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
            ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
          ];`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', code);
