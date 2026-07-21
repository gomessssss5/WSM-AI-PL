const fs = require('fs');
const content = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf-8');
const regexMatch = content.match(/const agenticRegex = (\/.*\/gi);/);
const agenticRegex = eval(regexMatch[1]);
const text = `[corrigindo erro detectado no código: Uso de imagens via 'source.unsplash.com', que está descontinuado e não retorna mais imagens válidas, causando falhas de carregamento em todo o cardápio.]`;
console.log(text.match(agenticRegex));
