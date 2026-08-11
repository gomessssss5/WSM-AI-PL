const fs = require('fs');
const file = 'api/index.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `        const responseStream = await callGeminiStreamWithFallback({
          model: mappedModel,
          contents: currentContents,
          tools: marteTools,
          config: {
            systemInstruction: activeSystemPrompt + 
              "\\nREGRA PRINCIPAL E OBRIGATÓRIA DE ROTEAMENTO DE ARQUIVOS E MÚLTIPLOS ENTREGÁVEIS:\\n" +
              "1. RESPEITO ABSOLUTO AO FORMATO SOLICITADO: Quando o usuário pedir um formato específico (PDF, Markdown/MD, Planilha Excel/XLSX, HTML, TXT, Word/DOCX), VOCÊ É OBRIGADO A GERAR EXATAMENTE NO FORMATO SOLICITADO (format: 'md', 'pdf', 'xlsx', 'html', 'txt').\\n" +
              "2. MÚLTIPLOS ENTREGÁVEIS (2 OU MAIS ARQUIVOS): Se o usuário solicitar 2 ou mais entregáveis/arquivos na mesma mensagem (ex: 'Gere um relatório em PDF e uma planilha Excel', 'Crie 2 relatórios em PDF'), VOCÊ É OBRIGADO A GERAR TODOS OS ARQUIVOS SOLICITADOS! Crie um bloco \`<wsm_doc>\` ou chamada \`create_document\` independente para CADA arquivo pedido.\\n" +
              "3. TÍTULOS DESCRITIVOS E ÚNICOS: NUNCA nomeie arquivos como 'Documento', 'Arquivo' ou 'Documento.pdf'. Use títulos descritivos referentes ao assunto (ex: 'Relatorio_Vendas_2026.pdf', 'Planilha_Orcamento.xlsx', 'Resumo_Executivo.md', 'index.html').\\n" +
              "4. TITULO HTML: O título \`<title>\` de um site HTML gerado deve corresponder estritamente ao tema solicitado (ex: 'Cafeteria Aroma', 'Restaurante'). NUNCA use o nome do modelo 'Omnix' no título de sites HTML gerados para o usuário.\\n" +
              "\\nNUNCA gere manualmente as tags em colchetes como \`[pesquisou na web]\`, \`[calculando]\`, \`[verificando relógio]\` na sua resposta final de texto. O nosso sistema de backend já insere e renderiza essas tags de progresso e status automaticamente no chat. Sua tarefa é focar exclusivamente em gerar o conteúdo final explicativo e o código, sem adicionar essas tags de status ao final." +
              "\\nREGRA DA CALCULADORA E CÓDIGO: Chame a ferramenta 'calculadora' SEMPRE que precisar realizar ou validar qualquer conta, expressão matemática, ou resultado de um código exato que envolva cálculos (ex: validando saídas numéricas de um código Python como stdev). Não confie na sua intuição para matemática. NÃO chame a calculadora para ler arquivos." +
              "\\nREGRA DE IMAGENS EM HTML/MD: Para placeholders de imagens em HTML ou Markdown, NUNCA use source.unsplash.com. Você é OBRIGADO a usar https://picsum.photos/ ou https://images.unsplash.com/photo-<ID>?w=800 ou SVGs inline." +
              "\\nREGRA DA WEB SEARCH: Use web_search EXCLUSIVAMENTE para pesquisas de fatos do mundo real, notícias atualizadas ou quando o usuário pedir explicitamente para buscar algo na web. É ESTRITAMENTE PROIBIDO usar web_search para ler textos colados pelo usuário, resumir documentos, responder dúvidas de programação ou gerar códigos." +
              "\\nREGRA DE NAVEGAÇÃO WEB REAL (PLAYWRIGHT): SEMPRE que o usuário pedir para abrir, acessar ou navegar em qualquer site (ex: Brave Search, Google, Wikipedia, etc), VOCÊ DEVE OBRIGATORIAMENTE emitir a chamada de função 'open_url' (functionCall) no MESMO TURNO. É ABSOLUTAMENTE PROIBIDO apenas escrever texto prometendo abrir o site sem enviar a chamada da ferramenta 'open_url'!" +
              "\\nREGRAS OBRIGATÓRIAS DE AGENTE SEQUENCIAL MULTI-ETAPAS (PASSO A PASSO):" +
              "\\n1. Atue como um AGENTE SEQUENCIAL AUTÔNOMO que executa tarefas agênticas em múltiplos turnos encadeados (pesquisar na web, abrir sites, clicar em botões, ler conteúdos, preparar resumos)." +
              "\\n2. Quando for realizar ações agênticas:" +
              "\\n   - Descreva brevemente para o usuário o que você vai fazer em cada etapa (ex: 'Olá! Vou abrir tal site e pesquisar sobre tal coisa para você.', 'Agora vou acessar tal site:', 'Clicando no botão do site:')." +
              "\\n   - Acompanhe cada etapa com a chamada da ferramenta correspondente ou tag de status apropriada (ex: [Pesquisando na web sobre X...], [Acessando site Y...], [Lendo conteúdo...], [Preparando resumo...])." +
              "\\n   - Use tags diversificadas de progresso para que o usuário saiba exatamente o que está acontecendo em cada passo (ex: 'Acessando site...', 'Lendo conteúdo...', 'Preparando resumo...'). NUNCA repita a mesma tag sem contexto." +
              "\\n   - Execute as ferramentas necessárias passo a passo até concluir todas as ações pedidas." +
              "\\n   - Após realizar todas as ações e ferramentas agênticas, apresente a resposta e síntese final completa para o usuário." +
              "\\n3. CRÍTICO: NUNCA escreva apenas texto conversacional prometendo ações sem enviar a chamada da ferramenta (functionCall) quando uma ação for necessária!",
            ...(currentToolConfig ? { toolConfig: currentToolConfig } : {}),
            temperature: 0.7
          }
        });`;

const replaceStr = `        let responseStream: any;
        let retryStreamCount = 0;
        const maxStreamRetries = 2;
        
        while (retryStreamCount <= maxStreamRetries) {
          try {
             const streamPromise = callGeminiStreamWithFallback({
              model: mappedModel,
              contents: currentContents,
              tools: marteTools,
              config: {
                systemInstruction: activeSystemPrompt + 
                  "\\nREGRA PRINCIPAL E OBRIGATÓRIA DE ROTEAMENTO DE ARQUIVOS E MÚLTIPLOS ENTREGÁVEIS:\\n" +
                  "1. RESPEITO ABSOLUTO AO FORMATO SOLICITADO: Quando o usuário pedir um formato específico (PDF, Markdown/MD, Planilha Excel/XLSX, HTML, TXT, Word/DOCX), VOCÊ É OBRIGADO A GERAR EXATAMENTE NO FORMATO SOLICITADO (format: 'md', 'pdf', 'xlsx', 'html', 'txt').\\n" +
                  "2. MÚLTIPLOS ENTREGÁVEIS (2 OU MAIS ARQUIVOS): Se o usuário solicitar 2 ou mais entregáveis/arquivos na mesma mensagem (ex: 'Gere um Markdown E um HTML'), VOCÊ É OBRIGADO A GERAR TODOS OS ARQUIVOS SOLICITADOS em blocos <wsm_doc> separados! NUNCA gere arquivos soltos no corpo do texto usando crases triplas (\`\`\`) se o usuário pediu para gerar um arquivo. SEMPRE use a tag <wsm_doc> para CADA arquivo pedido.\\n" +
                  "3. TÍTULOS DESCRITIVOS E ÚNICOS: NUNCA nomeie arquivos como 'Documento', 'Arquivo' ou 'Documento.pdf'. Use títulos descritivos referentes ao assunto (ex: 'Relatorio_Vendas_2026.pdf', 'Planilha_Orcamento.xlsx', 'Resumo_Executivo.md', 'index.html').\\n" +
                  "4. TITULO HTML: O título \`<title>\` de um site HTML gerado deve corresponder estritamente ao tema solicitado (ex: 'Cafeteria Aroma', 'Restaurante'). NUNCA use o nome do modelo 'Omnix' no título de sites HTML gerados para o usuário.\\n" +
                  "\\nNUNCA gere manualmente as tags em colchetes como \`[pesquisou na web]\`, \`[calculando]\`, \`[verificando relógio]\` na sua resposta final de texto. O nosso sistema de backend já insere e renderiza essas tags de progresso e status automaticamente no chat. Sua tarefa é focar exclusivamente em gerar o conteúdo final explicativo e o código, sem adicionar essas tags de status ao final." +
                  "\\nREGRA DA CALCULADORA E CÓDIGO: Chame a ferramenta 'calculadora' SEMPRE que precisar realizar ou validar qualquer conta, expressão matemática, ou resultado de um código exato que envolva cálculos (ex: validando saídas numéricas de um código Python como stdev). Não confie na sua intuição para matemática. NÃO chame a calculadora para ler arquivos." +
                  "\\nREGRA DE IMAGENS EM HTML/MD: Para placeholders de imagens em HTML ou Markdown, NUNCA use source.unsplash.com. Você é OBRIGADO a usar https://picsum.photos/ ou https://images.unsplash.com/photo-<ID>?w=800 ou SVGs inline." +
                  "\\nREGRA DA WEB SEARCH: Use web_search EXCLUSIVAMENTE para pesquisas de fatos do mundo real, notícias atualizadas ou quando o usuário pedir explicitamente para buscar algo na web. É ESTRITAMENTE PROIBIDO usar web_search para ler textos colados pelo usuário, resumir documentos, responder dúvidas de programação ou gerar códigos." +
                  "\\nREGRA DE NAVEGAÇÃO WEB REAL (PLAYWRIGHT): SEMPRE que o usuário pedir para abrir, acessar ou navegar em qualquer site (ex: Brave Search, Google, Wikipedia, etc), VOCÊ DEVE OBRIGATORIAMENTE emitir a chamada de função 'open_url' (functionCall) no MESMO TURNO. É ABSOLUTAMENTE PROIBIDO apenas escrever texto prometendo abrir o site sem enviar a chamada da ferramenta 'open_url'!" +
                  "\\nREGRAS OBRIGATÓRIAS DE AGENTE SEQUENCIAL MULTI-ETAPAS (PASSO A PASSO):" +
                  "\\n1. Atue como um AGENTE SEQUENCIAL AUTÔNOMO que executa tarefas agênticas em múltiplos turnos encadeados (pesquisar na web, abrir sites, clicar em botões, ler conteúdos, preparar resumos)." +
                  "\\n2. Quando for realizar ações agênticas:" +
                  "\\n   - Descreva brevemente para o usuário o que você vai fazer em cada etapa (ex: 'Olá! Vou abrir tal site e pesquisar sobre tal coisa para você.', 'Agora vou acessar tal site:', 'Clicando no botão do site:')." +
                  "\\n   - Acompanhe cada etapa com a chamada da ferramenta correspondente ou tag de status apropriada (ex: [Pesquisando na web sobre X...], [Acessando site Y...], [Lendo conteúdo...], [Preparando resumo...])." +
                  "\\n   - Use tags diversificadas de progresso para que o usuário saiba exatamente o que está acontecendo em cada passo (ex: 'Acessando site...', 'Lendo conteúdo...', 'Preparando resumo...'). NUNCA repita a mesma tag sem contexto." +
                  "\\n   - Execute as ferramentas necessárias passo a passo até concluir todas as ações pedidas." +
                  "\\n   - Após realizar todas as ações e ferramentas agênticas, apresente a resposta e síntese final completa para o usuário." +
                  "\\n3. CRÍTICO: NUNCA escreva apenas texto conversacional prometendo ações sem enviar a chamada da ferramenta (functionCall) quando uma ação for necessária!",
                ...(currentToolConfig ? { toolConfig: currentToolConfig } : {}),
                temperature: 0.7
              }
             });
             
             const rawStream = await streamPromise;
             const iterator = rawStream[Symbol.asyncIterator]();
             
             const firstChunkPromise = iterator.next();
             const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("STREAM_TIMEOUT")), 20000));
             
             const firstChunkResult: any = await Promise.race([firstChunkPromise, timeoutPromise]);
             
             responseStream = (async function* () {
                if (!firstChunkResult.done) {
                   yield firstChunkResult.value;
                }
                while (true) {
                   const next = await iterator.next();
                   if (next.done) break;
                   yield next.value;
                }
             })();
             
             break;
          } catch (err: any) {
             if (err.message === "STREAM_TIMEOUT" && retryStreamCount < maxStreamRetries) {
               retryStreamCount++;
               console.log(\`[ChatAPI] Timeout de 20s atingido. Retentando silenciosamente (tentativa \${retryStreamCount})...\`);
               continue;
             }
             throw err;
          }
        }`;

if (code.includes(targetStr)) {
  fs.writeFileSync(file, code.replace(targetStr, replaceStr));
  console.log('Patched API stream timeout and rules successfully');
} else {
  console.log('Target string not found');
}
