const fs = require('fs');
const file = 'api/index.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      normalResponse = await callGeminiWithFallback({
        model: mappedModel,
        contents: finalContents,
        config: {
          systemInstruction: activeSystemPrompt,
        },
      });`;

const replaceStr = `      try {
        const fetchPromise = callGeminiWithFallback({
          model: mappedModel,
          contents: finalContents,
          config: {
            systemInstruction: activeSystemPrompt,
          },
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("STREAM_TIMEOUT")), 20000));
        normalResponse = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err: any) {
        if (err.message === "STREAM_TIMEOUT" && retryCount < maxRetries) {
          console.warn(\`[ChatAPI] Timeout de 20s atingido na resposta final. Retentando silenciosamente...\`);
          retryCount++;
          continue;
        }
        throw err;
      }`;

if (code.includes(targetStr)) {
  fs.writeFileSync(file, code.replace(targetStr, replaceStr));
  console.log('Patched API normal timeout successfully');
} else {
  console.log('Target string not found');
}
