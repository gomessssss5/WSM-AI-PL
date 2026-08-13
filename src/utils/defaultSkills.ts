import { ComposableSkill } from '../types';

export const DEFAULT_COMPOSABLE_SKILLS: ComposableSkill[] = [
  {
    id: 'skill_research_report',
    name: 'Relatório de pesquisa',
    description: 'Busca fontes verificadas na web, categoriza por tiers de confiabilidade, deduplica informações, estrutura dados em metadados verificáveis por linha (source_url, publisher, published_at, accessed_at, evidence_quote, source_tier, confidence), gera relatório Markdown analítico e persiste no Workspace.',
    category: 'pesquisa',
    isOfficial: true,
    version: '1.3.0',
    author: 'Omnix Core',
    tools_allowed: ['web_search', 'open_url', 'create_document', 'edit_document', 'read_document'],
    risk_policy: 'low',
    inputs: [
      { name: 'tema_pesquisa', type: 'string', description: 'Tema central, pergunta investigativa ou mercado alvo.', required: true },
      { name: 'profundidade', type: 'string', description: 'Nível de detalhamento: "executivo", "tecnico" ou "abrangente".', required: false },
      { name: 'incluir_tabela', type: 'boolean', description: 'Se deve estruturar dados em tabelas comparativas verificáveis.', required: false }
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
   - A resposta só pode declarar o arquivo como "criado" após validação de persistência.
`.trim(),
    examples: [
      {
        input: 'Tema: Mercado de Data Centers e Energia Renovável no Brasil 2026',
        expected_output: 'Gera relatório Markdown completo com tabela auditável contendo colunas de source_url, publisher, published_at, accessed_at, evidence_quote, source_tier e confidence, salvo no Workspace.'
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
    description: 'Lê planilhas XLSX e dados contábeis, valida fórmulas, calcula projeções financeiras, constrói tabelas de fluxo de caixa e exporta nova versão formatada.',
    category: 'dados',
    isOfficial: true,
    version: '1.1.0',
    author: 'Omnix Core',
    tools_allowed: ['create_document', 'edit_document', 'calculadora'],
    risk_policy: 'medium',
    inputs: [
      { name: 'dados_contabeis', type: 'text | file', description: 'Transações, DRE, fluxo de caixa ou dados brutos para processamento.', required: true },
      { name: 'tipo_analise', type: 'string', description: 'Tipo de análise: "fluxo_de_caixa", "dre", "orcamento" ou "projecao".', required: false },
      { name: 'horizonte_meses', type: 'number', description: 'Número de meses para projeção futura (ex: 6, 12, 24).', required: false }
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
        expected_output: 'Entrega planilha XLSX com projeção de Runway, Burn Rate e margens operacionais validadas.'
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
    id: 'skill_code_audit',
    name: 'Auditor de Código & Testes',
    description: 'Inspeciona repositórios e scripts, identifica vulnerabilidades de segurança, analisa complexidade ciclomática e gera suítes de testes unitários automatizados.',
    category: 'codigo',
    isOfficial: true,
    version: '1.0.0',
    author: 'Omnix Core',
    tools_allowed: ['read_document', 'create_document', 'edit_document'],
    risk_policy: 'low',
    inputs: [
      { name: 'codigo_fonte', type: 'text | file', description: 'Trecho de código ou arquivo de projeto a ser auditado.', required: true },
      { name: 'linguagem', type: 'string', description: 'Linguagem de programação (TypeScript, Python, Go, Rust, etc).', required: false }
    ],
    outputs: [
      { name: 'relatorio_auditoria', type: 'file (md)', description: 'Relatório detalhado de vulnerabilidades, boas práticas e melhorias de performance.' },
      { name: 'suite_de_testes', type: 'file (ts/py)', description: 'Arquivo com testes unitários cobrindo casos limites.' }
    ],
    instructions: `
## SKILL: AUDITOR DE CÓDIGO E TESTES
1. Analise o código para falhas de injeção, memory leaks, bugs de concorrência e tipos incorretos.
2. Formate uma tabela de severidade: Crítica, Alta, Média, Baixa.
3. Para cada problema, apresente a correção de código correspondente com diff claro.
4. Salve o relatório como <wsm_doc title="Auditoria_Seguranca_Codigo.md" format="md">.
`.trim(),
    examples: [
      {
        input: 'Código Express com consulta SQL sem sanitização',
        expected_output: 'Detecta SQL Injection de alta severidade, reescreve com queries parametrizadas e adiciona testes de penetração.'
      }
    ],
    tests: [
      {
        name: 'Detecção de Secrets Expostos',
        input: 'const apiKey = "sk-123456789";',
        assertions: ['Deve classificar como risco Alto', 'Deve sugerir uso de process.env']
      }
    ],
    resources: [],
    updatedAt: new Date().toISOString()
  }
];
