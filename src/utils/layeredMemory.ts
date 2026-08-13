import { MemoryLayerItem, MemoryLayerType, MemoryNatureType, LayeredMemoryStore } from '../types';

const LAYERED_MEMORY_STORAGE_KEY = 'wsm_layered_memory_v1';

export const NATURE_METADATA: Record<MemoryNatureType, { name: string; description: string; badgeColor: string; defaultTTL: string; retentionPolicy: string }> = {
  declared: {
    name: 'Declarada pelo Usuário',
    description: 'Fatos e preferências confirmados diretamente pelo usuário. Retenção permanente e máxima autoridade.',
    badgeColor: 'emerald',
    defaultTTL: 'Infinito (Permanente)',
    retentionPolicy: 'Preservação estrita até exclusão manual pelo usuário.'
  },
  inferred: {
    name: 'Inferida pelo Agente',
    description: 'Hipóteses e padrões deduzidos pelo modelo. Requer validação para não se tornar fato artificial.',
    badgeColor: 'amber',
    defaultTTL: '7 a 14 dias (TTL ativo)',
    retentionPolicy: 'Expira ou requer confirmação periódica do usuário.'
  },
  retrieved: {
    name: 'Recuperada de Arquivos',
    description: 'Indexada de documentos, planilhas e relatórios com proveniência e hash SHA-256 rastreável.',
    badgeColor: 'cyan',
    defaultTTL: 'Sincronizada com o Arquivo',
    retentionPolicy: 'Atualizada automaticamente ao modificar o arquivo de origem.'
  }
};

export const LAYER_METADATA: Record<MemoryLayerType, { name: string; description: string; icon: string; color: string }> = {
  conversation_context: {
    name: 'Contexto da Conversa',
    description: 'Resumo e foco do diálogo atual para continuidade imediata.',
    icon: 'MessageSquare',
    color: 'blue'
  },
  user_preferences: {
    name: 'Preferências do Usuário',
    description: 'Estilo de escrita, idiomas, formatação de código e ferramentas preferidas.',
    icon: 'Sliders',
    color: 'purple'
  },
  confirmed_facts: {
    name: 'Fatos Confirmados',
    description: 'Verdades validadas pelo usuário (regras de negócio, entidades, parâmetros).',
    icon: 'CheckCircle2',
    color: 'emerald'
  },
  projects: {
    name: 'Projetos & Escopos',
    description: 'Objetivos estruturais, metas de entrega e restrições de projetos ativos.',
    icon: 'Briefcase',
    color: 'amber'
  },
  related_files: {
    name: 'Arquivos Relacionados',
    description: 'Mapeamento de dependências e documentos vinculados no Workspace.',
    icon: 'FileText',
    color: 'cyan'
  },
  decision_history: {
    name: 'Histórico de Decisões',
    description: 'Registro de escolhas arquiteturais e justificativas técnicas passadas.',
    icon: 'GitCommit',
    color: 'rose'
  }
};

