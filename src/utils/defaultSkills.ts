import { ComposableSkill } from '../types';

export const DEFAULT_COMPOSABLE_SKILLS: ComposableSkill[] = [
  {
    id: 'skill_research_report',
    name: 'Relatório de pesquisa',
    description: 'Busca fontes verificadas na web, categoriza por tiers de confiabilidade, deduplica informações, estrutura dados em metadados verificáveis por linha (source_url, publisher, published_at, accessed_at, evidence_quote, source_tier, confidence), gera relatório Markdown analítico e persiste no Workspace.',
    category: 'pesquisa',
    isOfficial: true,
    version: '1.4.0',
    author: 'Omnix Core',
    tools_allowed: ['web_search', 'open_url', 'create_document', 'edit_document', 'read_document'],
    risk_policy: 'low',
    timeout: 60,
    permissions: ['web:search', 'workspace:read', 'workspace:write'],
    retry_policy: {
      max_retries: 2,
      backoff: 'exponential',
      backoff_delay_ms: 1500,
      retry_on_errors: ['ETIMEDOUT', 'RATE_LIMIT', 'PERSISTENCE_MISMATCH']
    },
    rollback: {
      enabled: true,
      cleanup_artifacts: true,
      revert_files: false,
      rollback_instructions: 'Em caso de falha de persistência ou rede, descartar rascunhos corrompidos e emitir erro técnico com o conteúdo gerado.'
    },
    data_access: {
      read_paths: ['/workspace/*'],
      write_paths: ['/workspace/Relatorio_*.md'],
      network_domains: ['*']
    },
    inputs: [
      { name: 'tema_pesquisa', type: 'string', description: 'Tema central, pergunta investigativa ou mercado alvo.', required: true },
      { name: 'profundidade', type: 'string', description: 'Nível de detalhamento: "executivo", "tecnico" ou "abrangente".', required: false, default: 'abrangente' },
      { name: 'incluir_tabela', type: 'boolean', description: 'Se deve estruturar dados em tabelas comparativas verificáveis.', required: false, default: true }
    ],
    outputs: [
      { name: 'relatorio_markdown', type: 'file (md)', description: 'Documento completo em Markdown salvo no Workspace com metadados verificáveis por linha, tabela comparativa e referências auditáveis.' },
      { name: 'fontes_verificadas', type: 'list (urls)', description: 'Lista de fontes classificadas por tier (Fonte Oficial, Imprensa Confiável, Análise Secundária, Conteúdo sem Validação).' }
    ],
    instructions: `
## SKILL: RELATÓRIO DE PESQUISA COMPOSÍVEL E VERIFICÁVEL

Ao executar esta Skill, siga rigorosamente as etapas de verificação e auditoria:

1. **Taxonomia e Tiers de Busca**:
   - **Tier 1 (Fonte Oficial)**: Órgãos governamentais, agências reguladoras (ex: IBGE, SEC, ANVISA, FDA, Banco Central), relatórios de RI das empresas e artigos científicos revisados por pares.
   - **Tier 2 (Imprensa Confiável)**: Veículos jornalísticos de alta credibilidade e reputação editorial (ex: Reuters, Bloomberg, Valor Econômico, FT).
   - **Tier 3 (Análise Secundária)**: Consultorias de mercado, whitepapers, blogs técnicos com autoria confirmada.
   - **Tier 4 (Conteúdo sem Validação / Descartar)**: Fóruns anônimos, redes sociais sem fonte primária, declarações sem evidência.

2. **Deduplicação & Extração de Evidências**:
   - Descarte alegações redundantes ou conflitantes sem respaldo oficial.
   - Extraia trechos de citação literal (evidence_quote) comprovando cada dado numérico ou afirmação factual relevante.

3. **Estrutura Verificável do Relatório**:
   - **Resumo Executivo (Key Takeaways)** com nível de certeza consolidado.
   - **Tabela de Evidências e Fatos Auditáveis**: Cada linha da tabela comparativa deve conter explicitamente:
     - \`Fato / Métrica\`
     - \`source_url\` (URL clicável)
     - \`publisher\` (Nome do veículo ou entidade)
     - \`published_at\` (Data de publicação original)
     - \`accessed_at\` (Data de acesso pela IA)
     - \`evidence_quote\` (Citação textual exata que comprova o fato)
     - \`source_tier\` (Tier 1: Oficial | Tier 2: Imprensa | Tier 3: Secundária)
     - \`confidence\` (Alta, Média ou Baixa)
   - **Análise Crítica Aprofundada**: Seções temáticas com citações de fonte em linha (\`[Publicador](URL)\`).
   - **Ressalvas & Limitações**: Dúvidas ou inconsistências encontradas entre fontes.

4. **Persistência Obrigatória de Artefato**:
   - Persista o relatório gerado no Workspace usando a ferramenta \`create_document\` ou o bloco \`<wsm_doc format="md">\` com título descritivo \`Relatorio_Pesquisa_[TEMA].md\`.
   - A resposta só pode declarar o arquivo como "criado" após o backend confirmar o artifact_id e a integridade de leitura.
`.trim(),
    examples: [
      {
        input: 'Tema: Mercado de Data Centers e Energia Renovável no Brasil 2026',
        expected_output: 'Gera relatório Markdown completo com tabela auditável contendo colunas de source_url, publisher, published_at, accessed_at, evidence_quote, source_tier e confidence, salvo no Workspace.',
        notes: 'Verificação em duas etapas: coleta de fontes Tier 1 e validação de hash pós-gravação.'
      }
    ],
    fixtures: [
      {
        name: 'sample_topics.json',
        type: 'json',
        content: '["Expansão de energia solar no Brasil 2026", "Adoção de LLMs no setor financeiro"]'
      }
    ],
    tests: [
      {
        name: 'Validação de Auditoria por Linha',
        input: 'Tema: Capacidade instalada de energia eólica no Nordeste 2026',
        assertions: [
          'Cada linha de dados deve conter source_url, publisher, published_at, accessed_at, evidence_quote, source_tier e confidence',
          'Diferenciar fontes oficiais (ex: ONS, EPE) de imprensa secundária',
          'Persistir o arquivo Markdown no Workspace com hash de integridade'
        ]
      }
    ],
    resources: [
      { name: 'Guia de Síntese Analítica', uri: 'workspace://templates/research_template.md', description: 'Template padrão para relatórios de mercado.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'skill_financial_spreadsheet',
    name: 'Planilha financeira',
    description: 'Lê planilhas XLSX e dados contábeis, valida fórmulas matemáticas, calcula projeções financeiras, constrói tabelas de fluxo de caixa e exporta nova versão formatada com integridade.',
    category: 'dados',
    isOfficial: true,
    version: '1.2.0',
    author: 'Omnix Core',
    tools_allowed: ['create_document', 'edit_document', 'read_document', 'calculadora'],
    risk_policy: 'medium',
    timeout: 45,
    permissions: ['workspace:read', 'workspace:write', 'compute:math'],
    retry_policy: {
      max_retries: 2,
      backoff: 'fixed',
      backoff_delay_ms: 1000,
      retry_on_errors: ['CALCULATION_MISMATCH', 'IO_ERROR']
    },
    rollback: {
      enabled: true,
      cleanup_artifacts: true,
      revert_files: true,
      rollback_instructions: 'Reverter documento XLSX para a versão anterior em caso de falha de validação matemática.'
    },
    data_access: {
      read_paths: ['/workspace/*.xlsx', '/workspace/*.csv'],
      write_paths: ['/workspace/*.xlsx']
    },
    inputs: [
      { name: 'dados_contabeis', type: 'text | file', description: 'Transações, DRE, fluxo de caixa ou dados brutos para processamento.', required: true },
      { name: 'tipo_analise', type: 'string', description: 'Tipo de análise: "fluxo_de_caixa", "dre", "orcamento" ou "projecao".', required: false, default: 'dre' },
      { name: 'horizonte_meses', type: 'number', description: 'Número de meses para projeção futura (ex: 6, 12, 24).', required: false, default: 12 }
    ],
    outputs: [
      { name: 'planilha_xlsx', type: 'file (xlsx)', description: 'Arquivo de planilha formatada com fórmulas matemáticas validadas salvo no Workspace.' },
      { name: 'relatorio_kpis', type: 'text', description: 'Síntese de margem EBITDA, liquidez corrente, ROI e pontos de atenção.' }
    ],
    instructions: `
## SKILL: PLANILHA FINANCEIRA COMPOSÍVEL
Ao executar esta Skill, siga rigorosamente as etapas:
1. **Validação de Fórmulas e Integridade**: Use a ferramenta calculadora para verificar somas, subtrações, percentuais de margem e consistência de balanço antes de escrever o documento.
2. **Construção da Grade de Dados**:
   - Cabeçalho com períodos (Mês 1 a Mês N).
   - Linhas organizadas: Receita Bruta, Deduções, Receita Líquida, Custos, Lucro Bruto, Despesas Operacionais, EBITDA, Lucro Líquido.
   - Fórmulas explícitas (SOMA, MÉDIA, VARIAÇÃO %).
3. **Exportação de Entregável**: Salve a planilha formatada e pronta para download com a tag <wsm_doc title="Planilha_Financeira.xlsx" format="xlsx">.
4. **Relatório de Diagnóstico**: Forneça uma análise textual destacando os principais indicadores financeiros (KPIs) calculados.
`.trim(),
    examples: [
      {
        input: 'Dados de receitas e custos dos últimos 6 meses de uma startup SaaS.',
        expected_output: 'Entrega planilha XLSX com projeção de Runway, Burn Rate e margens operacionais validadas.',
        notes: 'Recalcula fórmulas de margem bruta antes de exportar.'
      }
    ],
    fixtures: [
      {
        name: 'sample_financial_input.csv',
        type: 'file',
        content: 'mes,receita,custo,despesas\n1,100000,40000,30000\n2,120000,45000,32000'
      }
    ],
    tests: [
      {
        name: 'Checagem de Margem Operacional',
        input: 'Receita: 100k, Custos: 40k, Despesas: 30k',
        assertions: ['Lucro operacional deve ser 30k', 'Margem deve ser 30%', 'Deve gerar arquivo format="xlsx"']
      }
    ],
    resources: [
      { name: 'Modelo de DRE Padrão', uri: 'workspace://templates/financial_dre.json', description: 'Estrutura padrão de plano de contas contábeis.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'skill_code_audit_and_contract',
    name: 'Auditor de Código & Preservação de Contrato',
    description: 'Realiza extração estrita de contrato (assinatura, tipos, invariantes, casos-limite), aplica patches mínimos sem alterar a semântica/nome da função solicitada, gera testes reais e retorna telemetria de execução auditável.',
    category: 'codigo',
    isOfficial: true,
    version: '1.5.0',
    author: 'Omnix Core',
    tools_allowed: ['read_document', 'create_document', 'edit_document', 'exec_code_and_tests'],
    risk_policy: 'medium',
    timeout: 90,
    permissions: ['workspace:read', 'workspace:write', 'code:execute', 'code:inspect_ast'],
    retry_policy: {
      max_retries: 2,
      backoff: 'fixed',
      backoff_delay_ms: 1000,
      retry_on_errors: ['SYNTAX_ERROR', 'TEST_ASSERTION_FAILED']
    },
    rollback: {
      enabled: true,
      cleanup_artifacts: false,
      revert_files: true,
      rollback_instructions: 'Reverter o arquivo original para seu conteúdo pré-edição caso a suíte de testes de regressão falhe.'
    },
    data_access: {
      read_paths: ['/src/*', '/api/*', '/*.ts', '/*.py', '/*.js'],
      write_paths: ['/src/*', '/api/*', '/*.ts', '/*.py', '/*.js']
    },
    inputs: [
      { name: 'codigo_ou_funcao', type: 'text | file', description: 'Código-fonte, função com bug ou arquivo de projeto a ser corrigido.', required: true },
      { name: 'linguagem', type: 'string', description: 'Linguagem (Python, TypeScript, JavaScript, Go, Rust).', required: false, default: 'TypeScript' },
      { name: 'comportamento_esperado', type: 'string', description: 'Comportamento pretendido ou descrição do caso-limite.', required: false }
    ],
    outputs: [
      { name: 'extracao_contrato', type: 'json', description: 'JSON contendo nome da função, assinatura, invariantes, casos-limite e invariância de semântica.' },
      { name: 'patch_minimo', type: 'diff', description: 'Patch cirúrgico mínimo que preserva a assinatura e corrige exatamente a causa-raiz.' },
      { name: 'telemetria_execucao', type: 'json', description: 'Resultado real da execução dos testes: comando, exit_code, stdout, stderr, duration_ms, files_changed, cobertura e status dos testes.' }
    ],
    instructions: `
## SKILL: EXTRAÇÃO DE CONTRATO E PRESERVAÇÃO SEMÂNTICA DE CÓDIGO

Ao analisar, depurar ou refatorar qualquer trecho de código, siga OBRIGATORIAMENTE o seguinte protocolo em 4 etapas:

### 1. Etapa de Extração de Contrato (Contract Extraction) ANTES de editar:
Registre e declare explicitamente:
- **Nome da função e Assinatura**: O nome (ex: \`media\`) e parâmetros NUNCA devem ser alterados arbitrariamente (por exemplo, NUNCA renomeie \`media\` para \`somar_valores\`).
- **Tipo e Valor de Retorno Esperado**: Preserve o propósito matemático/lógico (ex: média calcula soma / n; soma calcula apenas a soma).
- **Invariantes e Casos-Limite**: Divisão por zero (lista vazia), tipos inválidos, off-by-one em loops (ex: \`range(len(v) + 1)\` vs \`range(len(v))\` ou \`sum(v)/len(v)\`).
- **Comportamento Observado vs. Desejado**.
- **Regra de Ambiguidade**: Se houver dúvida sobre o objetivo pretendido, pergunte ao usuário antes de alterar a semântica.

### 2. Patch Mínimo (Minimal AST/Diff):
- Aplique uma modificação cirúrgica mínima na linha com defeito.
- Mantenha 100% de compatibilidade retroativa com o contrato extraído.

### 3. Execução Real de Suíte de Testes ("Escrever não é Executar"):
- Escreva e submeta os testes à ferramenta de execução de código.
- Obtenha e exiba a telemetria completa da execução real:
  \`\`\`json
  {
    "command": "pytest test_media.py" / "npm test",
    "exit_code": 0,
    "stdout": "...",
    "stderr": "",
    "duration_ms": 42,
    "files_changed": ["utils/math.py"],
    "coverage": 100,
    "tests_status": { "passed": 4, "failed": 0, "total": 4 }
  }
  \`\`\`

### 4. Persistência e Confirmação:
- Salve o artefato com a tag \`<wsm_doc title="..." format="...">\` e aguarde o retorno com \`read_back_verified: true\`.
`.trim(),
    examples: [
      {
        input: 'def media(valores):\n    total = 0\n    for i in range(len(valores) + 1):\n        total += valores[i]\n    return total / len(valores)',
        expected_output: 'Extrai contrato (função media, retorno float, invariante: lista não-vazia). Corrige o range(len(valores)) ou usa sum(valores)/len(valores). NUNCA remove a divisão nem renomeia para somar_valores. Executa testes cobrindo [10, 20, 30] e lista com 1 elemento.',
        notes: 'Preserva estritamente a semântica da função solicitada.'
      }
    ],
    fixtures: [
      {
        name: 'sample_buggy_function.py',
        type: 'file',
        content: 'def media(valores):\n    if not valores:\n        return 0\n    return sum(valores) / len(valores)\n'
      }
    ],
    tests: [
      {
        name: 'Teste de Preservação de Contrato da Função Média',
        input: 'Código Python da função media com IndexError',
        assertions: [
          'O nome da função media deve ser mantido',
          'O retorno deve continuar calculando a média (divisão pela quantidade de elementos)',
          'Deve tratar lista vazia para evitar ZeroDivisionError',
          'Deve emitir telemetria de testes com exit_code 0'
        ]
      }
    ],
    resources: [],
    updatedAt: new Date().toISOString()
  }
];

