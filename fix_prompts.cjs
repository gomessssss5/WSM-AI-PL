const fs = require('fs');
let content = fs.readFileSync('api/promptsConfig.json', 'utf-8');

// I'll update the system prompt to explicitly FORBID searching when asked for code/html
content = content.replace(
  '- PROIBIDO: NUNCA pesquise na web sobre "tendências de design", frameworks ou tutoriais quando o usuário pedir para gerar um site ou código HTML. Gere o código diretamente baseado no seu conhecimento.',
  '- PROIBIDO (CRÍTICO): NUNCA pesquise na web quando o usuário pedir para gerar um site, código HTML, CSS, JS ou qualquer outra linguagem de programação. Apenas gere o código diretamente, imediatamente, sem usar a ferramenta web_search. NUNCA procure tendências ou templates na web. APENAS gere o código.'
);

fs.writeFileSync('api/promptsConfig.json', content, 'utf-8');

// Also update api/index.ts to ensure no auto_debug_html logic is lingering or to prevent it from web searching for code
let idx = fs.readFileSync('api/index.ts', 'utf-8');
idx = idx.replace(
  /REGRA DA WEB SEARCH \(HISTÓRIA E FATOS REAIS\):[^"]*"/,
  'REGRA DA WEB SEARCH: Use web_search APENAS para fatos históricos, notícias e informações do mundo real. É ESTRITAMENTE PROIBIDO usar web_search para pesquisar sobre programação, HTML, CSS, JS, tutoriais, tendências de design ou como criar um site. Se o usuário pedir um site, GERE O CÓDIGO IMEDIATAMENTE sem pesquisar na web!"'
);

fs.writeFileSync('api/index.ts', idx, 'utf-8');