const INITIAL_DEFAULT_MEMORIES: LayeredMemoryStore = {
  conversation_context: [
    {
      id: 'mem_ctx_1',
      layer: 'conversation_context',
      nature: 'declared',
      title: 'Modo de Trabalho Ativo',
      content: 'Usuário focado em construir uma plataforma extensível com Skills componíveis e memória em camadas.',
      origin: 'Conversa Principal',
      confidence: 'high',
      confidenceScore: 0.95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['workspace', 'arquitetura']
    }
  ],
  user_preferences: [
    {
      id: 'mem_pref_1',
      layer: 'user_preferences',
      nature: 'declared',
      title: 'Idioma e Comunicação',
      content: 'Respostas em Português do Brasil (PT-BR) com clareza técnica, sem jargões desnecessários.',
      origin: 'Configuração Explícita do Usuário',
      confidence: 'high',
      confidenceScore: 1.0,
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      tags: ['pt-br', 'comunicação']
    },
    {
      id: 'mem_pref_2',
      layer: 'user_preferences',
      nature: 'inferred',
      title: 'Formato de Código e UI',
      content: 'Preferência por Tailwind CSS, TypeScript estrito e componentes modulares limpos.',
      origin: 'Inferência de Conversas Anteriores',
      confidence: 'medium',
      confidenceScore: 0.85,
      ttlDays: 14,
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      tags: ['typescript', 'tailwind']
    }
  ],
  confirmed_facts: [
    {
      id: 'mem_fact_1',
      layer: 'confirmed_facts',
      nature: 'declared',
      title: 'Sistema de Autenticação e Armazenamento',
      content: 'A aplicação utiliza persistência verificada com hashes SHA-256 e Firebase Firestore para dados em nuvem.',
      origin: 'Validação Técnica do Usuário',
      confidence: 'high',
      confidenceScore: 1.0,
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      tags: ['infra', 'segurança']
    },
    {
      id: 'mem_fact_2',
      layer: 'confirmed_facts',
      nature: 'declared',
      title: 'Ambiente de Execução (Sandbox)',
      content: 'Porta 3000 como único canal externo, com suporte a background workers e streaming SSE.',
      origin: 'Ambiente Cloud Run',
      confidence: 'high',
      confidenceScore: 1.0,
      createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
      isStale: true,
      tags: ['cloud-run', 'rede']
    }
  ],
  projects: [
    {
      id: 'mem_proj_1',
      layer: 'projects',
      nature: 'declared',
      title: 'Omnix AI Studio Extensível',
      content: 'Transformar a Omnix de um chat em uma plataforma extensível com Skills abertas e Grafo de Execução.',
      origin: 'Projeto Principal Registrado',
      confidence: 'high',
      confidenceScore: 0.98,
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      tags: ['roadmap', 'p1']
    }
  ],
  related_files: [
    {
      id: 'mem_file_1',
      layer: 'related_files',
      nature: 'retrieved',
      title: 'Templates de Relatórios e Planilhas',
      content: 'Arquivos gerados no Workspace salvos com verificação SHA-256 e tags estruturadas <wsm_doc>.',
      origin: 'Workspace /relatorios/report_final.md',
      sourceArtifactId: 'art_report_01',
      confidence: 'high',
      confidenceScore: 0.95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['artefatos', 'workspace']
    }
  ],
  decision_history: [
    {
      id: 'mem_dec_1',
      layer: 'decision_history',
      nature: 'declared',
      title: 'Adoção do Formato Componível para Skills',
      content: 'Padronização do formato: name, version, description, instructions, tools_allowed, inputs, outputs, risk_policy, retry_policy, rollback, examples, tests.',
      origin: 'Decisão Arquitetural P1',
      confidence: 'high',
      confidenceScore: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['skills', 'schema']
    }
  ]
};

export function getLayeredMemories(): LayeredMemoryStore {
  try {
    const raw = localStorage.getItem(LAYERED_MEMORY_STORAGE_KEY);
    if (!raw) {
      saveLayeredMemories(INITIAL_DEFAULT_MEMORIES);
      return INITIAL_DEFAULT_MEMORIES;
    }
    const parsed: LayeredMemoryStore = JSON.parse(raw);
    
    // Check freshness on load (e.g. > 7 days old)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const checkedStore: LayeredMemoryStore = {
      conversation_context: (parsed.conversation_context || []).map(i => ({ ...i, nature: i.nature || 'declared' })),
      user_preferences: (parsed.user_preferences || []).map(i => ({ ...i, nature: i.nature || 'declared' })),
      confirmed_facts: (parsed.confirmed_facts || []).map(item => {
        const itemDate = new Date(item.updatedAt || item.createdAt).getTime();
        return {
          ...item,
          nature: item.nature || 'declared',
          isStale: itemDate < sevenDaysAgo
        };
      }),
      projects: (parsed.projects || []).map(i => ({ ...i, nature: i.nature || 'declared' })),
      related_files: (parsed.related_files || []).map(i => ({ ...i, nature: i.nature || 'retrieved' })),
      decision_history: (parsed.decision_history || []).map(i => ({ ...i, nature: i.nature || 'declared' }))
    };
    return checkedStore;
  } catch (e) {
    console.warn('Failed to parse layered memories, using initial default:', e);
    return INITIAL_DEFAULT_MEMORIES;
  }
}

