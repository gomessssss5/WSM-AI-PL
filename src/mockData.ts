import { ChatSession } from './types';

export const mockSessions: ChatSession[] = [
  {
    id: 'financial-summary',
    title: 'Resumo de relatório financei...',
    timestamp: new Date('2026-06-30T10:00:00'),
    category: 'analysis',
    messages: [
      {
        id: 'fin-q1',
        sender: 'user',
        text: 'Faça um resumo do relatório financeiro trimestral da empresa, focando nos principais indicadores.',
        timestamp: new Date('2026-06-30T10:00:00'),
      },
      {
        id: 'fin-r1',
        sender: 'ai',
        text: 'Com certeza! Analisei o relatório financeiro consolidado do segundo trimestre (Q2 2026). Abaixo você encontrará os principais destaques operacionais e a tabela comparativa:',
        timestamp: new Date('2026-06-30T10:00:15'),
        tableData: {
          headers: ['Indicador (M R$)', 'Q2 2025', 'Q2 2026', 'Crescimento (%)'],
          rows: [
            ['Receita Líquida', '124.5', '148.2', '+19.0%'],
            ['EBITDA Ajustado', '32.1', '41.8', '+30.2%'],
            ['Margem EBITDA', '25.7%', '28.2%', '+2.5 pp'],
            ['Lucro Líquido', '18.4', '24.9', '+35.3%'],
          ],
        },
      },
      {
        id: 'fin-r2',
        sender: 'ai',
        text: '📌 **Destaques do Trimestre:**\n\n• **Expansão de Margem:** O aumento de 2.5 pontos percentuais na margem EBITDA reflete ganhos de eficiência operacional no setor de logística.\n• **Investimentos (Capex):** Alocação de R$ 12.4M para a modernização do hub tecnológico.\n• **Alavancagem:** Relação dívida líquida/EBITDA estável em 1.2x, mantendo nossa classificação de baixo risco de crédito.\n\nSe precisar de uma análise mais detalhada de alguma linha específica, me avise!',
        timestamp: new Date('2026-06-30T10:00:20'),
      },
    ],
  },
  {
    id: 'image-generation',
    title: 'Geração de imagem: paisage...',
    timestamp: new Date('2026-06-30T11:00:00'),
    category: 'image',
    messages: [
      {
        id: 'img-q1',
        sender: 'user',
        text: 'Crie uma imagem de uma paisagem futurista de ficção científica, com arranha-céus flutuantes e luzes neon roxas, resolução cinematográfica.',
        timestamp: new Date('2026-06-30T11:00:00'),
      },
      {
        id: 'img-r1',
        sender: 'ai',
        text: 'Com prazer! Processei sua solicitação usando o mecanismo avançado de geração de imagens. Aqui está a representação conceitual de sua metrópole futurista flutuante com atmosfera neon roxa:',
        timestamp: new Date('2026-06-30T11:00:10'),
        imageUrl: 'cyberpunk_city',
      },
    ],
  },
  {
    id: 'python-code',
    title: 'Código Python para análise d...',
    timestamp: new Date('2026-06-30T12:00:00'),
    category: 'code',
    messages: [
      {
        id: 'py-q1',
        sender: 'user',
        text: 'Escreva um código em Python utilizando Pandas para analisar uma planilha de vendas e plotar um gráfico de barras com o faturamento mensal.',
        timestamp: new Date('2026-06-30T12:00:00'),
      },
      {
        id: 'py-r1',
        sender: 'ai',
        text: 'Com certeza! Aqui está o código completo estruturado em Python utilizando as bibliotecas `pandas` e `matplotlib`. Ele faz o carregamento do arquivo CSV, formata as datas, calcula o faturamento total por mês e gera um gráfico de barras moderno:',
        timestamp: new Date('2026-06-30T12:00:12'),
        codeBlock: {
          language: 'python',
          code: `import pandas as pd
import matplotlib.pyplot as plt

# 1. Carregar os dados de vendas
# Certifique-se de que sua planilha tenha as colunas 'data_venda' e 'valor_venda'
df = pd.read_csv('vendas.csv')

# 2. Converter a coluna de data para datetime
df['data_venda'] = pd.to_datetime(df['data_venda'])

# 3. Criar uma coluna indicando o Ano-Mês correspondente
df['ano_mes'] = df['data_venda'].dt.to_period('M')

# 4. Agrupar por Ano-Mês e somar o faturamento
faturamento_mensal = df.groupby('ano_mes')['valor_venda'].sum()

# 5. Plotar o gráfico de faturamento
plt.figure(figsize=(10, 6))
faturamento_mensal.plot(kind='bar', color='#8b5cf6', edgecolor='none')

plt.title('Faturamento Mensal Consolidado', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Período (Mês)', fontsize=12)
plt.ylabel('Faturamento (R$)', fontsize=12)
plt.xticks(rotation=45)
plt.grid(axis='y', linestyle='--', alpha=0.5)
plt.tight_layout()

# Salvar ou exibir o gráfico
plt.savefig('faturamento_mensal.png', dpi=300)
plt.show()`,
        },
      },
    ],
  },
  {
    id: 'technical-translation',
    title: 'Tradução de texto técnico',
    timestamp: new Date('2026-06-30T13:00:00'),
    category: 'translate',
    messages: [
      {
        id: 'trans-q1',
        sender: 'user',
        text: 'Traduz para o Português o seguinte parágrafo técnico sobre sistemas distribuídos: \'Distributed systems require careful consensus coordination. Paxos and Raft are popular consensus algorithms that guarantee safety and liveness under asynchronous network partitions.\'',
        timestamp: new Date('2026-06-30T13:00:00'),
      },
      {
        id: 'trans-r1',
        sender: 'ai',
        text: 'Tradução realizada com sucesso! Busquei manter a terminologia técnica padrão amplamente utilizada por engenheiros e acadêmicos na área de Computação no Brasil:',
        timestamp: new Date('2026-06-30T13:00:08'),
        translationData: {
          original: 'Distributed systems require careful consensus coordination. Paxos and Raft are popular consensus algorithms that guarantee safety and liveness under asynchronous network partitions.',
          translated: 'Sistemas distribuídos exigem uma coordenação de consenso cuidadosa. Paxos e Raft são algoritmos de consenso populares que garantem a segurança (safety) e a atividade (liveness) sob partições de rede assíncronas.',
          sourceLang: 'Inglês (EN)',
          targetLang: 'Português (PT-BR)',
        },
      },
    ],
  },
];
