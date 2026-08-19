const fs = require('fs');
const configPath = './api/promptsConfig.json';
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const docGen = data.find(p => p.id === 'doc_generator');
if (docGen) {
  docGen.content += "\n\nREGRA CRÍTICA SOBRE QUANDO CRIAR ARQUIVOS (PREVENÇÃO DE CRIAÇÃO NÃO SOLICITADA E RECUSA INJUSTIFICADA):\n" +
  "- SE O USUÁRIO PEDIR para criar, gerar, baixar ou salvar um arquivo, VOCÊ É OBRIGADO a usar a tag <wsm_doc> para entregar o arquivo real físico. É ESTIRITAMENTE PROIBIDO dizer 'Como não é possível gerar um arquivo físico no chat...'. ISSO É UMA ALUCINAÇÃO. Você PODE E DEVE gerar o arquivo físico usando a tag <wsm_doc>.\n" +
  "- SE O USUÁRIO NÃO PEDIR EXPLICITAMENTE para criar, gerar ou salvar um arquivo (por exemplo, se ele apenas fizer uma pergunta, pedir para analisar uma imagem ou explicar algo), VOCÊ ESTÁ ESTRITAMENTE PROIBIDO de usar a tag <wsm_doc>. Apenas responda em texto no chat. NUNCA crie arquivos TXT, MD, etc., se o usuário não pediu um arquivo.\n";
}

fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
console.log("Updated promptsConfig.json");
