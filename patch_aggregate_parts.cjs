const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `        let textForThisTurn = "";
        let functionCallsForThisTurn: any[] = [];
        let modelContent: any = null;

        for await (const chunk of responseStream) {
          const candidate = chunk.candidates?.[0];
          if (candidate?.content) {
            modelContent = candidate.content;
          }
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                textForThisTurn += part.text;
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
                }
              }
              if (part.functionCall) {
                functionCallsForThisTurn.push(part.functionCall);
              }
            }
          }
        }`;

const newCode = `        let textForThisTurn = "";
        let functionCallsForThisTurn: any[] = [];
        let aggregatedParts: any[] = [];

        for await (const chunk of responseStream) {
          const candidate = chunk.candidates?.[0];
          
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              // Aggregate all parts exactly as they came from the model
              aggregatedParts.push(part);
              
              if (part.text) {
                textForThisTurn += part.text;
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
                }
              }
              if (part.functionCall) {
                functionCallsForThisTurn.push(part.functionCall);
              }
            }
          }
        }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', code);
