const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `          const modelPartsForContents = [
            ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
            ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
          ];`;

const newCode = `          const hasNativeCalls = modelContent && modelContent.parts && modelContent.parts.some((p: any) => p.functionCall);
          const modelPartsForContents = (hasNativeCalls && modelContent?.parts)
            ? modelContent.parts
            : [
                ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
                // We map functionCallsForThisTurn. Note: If these were auto-injected, Gemini 3.0 might reject them without a thought_signature.
                // But let's restore the original state first.
                ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
              ];`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', code);
