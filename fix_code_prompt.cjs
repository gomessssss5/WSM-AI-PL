const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf-8');

// Update code generation rules
content = content.replace(
  /O código DEVE ser gerado num bloco Markdown de código padrão \(ex: ```html \.\.\. ```\), para que o renderizador de código da interface possa mostrá-lo corretamente\. NUNCA gere código dentro de tags `<wsm_doc>`!!/,
  'CRÍTICO: O código DEVE ser gerado usando a ferramenta `create_document` no Workspace (com format: "html" ou similar). NUNCA gere blocos de código gigantes soltos no chat e NUNCA escreva a tag `<wsm_doc>` manualmente. Use SEMPRE a ferramenta `create_document` para salvar o código HTML, JS, Python, etc.'
);

fs.writeFileSync('api/index.ts', content, 'utf-8');
