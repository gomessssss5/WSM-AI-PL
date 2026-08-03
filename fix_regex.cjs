const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf-8');

// Fix aiPromisedBrowser regex
content = content.replace(
  /const aiPromisedBrowser = \/\\b\(vou\|irei\|estou\|vamos\|agora\|próximo\|proximo\|em seguida\|aguarde\|processando\)\\b\/i\.test\(aiStr\) \|\|\n\s*\/\\b\(abrir\|acessar\|navegar\|digitar\|clicar\|rolar\|preencher\|enviar\|criar\|colocar\|fazer\|selecionar\|pressionar\|aguardar\|esperar\|fechar\)\\b\/i\.test\(aiStr\) \|\|\n\s*\/\\b\(preenchendo\|enviando\|clicando\|digitando\|abrindo\|acessando\|rolando\|aguardando\|fechando\)\\b\/i\.test\(aiStr\);/,
  `const aiPromisedBrowser = /\\b(vou|irei|estou|vamos|agora|próximo|proximo)\\s+(abrir|acessar|navegar|digitar|clicar|rolar|preencher|enviar|criar|colocar|fazer|selecionar|pressionar|aguardar|esperar|fechar)\\b/i.test(aiStr) || /\\b(preenchendo|enviando|clicando|digitando|abrindo|acessando|rolando|aguardando|fechando)\\b/i.test(aiStr);`
);

// We also need to fix missingToolCall because `wantsBrowser`, `wantsSearch`, `wantsImage` might be true, and if `aiHasFinalConclusion` is false, it forces a tool call!
// Wait! `wantsBrowser` is true if `promptWantsBrowser` is true (the user asked to open a site).
// If the user asked to open a site, the AI MUST call the tool. So if it doesn't, we force it. That is fine, BUT we shouldn't force it indefinitely. 
// If `aiStr` doesn't contain a final conclusion, it will loop forever!
// Let's modify the missingToolCall logic.
content = content.replace(
  /const missingToolCall = \([\s\S]*?\(!isSimpleGreetingOrMath2 && \(wantsBrowser \|\| wantsSearch \|\| wantsImage\) && !aiHasFinalConclusion\)\n\s*\);/,
  `const missingToolCall = (
            aiHasTaskBlock ||
            aiPromisedBrowser ||
            aiPromisedSearch ||
            aiPromisedImage ||
            (turnCount === 0 && !isSimpleGreetingOrMath2 && (wantsBrowser || wantsSearch || wantsImage) && !aiHasFinalConclusion)
          );`
);

fs.writeFileSync('api/index.ts', content, 'utf-8');
