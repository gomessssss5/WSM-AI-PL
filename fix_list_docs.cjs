const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf-8');

// Remove the duplicate list_documents we just added
content = content.replace(
  /\} else if \(fc\.name === "list_documents"\) \{[\s\S]*?\/\/ We'll just let it list but if it keeps doing it\.\.\. wait, we can just add instruction not to loop\.\n\s*\}/,
  '}'
);

fs.writeFileSync('api/index.ts', content, 'utf-8');

let config = fs.readFileSync('api/promptsConfig.json', 'utf-8');
config = config.replace(
  /O estado final limpo de todos os documentos ativos do Workspace será disponibilizado no final da sua resposta./,
  'O estado final limpo de todos os documentos ativos do Workspace será disponibilizado no final da sua resposta. NUNCA faça um loop infinito chamando `list_documents` repetidamente! Chame UMA VEZ apenas quando precisar e depois siga em frente escrevendo sua resposta de texto ou usando outra ferramenta.'
);
fs.writeFileSync('api/promptsConfig.json', config, 'utf-8');
