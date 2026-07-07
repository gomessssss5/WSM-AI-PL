import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MainHome from './components/MainHome';
import ChatWindow from './components/ChatWindow';
import ImagesGallery from './components/ImagesGallery';
import EvaluationDashboard from './components/EvaluationDashboard';
import Login from './components/Login';
import { auth, onAuthStateChanged, signOut, User, getRedirectResult } from './lib/firebase';
import { subscribeSessions, saveSession, deleteSessionFromDb } from './lib/chatService';
import { ChatSession, Message } from './types';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isImagesView, setIsImagesView] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('WSM 1.6 Mercúrio');
  const [showEvaluations, setShowEvaluations] = useState(false);

  // Keep references to activeSession and dirty state for event listeners
  const isDirtyRef = useRef<boolean>(false);
  const activeSessionRef = useRef<ChatSession | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<any>(null);
  const currentUserRef = useRef<User | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSearchActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const keys = new Set<string>();
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key);
      if (e.shiftKey && (keys.has('5') || keys.has('%')) && (keys.has('0') || keys.has(')'))) {
        setShowEvaluations(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Request Notification permission immediately when the app mounts
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Permissão de notificação concedida:', permission);
      });
    }
  }, []);

  const sendCompletionNotification = () => {
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = "Resposta do WSM AI está pronta!";
        const options: any = {
          body: `O modelo ${selectedModel} terminou de processar a sua resposta.`,
          icon: '/favicon.ico',
          tag: 'wsm-ai-response',
          renotify: true
        };
        new Notification(title, options);
      } catch (err) {
        console.error('Erro ao disparar notificação:', err);
      }
    }
  };

  // Sync activeSessionId reference
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Sync currentUser reference
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Sync activeSession reference
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Listen to Auth State Changes
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.warn("Redirect result handled/resolved with: ", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to User Sessions from Firestore
  useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      return;
    }

    const unsubscribe = subscribeSessions(currentUser.uid, (loadedSessions) => {
      setSessions((prevSessions) => {
        const currentActiveId = activeSessionIdRef.current;
        const activeLocal = prevSessions.find((s) => s.id === currentActiveId);
        const isStreamingOrSimulating = activeLocal?.messages.some((m) => m.isSimulatingSearch);
        // Robust preservation of active local session to prevent any overwriting of ongoing chat, streaming, or simulation
        const isLocalActivePreserved = !!activeLocal;
        const isActiveLocalDirtyOrPreserved = activeLocal && (isDirtyRef.current || isStreamingOrSimulating);
        const isActiveInLoaded = loadedSessions.some((loaded) => loaded.id === currentActiveId);

        // Map loaded sessions, preserving dirty/streaming state for active one if it's updated in loaded list
        const updatedLoaded = loadedSessions.map((loaded) => {
          if (loaded.id === currentActiveId && activeLocal) {
            return {
              ...loaded,
              messages: activeLocal.messages,
              title: activeLocal.title
            };
          }
          return loaded;
        });

        // If active session is dirty/streaming but NOT yet in loadedSessions, keep it at the top!
        if (isActiveLocalDirtyOrPreserved && !isActiveInLoaded && activeLocal) {
          return [activeLocal, ...updatedLoaded];
        }

        return updatedLoaded;
      });
    });

    return () => unsubscribe();
  }, [currentUser, activeSessionId]);

  // Persists the specified session directly to Firestore and clears the active save timeout
  const persistSession = async (session: ChatSession) => {
    const user = currentUserRef.current;
    if (!user || !isDirtyRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    try {
      console.log('Persisting session to Firestore:', session.id);
      await saveSession(user.uid, session);
      isDirtyRef.current = false;
    } catch (err) {
      console.error('Erro ao persistir sessão no Firestore:', err);
    }
  };

  // Triggers a debounced save 8 seconds after the user stops sending messages
  const triggerDebouncedSave = (session?: ChatSession) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Always get the absolute latest state of the active session to avoid saving stale snapshot closures
      const latestSession = activeSessionRef.current || session;
      if (latestSession) {
        persistSession(latestSession);
      }
    }, 8000);
  };

  // Handle unload, hide, or tab closing
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (activeSessionRef.current && isDirtyRef.current) {
        persistSession(activeSessionRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnloadOrHide);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleUnloadOrHide();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnloadOrHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Handle switching to a specific session
  const handleSelectSession = (id: string | null) => {
    if (activeSessionRef.current && isDirtyRef.current) {
      persistSession(activeSessionRef.current);
    }
    setIsImagesView(false);
    setActiveSessionId(id);
  };

  // Create a brand new clean chat session
  const handleNewChat = () => {
    if (activeSessionRef.current && isDirtyRef.current) {
      persistSession(activeSessionRef.current);
    }
    setIsImagesView(false);
    setActiveSessionId(null);
  };

  // Toggle images gallery view
  const handleToggleImagesView = () => {
    setIsImagesView(!isImagesView);
  };

  // Delete an existing session from Firestore
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      if (activeSessionId === id) {
        isDirtyRef.current = false;
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
      }
      await deleteSessionFromDb(currentUser.uid, id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error('Erro ao excluir sessão do banco de dados:', err);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    if (activeSessionRef.current && isDirtyRef.current) {
      await persistSession(activeSessionRef.current);
    }
    try {
      await signOut(auth);
      setActiveSessionId(null);
      setIsImagesView(false);
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  // Generate high-quality simulated response based on user input
  const getSimulatedResponse = (text: string, isSearchEnabled: boolean): Partial<Message> => {
    const lower = text.toLowerCase();
    
    // 1. Math / Scientific Response
    if (
      lower.includes('matematica') ||
      lower.includes('matemática') ||
      lower.includes('calculo') ||
      lower.includes('cálculo') ||
      lower.includes('equacao') ||
      lower.includes('equação') ||
      lower.includes('formula') ||
      lower.includes('fórmula') ||
      lower.includes('math') ||
      lower.includes('fisica') ||
      lower.includes('física') ||
      lower.includes('derivada') ||
      lower.includes('integral')
    ) {
      return {
        text: `## 📐 Resolução Matemática Completa (${selectedModel})

Aqui está uma análise matemática detalhada de alta fidelidade baseada na sua consulta. Vamos deduzir e explicar as equações fundamentais passo a passo utilizando **LaTeX** de alta precisão.

### 1. Definição e Formulação Teórica
Dada uma função contínua real, a derivada no ponto nos dá a taxa de variação instantânea. De forma semelhante, o **Teorema Fundamental do Cálculo** conecta a derivação com a integração:

Seja $f(x)$ contínua no intervalo $[a, b]$, então definimos a integral definida como:
$$ \\int_{a}^{b} f(x) \\, dx = F(b) - F(a) $$

Onde $F(x)$ é a antiderivada tal que:
$$ \\frac{d}{dx}F(x) = f(x) $$

---

### 2. Exemplos de Equações Avançadas

*   **Identidade de Euler**: Relaciona cinco das constantes matemáticas mais importantes de forma harmônica:
    $$ e^{i \\pi} + 1 = 0 $$

*   **Integral de Gauss**: Fundamental em probabilidade e estatística (distribuição normal):
    $$ \\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi} $$

*   **Equação de Campo de Einstein**: Estrutura do espaço-tempo na Relatividade Geral:
    $$ G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu} $$

---

### 3. Tabela Comparativa de Domínios
| Ramo da Matemática | Operação Principal | Elemento Neutro | Equação Típica |
| :--- | :--- | :--- | :--- |
| **Álgebra** | Multiplicação | $1$ | $x^2 - y^2 = (x-y)(x+y)$ |
| **Cálculo** | Limite | Diferencial | $\\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$ |
| **Física Teórica** | Hamiltoniana | Ação Mínima | $\\delta S = 0$ |

> *Nota explicativa:* A velocidade de cálculo computacional com o motor **${selectedModel}** permitiu resolver esta formulação analítica em apenas **0.12 segundos** usando simulação simbólica.`
      };
    }

    // 2. Image Generation Response
    if (
      lower.includes('imagem') || 
      lower.includes('crie uma imagem') || 
      lower.includes('gerar imagem') || 
      lower.includes('desenhe') || 
      lower.includes('paisagem') || 
      lower.includes('cyberpunk')
    ) {
      return {
        text: `## 🎨 Geração de Imagem Concluída

Utilizei o motor gráfico **WSM Image Gen** integrado ao **${selectedModel}** para processar sua instrução.

### 🛠️ Parâmetros do Prompt
- **Estilo:** Futurista / Cyberpunk de alta fidelidade
- **Dimensões:** $1024 \\times 1024$ pixels (Proporção $1:1$)
- **Paleta de Cores:** Tons de roxo neon, ciano profundo e detalhes dourados.

### 🔬 Análise de Composição Gráfica
1. **Ponto de Fuga Central:** O horizonte converge para uma torre de dados flutuante.
2. **Iluminação de Raytracing:** Reflexos dinâmicos gerados em superfícies molhadas.
3. **Escala Fractal:** Geometria urbana calculada usando a equação de Mandelbrot:
   $$ Z_{n+1} = Z_n^2 + C $$

Veja o resultado da renderização em tempo real abaixo:`,
        imageUrl: 'cyberpunk_city',
      };
    }

    // 3. Code Block Response
    if (
      lower.includes('codigo') || 
      lower.includes('código') || 
      lower.includes('python') || 
      lower.includes('javascript') || 
      lower.includes('função') || 
      lower.includes('programar') || 
      lower.includes('html') || 
      lower.includes('css')
    ) {
      const isPy = lower.includes('python');
      return {
        text: `## 💻 Solução de Programação Refatorada (${selectedModel})

Aqui está uma solução limpa, altamente otimizada e documentada seguindo as melhores práticas do mercado de desenvolvimento de software.

### 🚀 Destaques da Implementação
*   **Complexidade de Tempo:** $O(N)$ no pior caso.
*   **Complexidade de Espaço:** $O(N)$ para armazenamento de chaves de busca.
*   **Estilo:** Funcional, modular e de fácil legibilidade.

Observe a estrutura de código na seção abaixo:`,
        codeBlock: {
          language: isPy ? 'python' : 'javascript',
          code: isPy 
            ? `def remover_duplicados(lista):\n    """\n    Remove elementos duplicados de uma lista preservando a ordem original.\n    Complexidade: O(N) tempo e espaço.\n    """\n    vistos = set()\n    return [item for item in lista if not (item in vistos or vistos.add(item))]\n\n# Exemplo prático de uso:\nvalores = [1, 2, 2, 3, 4, 4, 1, 5]\nresultado = remover_duplicados(valores)\nprint(f"Lista sem duplicatas: {resultado}")\n# Saída: [1, 2, 3, 4, 5]`
            : `function removeDuplicates(arr) {\n  // Utilizando Set para remoção em complexidade O(N)\n  return [...new Set(arr)];\n}\n\n// Exemplo prático de uso:\nconst valores = [10, 20, 20, 30, 40, 40, 10, 50];\nconst limpos = removeDuplicates(valores);\nconsole.log("Valores limpos:", limpos); // [10, 20, 30, 40, 50]`,
        }
      };
    }

    // 4. Translation Response
    if (
      lower.includes('traduz') || 
      lower.includes('traduza') || 
      lower.includes('traduzir') || 
      lower.includes('translation')
    ) {
      return {
        text: `## 🌐 Tradução Neural Contextualizada

A tradução foi concluída pelo modelo de linguagem natural **${selectedModel}** aplicando técnicas de desambiguação semântica.

### 📝 Resumo do Trabalho
*   **Tom de Linguagem:** Técnico e profissional.
*   **Preservação Estrutural:** Mantida a formatação e as expressões matemáticas originais.

Observe a comparação de blocos de idiomas na listagem abaixo:`,
        translationData: {
          original: text.replace(/traduz|traduza|para o português|para o inglês/gi, '').trim() || 'The future of artificial intelligence is open, multi-modal, and extremely fast.',
          translated: 'O futuro da inteligência artificial é aberto, multimodal e extremamente rápido.',
          sourceLang: 'Inglês (EN)',
          targetLang: 'Português (PT-BR)'
        }
      };
    }

    // 5. Data analysis / Table response
    if (
      lower.includes('analise') || 
      lower.includes('dados') || 
      lower.includes('relatório') || 
      lower.includes('financeiro') || 
      lower.includes('tabela')
    ) {
      return {
        text: `## 📊 Relatório Analítico de Desempenho

O motor de análise estatística do **${selectedModel}** processou os dados brutos e produziu uma consolidação de métricas.

### 📈 Descobertas Principais
- **Eficiência de Processamento:** Houve uma redução drástica no tempo médio de resposta.
- **Redução de Latência:** O algoritmo de inferência agora é executado de forma paralela.
- **Consumo Energético:** Otimização de $31\\%$ nos núcleos de processamento gráfico.

### 📋 Tabela Consolidada de Métricas
| Parâmetro de Performance | Status de Infraestrutura | Valor Anterior | Valor Atual | Variação (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Tempo de Execução (inferência)** | Excelente ⚡ | $1.2s$ | $0.35s$ | $-70.8\\%$ |
| **Acurácia Semântica (LLM)** | Excelente ⭐ | $94.2\\%$ | $99.1\\%$ | $+5.2\\%$ |
| **Uso de Memória RAM** | Otimizado 📉 | $128\\text{ MB}$ | $88\\text{ MB}$ | $-31.2\\%$ |
| **Pontuação de Satisfação** | Altíssima 📈 | $4.8/5.0$ | $4.98/5.0$ | $+3.75\\%$ |

> *Recomendação Técnico:* Recomenda-se manter o modelo **${selectedModel}** ativado para todas as operações críticas do dia a dia devido aos ganhos substanciais de performance.`
      };
    }

    // 6. General Text Response
    const searchStatus = isSearchEnabled 
      ? '🌐 **[Busca na Web Ativada]** Fontes de conhecimento atualizadas com sucesso.\n\n' 
      : '';
    
    return {
      text: `${searchStatus}# 👋 Bem-vindo ao WSM AI Hub!

Olá! Eu sou o **${selectedModel}**, uma inteligência artificial desenvolvida para fornecer respostas com velocidade de resposta ultrarrápida, raciocínio lógico apurado e recursos multimodais avançados.

---

### ⚡ Recursos Principais do Hub
- **Cálculo Científico com LaTeX:** Suporta formatação matemática de ponta, como a equação de onda:
  $$ \\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u $$
- **Tabelas de Análise Comparativa:** Renderização automática de dados.
- **Destaques em Negrito e Itálico:** Textos formatados dinamicamente para facilitar a leitura.
- **Listas e Tópicos Estruturados:** Informações organizadas por relevância temática.

---

### 🚀 Experimente Agora!
Você pode clicar em um dos cartões de sugestão na tela inicial ou experimentar estas opções:
1.  **Peça matemática:** "Mostre equações de física e integrais"
2.  **Peça dados:** "Mostre uma tabela de análise financeira"
3.  **Peça imagem:** "Crie uma imagem realista de uma cidade cyberpunk"
4.  **Peça código:** "Escreva uma função para filtrar números pares em JavaScript"

Como posso ajudar você hoje?`
    };
  };

  // Main sendMessage routine (used by both MainHome input and ChatWindow input)
  const handleSendMessage = async (text: string, isSearchEnabled: boolean, overrideMessages?: Message[]) => {
    if (!currentUser) return;

    isSearchActiveRef.current = isSearchEnabled;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    let sessionToUpdate: ChatSession;

    if (!activeSessionId) {
      // Create a brand new session locally first
      const truncatedTitle = text.length > 28 ? `${text.substring(0, 28)}...` : text;
      const newId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: newId,
        title: truncatedTitle,
        timestamp: new Date(),
        messages: [userMsg],
        category: 'general',
      };
      
      sessionToUpdate = newSession;
      
      // Update local state immediately for smooth UI transition
      setSessions((prev) => [newSession, ...prev]);
      activeSessionIdRef.current = newId;
      setActiveSessionId(newId);
      isDirtyRef.current = true;
      triggerDebouncedSave(newSession);
    } else {
      // Append message to existing session locally first
      const currentSession = sessions.find((s) => s.id === activeSessionId);
      if (!currentSession) return;
      
      sessionToUpdate = {
        ...currentSession,
        messages: overrideMessages ? [...overrideMessages, userMsg] : [...currentSession.messages, userMsg],
      };
      
      // Update local state immediately for smooth UI transition
      setSessions((prev) => prev.map((s) => s.id === activeSessionId ? sessionToUpdate : s));
      isDirtyRef.current = true;
      triggerDebouncedSave(sessionToUpdate);
    }

    // Real AI response fetch from Express backend
    setIsThinking(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const initialAiMsg: Message = {
      id: `msg-${Date.now()}-ai`,
      sender: "ai",
      text: "",
      timestamp: new Date(),
      isSearchMessage: isSearchEnabled,
      searchIntro: isSearchEnabled ? "Preparando a pesquisa..." : undefined,
      searchSteps: [],
      finalSynthesis: "",
      searchImages: [],
      searchSources: [],
      isSimulatingSearch: isSearchEnabled,
    };

    // Put the user's message and the initial AI searching message in state immediately
    setSessions((prev) => {
      const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
        if (!currentSess) return prev;
        return prev.map((s) => {
          if (s.id !== sessionToUpdate.id) return s;
          return {
            ...s,
            messages: [
              ...s.messages.filter((m) => m.id !== userMsg.id),
              userMsg,
              initialAiMsg,
            ],
          };
        });
      });

      fetch("/api/chat", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          isSearchEnabled,
          model: selectedModel,
          history: sessionToUpdate.messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text || m.finalSynthesis || "" }]
          }))
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Erro na conexão com o servidor de IA");

          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("text/event-stream")) {
            // Fallback for non-SSE response (e.g. error JSON or missing Tavily key)
            const data = await res.json();
            setSessions((prev) => {
              const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
              if (!currentSess) return prev;
              const finalSession = {
                ...currentSess,
                messages: currentSess.messages.map((m) =>
                  m.id === initialAiMsg.id
                    ? {
                        ...m,
                        text: data.text || "",
                        finalSynthesis: data.text || "",
                        searchImages: data.searchImages || [],
                        searchSources: data.searchSources || [],
                        isSimulatingSearch: false,
                        searchIntro: data.text ? undefined : "Pesquisa concluída.",
                      }
                    : m
                ),
              };
              isDirtyRef.current = true;
              triggerDebouncedSave(finalSession);
              return prev.map((s) => s.id === sessionToUpdate.id ? finalSession : s);
            });
            setIsThinking(false);
            sendCompletionNotification();
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("Readable stream não suportado");
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanedLine = line.trim();
              if (!cleanedLine.startsWith("data: ")) continue;

              try {
                const eventData = JSON.parse(cleanedLine.substring(6));

                if (eventData.type === "plan") {
                  console.log("[App.tsx] Received SSE plan event:", eventData);
                  setIsThinking(false); // Stop typing spinner as soon as we start research plan!
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) {
                      console.warn("[App.tsx] Plan event: sessionToUpdate.id not found in sessions!", sessionToUpdate.id);
                      return prev;
                    }
                    return prev.map((s) => {
                      if (s.id !== sessionToUpdate.id) return s;
                      let matched = false;
                      const updatedMsgs = s.messages.map((m) => {
                        if (m.id === initialAiMsg.id) {
                          matched = true;
                          return {
                            ...m,
                            isSearchMessage: true,
                            isSimulatingSearch: true,
                            searchIntro: eventData.searchIntro,
                            searchSteps: eventData.searchSteps,
                          };
                        }
                        return m;
                      });
                      console.log(`[App.tsx] Plan event applied to message. Matched initialAiMsg.id (${initialAiMsg.id}):`, matched);
                      return {
                        ...s,
                        messages: updatedMsgs,
                      };
                    });
                  });
                } else if (eventData.type === "chunk" || eventData.type === "sync_text") {
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) return prev;
                    return prev.map((s) => {
                      if (s.id !== sessionToUpdate.id) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) => {
                          if (m.id === initialAiMsg.id) {
                            return {
                              ...m,
                              text: eventData.type === "sync_text" ? eventData.text : (m.text + eventData.text),
                              finalSynthesis: eventData.type === "sync_text" ? eventData.text : (m.text + eventData.text),
                            };
                          }
                          return m;
                        }),
                      };
                    });
                  });
                } else if (eventData.type === "step_complete") {
                  console.log("[App.tsx] Received SSE step_complete event:", eventData);
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) {
                      console.warn("[App.tsx] Step complete event: sessionToUpdate.id not found in sessions!", sessionToUpdate.id);
                      return prev;
                    }
                    return prev.map((s) => {
                      if (s.id !== sessionToUpdate.id) return s;
                      let matched = false;
                      const updatedMsgs = s.messages.map((m) => {
                        if (m.id !== initialAiMsg.id) return m;
                        matched = true;
                        const steps = m.searchSteps ? [...m.searchSteps] : [];
                        if (steps[eventData.index]) {
                          steps[eventData.index] = {
                            ...steps[eventData.index],
                            sources: eventData.sources,
                            isCompleted: eventData.isCompleted,
                          };
                          console.log(`[App.tsx] Updated step at index ${eventData.index}:`, steps[eventData.index]);
                        } else {
                          console.warn(`[App.tsx] Step index ${eventData.index} not found in searchSteps! length=${steps.length}`);
                        }
                        return {
                          ...m,
                          searchSteps: steps,
                        };
                      });
                      console.log(`[App.tsx] Step complete event applied to messages. Matched initialAiMsg.id (${initialAiMsg.id}):`, matched);
                      return {
                        ...s,
                        messages: updatedMsgs,
                      };
                    });
                  });
                } else if (eventData.type === "final") {
                  console.log("[App.tsx] Received SSE final event:", eventData);
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) {
                      console.warn("[App.tsx] Final event: sessionToUpdate.id not found in sessions!", sessionToUpdate.id);
                      return prev;
                    }
                    let matched = false;
                    const finalSession = {
                      ...currentSess,
                      messages: currentSess.messages.map((m) => {
                        if (m.id === initialAiMsg.id) {
                          matched = true;
                          return {
                            ...m,
                            text: eventData.text,
                            finalSynthesis: eventData.finalSynthesis,
                            searchImages: eventData.searchImages,
                            searchSources: eventData.searchSources,
                            isSimulatingSearch: true,
                          };
                        }
                        return m;
                      }),
                    };
                    console.log(`[App.tsx] Final event applied. Matched initialAiMsg.id (${initialAiMsg.id}):`, matched);
                    isDirtyRef.current = true;
                    triggerDebouncedSave(finalSession);
                    return prev.map((s) => s.id === sessionToUpdate.id ? finalSession : s);
                  });
                }
              } catch (e) {
                console.error("Erro ao analisar linha SSE:", cleanedLine, e);
              }
            }
          }
          setIsThinking(false);
          setSessions((prev) => {
            const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
            if (!currentSess) return prev;
            return prev.map((s) => {
              if (s.id !== sessionToUpdate.id) return s;
              let changed = false;
              const updatedMsgs = s.messages.map((m) => {
                if (m.id === initialAiMsg.id && m.isSimulatingSearch && !m.finalSynthesis) {
                   changed = true;
                   return {
                     ...m,
                     isSimulatingSearch: false,
                     text: m.text || "⚠️ O assistente parou de responder inesperadamente.",
                   };
                }
                return m;
              });
              if (!changed) return s;
              return { ...s, messages: updatedMsgs };
            });
          });
          if (!isSearchActiveRef.current) {
            sendCompletionNotification();
          }
        })
        .catch((err) => {
          setIsThinking(false);
          sendCompletionNotification();
          if (err.name === 'AbortError') {
            console.log('Request was aborted');
            setSessions((prev) => {
              const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
              if (!currentSess) return prev;
              const finalSession = {
                ...currentSess,
                messages: currentSess.messages.map((m) =>
                  m.id === initialAiMsg.id
                    ? {
                        ...m,
                        text: "Você cancelou essa resposta",
                        finalSynthesis: "Você cancelou essa resposta",
                        isSimulatingSearch: false,
                        searchIntro: undefined,
                      }
                    : m
                ),
              };
              isDirtyRef.current = true;
              triggerDebouncedSave(finalSession);
              return prev.map((s) => s.id === sessionToUpdate.id ? finalSession : s);
            });
            return;
          }
          console.error("Erro na requisição de busca:", err);
          setSessions((prev) => {
            const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
            if (!currentSess) return prev;
            return prev.map((s) => {
              if (s.id !== sessionToUpdate.id) return s;
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === initialAiMsg.id
                    ? {
                        ...m,
                        text: `⚠️ **Ocorreu um erro ao obter resposta do assistente:** ${err.message || err}`,
                        isSimulatingSearch: false,
                        searchIntro: "Erro na pesquisa.",
                      }
                    : m
                ),
              };
            });
          });
        });
  };

  // Turn off search simulation once it completes and save session
  const handleSearchSimulationComplete = (messageId: string) => {
    setSessions((prev) => {
      const activeSess = prev.find((s) => s.id === activeSessionId);
      if (!activeSess) return prev;

      const updatedMsgs = activeSess.messages.map((m) =>
        m.id === messageId ? { ...m, isSimulatingSearch: false } : m
      );

      const finalSession = {
        ...activeSess,
        messages: updatedMsgs,
      };

      isDirtyRef.current = true;
      triggerDebouncedSave(finalSession);

      return prev.map((s) => s.id === activeSessionId ? finalSession : s);
    });
    sendCompletionNotification();
  };

  const handleEditMessage = async (msgId: string, newText: string) => {
    if (!activeSessionId) return;
    handleCancelGeneration();
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (!currentSession) return;
    const idx = currentSession.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const overrideMessages = currentSession.messages.slice(0, idx);
    await handleSendMessage(newText, false, overrideMessages);
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Suggestion pill click triggers immediate interactive query flow
  const handleSuggestionClick = (type: 'write' | 'code' | 'image' | 'analysis' | 'translate') => {
    let text = '';
    switch (type) {
      case 'write':
        text = `Escreva um e-mail formal e amigável parabenizando a equipe WSM AI pelo design compacto e alta performance do ${selectedModel}`;
        break;
      case 'code':
        text = 'Escreva uma função rápida em Javascript para ordenar uma lista de objetos';
        break;
      case 'image':
        text = 'Crie uma imagem realista de uma paisagem cyberpunk futurista roxa';
        break;
      case 'analysis':
        text = `Faça uma análise rápida do desempenho do ${selectedModel}`;
        break;
      case 'translate':
        text = 'Traduz a frase: "The speed and intelligence of this new model is incredible."';
        break;
    }
    handleSendMessage(text, false);
  };

  // Render authentic loading screen
  if (authLoading) {
    return (
      <div id="wsm-loading-screen" className="flex h-screen w-screen flex-col items-center justify-center bg-[#fcfbfa] select-none dot-grid">
        <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#5c53e5] rounded-xl flex items-center justify-center shadow-md animate-spin mb-4">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            className="w-6 h-6 text-white"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <p className="text-[13px] text-gray-400 font-semibold tracking-wide animate-pulse">
          Inicializando WSM AI Hub...
        </p>
      </div>
    );
  }

  // If no user is authenticated, force them to Login
  if (!currentUser) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#faf9f6] text-gray-800 font-sans overflow-hidden">
      {/* Sidebar Area */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        onToggleImagesView={handleToggleImagesView}
        isImagesView={isImagesView}
        userEmail={currentUser.email}
        userName={currentUser.displayName}
        onSignOut={handleSignOut}
      />

      {/* Main View Area (Responsive) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {isImagesView ? (
          <ImagesGallery onBackToHome={handleNewChat} />
        ) : activeSession ? (
          <ChatWindow
            key={activeSession.id}
            messages={activeSession.messages}
            title={activeSession.title}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onBackToHome={handleNewChat}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            onSearchSimulationComplete={handleSearchSimulationComplete}
            onCancelGeneration={handleCancelGeneration}
            onEditMessage={handleEditMessage}
          />
        ) : (
          <MainHome
            onSendMessage={handleSendMessage}
            onSuggestionClick={handleSuggestionClick}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        )}
      </div>
      
      {showEvaluations && (
        <EvaluationDashboard onClose={() => setShowEvaluations(false)} />
      )}
    </div>
  );
}
