const fs = require('fs');
const file = 'api/promptsConfig.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.forEach(p => {
  if (p.content.includes('2. MÚLTIPLOS ARQUIVOS (2 OU MAIS):')) {
    p.content = p.content.replace(
      "2. MÚLTIPLOS ARQUIVOS (2 OU MAIS): Se o usuário pedir 2 ou mais entregáveis/arquivos na mesma mensagem (ex: 'Gere um relatório em PDF e uma planilha Excel'), VOCÊ É OBRIGADO A GERAR TODOS OS ARQUIVOS SOLICITADOS em blocos <wsm_doc> separados!",
      "2. MÚLTIPLOS ENTREGÁVEIS (2 OU MAIS ARQUIVOS): Se o usuário solicitar 2 ou mais entregáveis/arquivos na mesma mensagem (ex: 'Gere um Markdown E um HTML'), VOCÊ É OBRIGADO A GERAR TODOS OS ARQUIVOS SOLICITADOS em blocos <wsm_doc> separados! NUNCA gere arquivos soltos no corpo do texto usando crases triplas (```) se o usuário pediu para gerar um arquivo. SEMPRE use a tag <wsm_doc> para CADA arquivo pedido."
    );
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Prompts updated for multiple files');
