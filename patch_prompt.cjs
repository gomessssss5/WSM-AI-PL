const fs = require('fs');
const config = JSON.parse(fs.readFileSync('api/promptsConfig.json', 'utf8'));
const docGen = config.find(p => p.id === 'doc_generator');
if (docGen) {
  docGen.content = `
# REGRAS PARA CRIAÇÃO DE DOCUMENTOS GERAIS E PDFs
Se o usuário pedir para "criar um documento", "gerar um PDF", "salvar um arquivo de texto" ou "escrever um artigo em PDF":
Você DEVE utilizar a tag <wsm_doc> para criar o arquivo real. É PROIBIDO apenas gerar o texto no chat.
Exemplo para PDF:
<wsm_doc title="Artigo.pdf" format="pdf">
Escreva todo o conteúdo formatado em Markdown aqui.
O sistema converterá automaticamente este conteúdo para PDF para o usuário baixar.
</wsm_doc>

Exemplo para Markdown:
<wsm_doc title="Anotacoes.md" format="md">
Conteúdo do arquivo aqui...
</wsm_doc>

` + docGen.content;
  fs.writeFileSync('api/promptsConfig.json', JSON.stringify(config, null, 2));
  console.log("Patched doc_generator");
}