export function saveLayeredMemories(store: LayeredMemoryStore): void {
  try {
    localStorage.setItem(LAYERED_MEMORY_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save layered memories to localStorage', e);
  }
}

export function addMemoryItem(item: Omit<MemoryLayerItem, 'id' | 'createdAt' | 'updatedAt'>): MemoryLayerItem {
  const store = getLayeredMemories();
  const now = new Date().toISOString();
  const newItem: MemoryLayerItem = {
    ...item,
    nature: item.nature || 'declared',
    id: `mem_${item.layer.substring(0, 4)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
    updatedAt: now,
    isStale: false
  };

  store[item.layer] = [newItem, ...(store[item.layer] || [])];
  saveLayeredMemories(store);
  return newItem;
}

export function updateMemoryItem(item: MemoryLayerItem): void {
  const store = getLayeredMemories();
  const layerItems = store[item.layer] || [];
  const index = layerItems.findIndex(i => i.id === item.id);
  if (index >= 0) {
    layerItems[index] = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    store[item.layer] = layerItems;
    saveLayeredMemories(store);
  }
}

export function deleteMemoryItem(layer: MemoryLayerType, id: string): void {
  const store = getLayeredMemories();
  store[layer] = (store[layer] || []).filter(i => i.id !== id);
  saveLayeredMemories(store);
}

/**
 * Builds a structured, grounded prompt block for the AI with the 6 layers, 3 natures (declared, inferred, retrieved) and strict continuity rules.
 */
export function buildLayeredMemoryPrompt(store: LayeredMemoryStore): string {
  const formatLayer = (items: MemoryLayerItem[], label: string) => {
    if (!items || items.length === 0) return `[${label}]: Nenhum item registrado.`;
    return `### ${label}:\n` + items.map(item => {
      const staleNotice = item.isStale ? ' ⚠️ [ATENÇÃO: FATO ANTIGO (>7 DIAS) - CONFIRME ANTES DE ASSUMIR]' : '';
      const natureLabel = item.nature === 'declared' ? '👤 DECLARADA PELO USUÁRIO' : item.nature === 'inferred' ? '🤖 INFERIDA PELO AGENTE' : '📄 RECUPERADA DE ARQUIVO';
      const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString('pt-BR');
      return `- **${item.title}** (${natureLabel} | ${item.confidence.toUpperCase()} CONFIANÇA | Origem: ${item.origin} | Data: ${dateStr})${staleNotice}\n  ${item.content}`;
    }).join('\n');
  };

  return `
## SISTEMA DE MEMÓRIA EM CAMADAS, CONTINUIDADE E 3 NATUREZAS (DECLARADA, INFERIDA, RECUPERADA)
Abaixo está o estado atual da memória do agente dividida em 6 camadas estruturadas e categorizada por natureza de conhecimento:

${formatLayer(store.conversation_context, '1. Contexto da Conversa')}

${formatLayer(store.user_preferences, '2. Preferências do Usuário')}

${formatLayer(store.confirmed_facts, '3. Fatos Confirmados')}

${formatLayer(store.projects, '4. Projetos e Escopos')}

${formatLayer(store.related_files, '5. Arquivos Relacionados')}

${formatLayer(store.decision_history, '6. Histórico de Decisões')}

REGRAS ESTRITAS DE CONTINUIDADE E MEMÓRIA:
1. **NUNCA TRANSFORMAR HIPÓTESES EM FATOS**: Memórias classificadas como '🤖 INFERIDA PELO AGENTE' não possuem autoridade absoluta. Se uma dedução for crítica, confirme explicitamente com o usuário antes de gravá-la como '👤 DECLARADA PELO USUÁRIO'.
2. **NÃO REPETIR PERGUNTAS JÁ RESPONDIDAS**: Se uma preferência, decisão ou fato declarado já estiver registrado com alta confiança, use a informação diretamente sem re-perguntar.
3. **AVISO PRÉVIO AO USAR FATOS ANTIGOS OU DESATUALIZADOS**: Se um fato confirmado estiver marcado como antigo (⚠️ FATO ANTIGO), verifique a validade com o usuário.
4. **RESPEITO ÀS PREFERÊNCIAS**: Siga rigorosamente as preferências de idioma, estilo de resposta e formatos registrados na Camada 2.
`.trim();
}

