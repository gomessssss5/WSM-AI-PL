const fs = require('fs');
let content = fs.readFileSync('api/promptsConfig.json', 'utf-8');

// Update code generation rules in promptsConfig
content = content.replace(
  /Use blocos Markdown com a linguagem correta, por exemplo: ```html, ```javascript ou ```python\./,
  'Use a ferramenta `create_document` para salvar o código (com format: "html", "js", etc) para que ele abra no Workspace de Documentos.'
);
content = content.replace(
  /SEMPRE coloque arquivos de código completos dentro de tags <wsm_doc>, como HTML, JSON, Python, etc\. NUNCA gere blocos de código Markdown comuns para arquivos inteiros\./,
  'CRÍTICO: NUNCA digite a tag <wsm_doc> manualmente! Você DEVE usar a ferramenta `create_document` sempre que for gerar arquivos de código inteiros, como HTML, JSON, Python, etc.'
);

fs.writeFileSync('api/promptsConfig.json', content, 'utf-8');
