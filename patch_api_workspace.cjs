const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

code = code.replace(
  'else if (fc.name === "create_document") thinkingText = `\\n\\n[Criando documento: "${(fc.args as any)?.title || \'Documento\'}"...]\\n\\n`;',
  'else if (fc.name === "create_document") thinkingText = `\\n\\n<wsm_workspace_action status="working" type="create" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  'else if (fc.name === "read_document") thinkingText = `\\n\\n[Lendo documento: "${(fc.args as any)?.title || \'Documento\'}"...]\\n\\n`;',
  'else if (fc.name === "read_document") thinkingText = `\\n\\n<wsm_workspace_action status="working" type="read" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  'else if (fc.name === "edit_document" || fc.name === "append_document") thinkingText = `\\n\\n[Editando documento: "${(fc.args as any)?.title || \'Documento\'}"...]\\n\\n`;',
  'else if (fc.name === "edit_document" || fc.name === "append_document") thinkingText = `\\n\\n<wsm_workspace_action status="working" type="edit" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  'else if (fc.name === "delete_document") thinkingText = `\\n\\n[Excluindo documento: "${(fc.args as any)?.title || \'Documento\'}"...]\\n\\n`;',
  'else if (fc.name === "delete_document") thinkingText = `\\n\\n<wsm_workspace_action status="working" type="delete" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  'else if (fc.name === "list_documents") thinkingText = `\\n\\n[Listando documentos...]\\n\\n`;',
  'else if (fc.name === "list_documents") thinkingText = `\\n\\n<wsm_workspace_action status="working" type="list" file="workspace" />\\n\\n`;'
);


code = code.replace(
  '} else if (fc.name === "create_document") {\n              finalTagText = `\\n\\n[Criou documento: ${(fc.args as any)?.title || \'Documento\'}]\\n\\n`;',
  '} else if (fc.name === "create_document") {\n              finalTagText = `\\n\\n<wsm_workspace_action status="done" type="create" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  '} else if (fc.name === "read_document") {\n              finalTagText = `\\n\\n[Leu documento: ${(fc.args as any)?.title || \'Documento\'}]\\n\\n`;',
  '} else if (fc.name === "read_document") {\n              finalTagText = `\\n\\n<wsm_workspace_action status="done" type="read" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  '} else if (fc.name === "edit_document" || fc.name === "append_document") {\n              finalTagText = `\\n\\n[Editou documento: ${(fc.args as any)?.title || \'Documento\'}]\\n\\n`;',
  '} else if (fc.name === "edit_document" || fc.name === "append_document") {\n              finalTagText = `\\n\\n<wsm_workspace_action status="done" type="edit" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  '} else if (fc.name === "delete_document") {\n              finalTagText = `\\n\\n[Excluiu documento: ${(fc.args as any)?.title || \'Documento\'}]\\n\\n`;',
  '} else if (fc.name === "delete_document") {\n              finalTagText = `\\n\\n<wsm_workspace_action status="done" type="delete" file="${(fc.args as any)?.title || \'Documento\'}" />\\n\\n`;'
);

code = code.replace(
  '} else if (fc.name === "list_documents") {\n              finalTagText = `\\n\\n[Listou documentos do workspace]\\n\\n`;',
  '} else if (fc.name === "list_documents") {\n              finalTagText = `\\n\\n<wsm_workspace_action status="done" type="list" file="workspace" />\\n\\n`;'
);

fs.writeFileSync('api/index.ts', code);
