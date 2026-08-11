const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'api', 'promptsConfig.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const excelRuleOld = `
# REGRA ABSOLUTA E CRÍTICA PARA PLANILHAS EXCEL (.xlsx)
Ao ser solicitado para criar, gerar ou editar uma planilha Excel ou tabela de dados:
1. É ABSOLUTAMENTE PROIBIDO criar, escrever ou mencionar scripts Python (.py), geradores de código ou arquivos intermediários. NUNCA diga que 'criou a planilha' se só tiver gerado um script Python.
2. Você DEVE emitir DIRETAMENTE a tag <wsm_doc format="xlsx"> no corpo da resposta contendo o JSON com as planilhas e dados:
<wsm_doc format="xlsx">{"title":"Planilha_Vendas.xlsx","format":"xlsx","content":"{\\"sheets\\":[{\\"name\\":\\"Vendas\\",\\"headers\\":[\\"Item\\",\\"Quantidade\\",\\"Valor\\"],\\"rows\\":[[\\"Produto A\\",10,150.00],[\\"Produto B\\",5,300.00]]}]}"}</wsm_doc>
`.trim();

const excelRuleNew = `
# REGRA ABSOLUTA E CRÍTICA PARA PLANILHAS EXCEL (.xlsx)
Ao ser solicitado para criar, gerar ou editar uma planilha Excel ou tabela de dados:
1. É ABSOLUTAMENTE PROIBIDO criar, escrever ou mencionar scripts Python (.py), geradores de código ou arquivos intermediários. NUNCA diga que 'criou a planilha' se só tiver gerado um script Python.
2. Você DEVE emitir DIRETAMENTE a tag <wsm_doc format="xlsx"> no corpo da resposta contendo o JSON com as planilhas e dados:
<wsm_doc format="xlsx">{"title":"Planilha_Vendas.xlsx","format":"xlsx","content":"{\\"sheets\\":[{\\"name\\":\\"Vendas\\",\\"headers\\":[\\"Item\\",\\"Quantidade\\",\\"Valor\\"],\\"rows\\":[[\\"Produto A\\",10,150.00],[\\"Produto B\\",5,300.00]]}]}"}</wsm_doc>
3. IMPORTANTE: O sistema NÃO SUPORTA a inclusão de gráficos DENTRO do arquivo Excel gerado. Se o usuário pedir para adicionar um gráfico na planilha, NUNCA afirme ou finja que inseriu um gráfico no .xlsx. Em vez disso, forneça os dados normalmente na tag wsm_doc e avise claramente que "o sistema gera apenas os dados da planilha e não suporta a inclusão de gráficos nativos dentro do arquivo Excel". Se quiser mostrar um gráfico, use a tag <wsm_chart> separadamente no chat.
`.trim();

data.forEach(p => {
  if (p.content.includes(excelRuleOld)) {
    p.content = p.content.replace(excelRuleOld, excelRuleNew);
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Done updating prompt');
