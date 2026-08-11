const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'api', 'promptsConfig.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const docRuleOld = `
REGRAS CRÍTICAS PARA O FORMATO "xlsx" (EXCEL):
- Para planilhas e tabelas Excel, o campo "content" DEVE SER OBRIGATORIAMENTE uma string JSON VÁLIDA contendo um objeto com a chave "sheets" e uma lista de abas com nomes, cabeçalhos e linhas. NUNCA coloque frases explicativas ou texto conversacional no "content" de arquivos xlsx!
- É ESTRITAMENTE PROIBIDO GERAR PLANILHAS VAZIAS OU APENAS COM CABEÇALHOS! Sempre inclua DADOS REAIS e COMPLETOS (no mínimo de 3 a 5 linhas de dados de exemplo) na propriedade "rows".
- Exemplo de "content" para xlsx:
  "{\\"sheets\\": [{\\"name\\": \\"Inventario\\", \\"headers\\": [\\"Nome\\", \\"Categoria\\", \\"Preco (R$)\\", \\"Estoque\\"], \\"rows\\": [[\\"Smartphone X\\", \\"Celulares\\", 2499.99, 45], [\\"Notebook Y\\", \\"Informática\\", 4500.00, 12], [\\"Monitor Z\\", \\"Informática\\", 900.00, 30]]}]}"
- Mantenha o JSON do "content" perfeitamente formatado, sem caracteres de controle não escapados ou vírgulas sobrando.
`.trim();

const docRuleNew = `
REGRAS CRÍTICAS PARA O FORMATO "xlsx" (EXCEL):
- Para planilhas e tabelas Excel, o campo "content" DEVE SER OBRIGATORIAMENTE uma string JSON VÁLIDA contendo um objeto com a chave "sheets" e uma lista de abas com nomes, cabeçalhos e linhas. NUNCA coloque frases explicativas ou texto conversacional no "content" de arquivos xlsx!
- É ESTRITAMENTE PROIBIDO GERAR PLANILHAS VAZIAS OU APENAS COM CABEÇALHOS! Sempre inclua DADOS REAIS e COMPLETOS (no mínimo de 3 a 5 linhas de dados de exemplo) na propriedade "rows".
- Exemplo de "content" para xlsx:
  "{\\"sheets\\": [{\\"name\\": \\"Inventario\\", \\"headers\\": [\\"Nome\\", \\"Categoria\\", \\"Preco (R$)\\", \\"Estoque\\"], \\"rows\\": [[\\"Smartphone X\\", \\"Celulares\\", 2499.99, 45], [\\"Notebook Y\\", \\"Informática\\", 4500.00, 12], [\\"Monitor Z\\", \\"Informática\\", 900.00, 30]]}]}"
- Mantenha o JSON do "content" perfeitamente formatado, sem caracteres de controle não escapados ou vírgulas sobrando.
- IMPORTANTE: O sistema gera APENAS DADOS para Excel, ele NÃO SUPORTA a inclusão de gráficos nativos (BarChart, LineChart, etc.) dentro do arquivo .xlsx. NUNCA mencione que incluiu um gráfico no Excel.
`.trim();

data.forEach(p => {
  if (p.id === 'doc_generator') {
    if (p.content.includes(docRuleOld)) {
      p.content = p.content.replace(docRuleOld, docRuleNew);
    } else if (p.content.includes('REGRAS CRÍTICAS PARA O FORMATO "xlsx" (EXCEL):')) {
      const pIdx = p.content.indexOf('REGRAS CRÍTICAS PARA O FORMATO "xlsx" (EXCEL):');
      const nextIdx = p.content.indexOf('REGRAS CRÍTICAS PARA O FORMATO "html"');
      if (nextIdx > pIdx) {
        p.content = p.content.substring(0, pIdx) + docRuleNew + '\n\n' + p.content.substring(nextIdx);
      }
    }
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Done updating doc_generator');
