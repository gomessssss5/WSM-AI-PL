import { ComposableSkill } from '../types';

export const DEFAULT_COMPOSABLE_SKILLS: ComposableSkill[] = [
  {
    id: 'skill_research_report',
    name: 'Relatório de pesquisa',
    description: 'Busca fontes confiáveis na web, extrai dados relevantes, deduplica informações, estrutura tabelas comparativas, gera documento analítico em Markdown e salva no Workspace.',
    category: 'pesquisa',
    isOfficial: true,
    version: '1.2.0',
    author: 'Omnix Core',
    tools_allowed: ['web_search', 'open_url', 'create_document', 'edit_document'],
    risk_policy: 'low',
    inputs: [
      { name: 'tema_pesquisa', type: 'string', description: 'Tema central, pergunta investigativa ou mercado alvo.', required: true },
      { name: 'profundidade', type: 'string', description: 'Nível de detalhamento: "executivo", "tecnico" ou "abrangente".', required: false },
      { name: 'incluir_tabela', type: 'boolean', description: 'Se deve estruturar dados em tabelas comparativas.', required: false }
    ],
    outputs: [
      { name: 'relatorio_markdown', type: 'file (md)', description: 'Documento completo em Markdown salvo no Workspace com resumo executivo, dados deduplicados, tabela e referências.' },
      { name: 'fontes_verificadas', type: 'list (urls)', description: 'Lista de fontes primárias e links confiáveis verificados.' }
    ],
    instructions: `
## SKILL: RELATÓRIO DE PESQUISA COMPOSÍVEL
Ao executar esta Skill, siga rigorosamente as etapas:
1. **Descoberta & Coleta**: Realize buscas abrangentes com a ferramenta web_search focando em fontes oficiais, notícias recentes e artigos de referência.
2. **Deduplicação & Validação**: Remova dados repetidos, verifique consistência entre diferentes fontes e descarte informações sem fonte confiável.
3. **Estruturação Analítica**:
   - Título e Resumo Executivo (Key Takeaways).
   - Tabela comparativa com métricas, datas e status.
   - Análise crítica detalhada dividida por tópicos.
   - Conclusão com recomendações de ação.
   - Lista completa de referências e links das fontes.
4. **Persistência de Artefato**: Salve o resultado final como um arquivo Markdown usando o bloco estruturado <wsm_doc title="Relatorio_Pesquisa_[TEMA].md" format="md">.
`.trim(),
    examples: [
      {
        input: 'Tema: Crescimento de IA Generativa em saúde em 2026',
        expected_output: 'Gera relatório Markdown com tabela de casos de uso em hospitais, investimentos globais e referências da OMS e FDA.'
      }
    ],
    tests: [
      {
        name: 'Validação de Estrutura de Fontes',
        input: 'Tema: Energia solar fotovoltaica Brasil 2026',
        assertions: ['Deve conter pelo menos 3 fontes citadas', 'Deve conter tabela de capacidade instalada', 'Deve salvar como arquivo .md']
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
