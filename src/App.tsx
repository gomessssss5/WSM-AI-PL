import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import SearchModal from './components/SearchModal';
import MainHome from './components/MainHome';
import ChatWindow from './components/ChatWindow';
import ImagesGallery from './components/ImagesGallery';
import Translator from './components/Translator';
import ToolsDashboard from './components/ToolsDashboard';
import Login from './components/Login';
import { auth, onAuthStateChanged, signOut, User, getRedirectResult } from './lib/firebase';
import { subscribeSessions, saveSession, deleteSessionFromDb, subscribeDrafts, saveDraft, deleteDraft, subscribeUserProfile, dismissNewsCardForUser } from './lib/chatService';
import { ChatSession, Message, Draft, ScheduledTask, TaskExecution } from './types';
import { Sparkles, Trash2 } from 'lucide-react';
import ScheduledTasksDashboard from './components/ScheduledTasksDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminAuthModal from './components/AdminAuthModal';
import BenchmarkPage from './components/BenchmarkPage';
import { Skill, subscribeSkills, saveSkill, deleteSkillFromDb } from './lib/skills';
import { subscribeScheduledTasks, subscribeTaskExecutions, saveScheduledTask, deleteScheduledTask, saveTaskExecution, calculateNextRunAt } from './lib/scheduledTasks';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isImagesView, setIsImagesView] = useState(false);
  const [isToolsView, setIsToolsView] = useState(false);
  const [isScheduledTasksView, setIsScheduledTasksView] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [taskExecutions, setTaskExecutions] = useState<TaskExecution[]>([]);
  const [isTranslatorMode, setIsTranslatorMode] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Listen to User Skills from Firestore
  useEffect(() => {
    if (!currentUser) {
      setSkills([]);
      return;
    }

    const unsubscribeSkills = subscribeSkills(currentUser.uid, async (loadedSkills) => {
      setSkills(loadedSkills);

      // Auto-seed the official 'web-html' skill if it doesn't exist
      const hasWebHtml = loadedSkills.some(s => s.id === 'web-html' || s.name.toLowerCase() === 'web-html');
      
      const skillContent = `# Web Moderno 2026 — v2 (Skill de Geração de Sites HTML/CSS)

Você é um engenheiro front-end sênior especializado em interfaces de altíssima fidelidade visual. Cada entrega deve parecer um produto de uma agência premium, não um template genérico gerado por IA.

Regra de ouro: **toda instrução abaixo é testável**. Antes de entregar, rode o checklist da seção 8. Se qualquer item falhar, corrija antes de responder — não entregue nada que reprove no próprio checklist.

---

## 1. Completude é inegociável

- Entregue o site **inteiro em um único arquivo**, com todas as seções que o pedido implica. Se o usuário pedir "site de restaurante", o entregável mínimo é: Header fixo, Hero, Sobre/História, Cardápio completo (mín. 8 itens reais com preço, descrição e imagem), Depoimentos, Localização/Contato, Footer.
- Proibido: \`href="#"\` sem função, botões que não fazem nada, seções "Em breve", texto placeholder tipo "Lorem ipsum" ou "Título aqui".
- Todo botão/link deve ter uma das três coisas: rolagem suave até uma âncora real, alternância de estado via JS (modal, tab, accordion) ou navegação funcional dentro do mesmo arquivo.
- Formulários (contato, newsletter) precisam de validação real em JS (campos obrigatórios, formato de e-mail) e um estado de feedback visual (sucesso/erro), mesmo sem backend.

## 2. Stack técnico fixo (não decida isso a cada vez)

- **CSS**: Tailwind via CDN (\`<script src="https://cdn.tailwindcss.com">\`) configurado inline com \`tailwind.config\` para cores customizadas e fontes.
- **Ícones**: Lucide Icons (\`<script src="https://unpkg.com/lucide@latest"></script>\` + \`lucide.createIcons()\`) — nunca emojis como ícone de UI.
- **Fontes**: Google Fonts via \`<link>\`, sempre 2 famílias no máximo (uma de display, uma de texto corrido).
- **Animações de scroll**: Intersection Observer nativo em JS puro — não dependa de bibliotecas externas pesadas (GSAP, AOS) a menos que o usuário peça algo mais elaborado.
- **Mapas**: Leaflet.js + OpenStreetMap tiles. Nunca \`<iframe>\` do Google Maps.

## 3. Imagens (corrige o principal ponto de falha)

\`source.unsplash.com/random\` está descontinuado e retorna erro com frequência — **não use**. Regras:

- Use URLs diretas e estáveis do formato \`https://images.unsplash.com/photo-XXXXXXXXXXXXX-XXXXXXXXXXXX?w=800&q=80\`, escolhendo IDs reais e coerentes com o tema (comida, arquitetura, pessoas, tecnologia conforme o caso).
- Alternativa 100% confiável para placeholder neutro: \`https://picsum.photos/800/600\` (ou \`picsum.photos/seed/{palavra-chave}/800/600\` para "aleatoriedade" consistente e reproduzível).
- Sempre defina \`loading="lazy"\` em imagens fora da primeira dobra, e um \`alt\` descritivo (nunca vazio).
- Nunca \`background-color: gray\` como substituto de imagem — se não houver imagem confiável, use um gradiente ilustrativo com um ícone Lucide grande centralizado.

## 4. Sistema de design — decisões pré-tomadas, não sugestões

Pare de "escolher uma cor de destaque" no vácuo. Use um destes 4 sistemas prontos e escolha o mais coerente com o setor do site (não invente um quinto):

| Sistema | Base | Destaque | Uso típico |
|---|---|---|---|
| Slate/Cobalto | \`#0c0a09\`, \`#fafaf9\` | \`#2563eb\` | SaaS, tech, dashboards |
| Cream/Esmeralda | \`#faf9f6\`, \`#1c1917\` | \`#10b981\` | Wellness, sustentabilidade, food |
| Ardósia/Âmbar | \`#09090b\`, \`#f4f4f5\` | \`#f59e0b\` | Restaurantes, hospitalidade |
| Off-white/Violeta | \`#f8f7ff\`, \`#18181b\` | \`#7c3aed\` | Portfólio criativo, design |

Regras fixas de aplicação:
- Cor de destaque em no **máximo 10%** da área visual total (CTAs, badges, ícones-chave, bordas ativas). Se aparecer em mais de 3 componentes por seção, está exagerado.
- Tipografia: título de display em \`font-extrabold tracking-tight\`, tamanhos \`text-4xl\` a \`text-7xl\` conforme hierarquia; corpo de texto sempre \`text-base\` ou \`text-lg\`, nunca abaixo de 15px efetivos.
- Espaçamento vertical entre seções: \`py-20 md:py-32\`, nunca menos — sites amadores têm seções coladas.
- Cantos: \`rounded-2xl\` para cards, \`rounded-full\` para botões pill, \`rounded-xl\` para inputs.
- Glassmorphism **apenas** em headers fixos e modais — não em cards de conteúdo comum, senão vira ruído visual.

## 5. Grid e layout

- Bento grid (\`grid-cols-1 md:grid-cols-3\` com \`col-span\`/\`row-span\` variados) para seções de features/serviços com 4 a 6 itens.
- Container padrão: \`w-full max-w-7xl mx-auto px-4 md:px-8\`.
- Nunca mais de 4 colunas em desktop, nunca menos de 1 em mobile — teste mentalmente em 375px de largura antes de fechar o layout.

## 6. Micro-interações (padrão obrigatório, não opcional)

Aplique este conjunto em **todo** elemento clicável, sem exceção:
\`\`\`
transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer
\`\`\`
- Estados de foco visíveis (\`focus:ring-2 focus:ring-offset-2\`) — acessibilidade não é opcional.
- Scroll reveal: elementos entram com \`opacity-0 translate-y-4\` → \`opacity-100 translate-y-0\` via Intersection Observer, transição de 600-800ms.
- Nunca anime \`width\`/\`height\` diretamente (jank) — anime \`transform\` e \`opacity\`.

## 7. HTML semântico e SEO básico

- \`<header>\`, \`<nav>\`, \`<main>\`, \`<section id="...">\`, \`<article>\`, \`<footer>\` sempre presentes e corretos.
- \`<head>\` completo: \`<title>\`, \`<meta name="description">\`, viewport, favicon (pode ser emoji via data URI se não houver arquivo).
- Um único \`<h1>\` por página, hierarquia de headings sem pular níveis.
- Contraste de texto mínimo AA (não usar texto \`text-white/40\` sobre fundo claro).

## 8. Checklist final — rode antes de responder

Marque mentalmente cada item; se algum falhar, corrija e só então entregue:

- [ ] Nenhum \`href="#"\` sem função real
- [ ] Nenhuma imagem usando \`source.unsplash.com\`
- [ ] Todas as imagens têm \`alt\` e \`loading="lazy"\` quando aplicável
- [ ] Cor de destaque não domina mais de ~10% da tela
- [ ] Todas as seções esperadas para esse tipo de site estão presentes
- [ ] Formulário (se houver) tem validação e feedback visual
- [ ] Testado mentalmente em largura mobile (375px)
- [ ] Único \`<h1>\`, headings em ordem
- [ ] Todo botão/card tem estado de hover e foco

## 9. O que NÃO fazer (anti-padrões que derrubam a nota)

- Não gerar "esqueleto" pedindo para o usuário completar depois.
- Não usar mais de 2 cores de destaque na mesma página.
- Não empilhar glassmorphism + gradiente + sombra pesada no mesmo elemento (poluição visual).
- Não usar \`alert()\`/\`confirm()\` do navegador para feedback de UI — sempre um componente visual.
- Não deixar \`console.log\` de debug no código final.`;

      const existingWebHtml = loadedSkills.find(s => s.id === 'web-html' || s.name.toLowerCase() === 'web-html');
      const needsUpdate = existingWebHtml && (!existingWebHtml.content.includes("Web Moderno 2026 — v2") || existingWebHtml.description.length > 100);

      if (!hasWebHtml || needsUpdate) {
        console.log("Seeding/Updating default official 'web-html' skill for user...");
        const defaultWebHtml: Skill = {
          id: existingWebHtml ? existingWebHtml.id : 'web-html',
          name: 'web-html',
          description: 'Gera sites e páginas HTML/CSS de altíssima fidelidade com Tailwind e Lucide.',
          content: skillContent
        };
        try {
          await saveSkill(currentUser.uid, defaultWebHtml);
        } catch (e) {
          console.error("Error seeding default web-html skill:", e);
        }
      }
    });

    return () => unsubscribeSkills();
  }, [currentUser]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('wsm_selected_model');
    return saved || 'WSM 1.6 Flash';
  });

  const [reasoningLevel, setReasoningLevel] = useState<string>(() => {
    const saved = localStorage.getItem('wsm_reasoning_level');
    return saved || 'Mínimo';
  });

  useEffect(() => {
    localStorage.setItem('wsm_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('wsm_reasoning_level', reasoningLevel);
  }, [reasoningLevel]);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(true); // Default to true on initial load (only applies to mobile)
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  // Keep references to activeSession and dirty state for event listeners
  const isDirtyRef = useRef<boolean>(false);
  const activeSessionRef = useRef<ChatSession | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<any>(null);
  const currentUserRef = useRef<User | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isExplicitCancelRef = useRef<boolean>(false);
  const isSearchActiveRef = useRef<boolean>(false);
  const executingTasksRef = useRef<Set<string>>(new Set());

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

  // Sync sessions reference
  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

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
      setUserProfile(null);
      setIsProfileLoaded(false);
      return;
    }

    const unsubscribeSessions = subscribeSessions(currentUser.uid, (loadedSessions) => {
      setSessions((prevSessions) => {
        const currentActiveId = activeSessionIdRef.current;
        const activeLocal = prevSessions.find((s) => s.id === currentActiveId);
        const isStreamingOrSimulating = activeLocal?.messages.some((m) => m.isSimulatingSearch);
        const isLocalActivePreserved = !!activeLocal;
        const isActiveLocalDirtyOrPreserved = activeLocal && (isDirtyRef.current || isStreamingOrSimulating || isThinking);
        const isActiveInLoaded = loadedSessions.some((loaded) => loaded.id === currentActiveId);

        const updatedLoaded = loadedSessions.map((loaded) => {
          if (loaded.id === currentActiveId && activeLocal && isActiveLocalDirtyOrPreserved) {
            return {
              ...loaded,
              messages: activeLocal.messages,
              title: activeLocal.title
            };
          }
          return loaded;
        });

        const tempSessions = prevSessions.filter((s) => s.isTemporary);

        if (isActiveLocalDirtyOrPreserved && !isActiveInLoaded && activeLocal && !activeLocal.isTemporary) {
          return [...tempSessions, activeLocal, ...updatedLoaded];
        }
        return [...tempSessions, ...updatedLoaded];
      });
    });

    const unsubscribeDrafts = subscribeDrafts(currentUser.uid, (loadedDrafts) => {
      setDrafts(loadedDrafts);
    });

    const unsubscribeTasks = subscribeScheduledTasks(currentUser.uid, (loadedTasks) => {
      setScheduledTasks(loadedTasks);
    });

    const unsubscribeExecutions = subscribeTaskExecutions(currentUser.uid, (loadedExecutions) => {
      setTaskExecutions(loadedExecutions);
    });

    const unsubscribeUserProfile = subscribeUserProfile(currentUser.uid, (loadedProfile) => {
      setUserProfile(loadedProfile);
      setIsProfileLoaded(true);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeDrafts();
      unsubscribeTasks();
      unsubscribeExecutions();
      unsubscribeUserProfile();
    };
  }, [currentUser, activeSessionId, isThinking]);

  // Persists the specified session directly to Firestore and clears the active save timeout
  const persistSession = async (session: ChatSession) => {
    if (session.isTemporary) return;
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

  // Triggers a debounced save with configurable delay (defaults to 8 seconds)
  const triggerDebouncedSave = (session?: ChatSession, delayMs = 8000) => {
    const targetSessionId = session?.id || activeSessionIdRef.current;
    if (!targetSessionId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Always get the absolute latest state of the target session to avoid saving stale snapshot closures
      const latestSession = sessionsRef.current.find(s => s.id === targetSessionId);
      if (latestSession && !latestSession.isTemporary) {
        persistSession(latestSession);
      }
    }, delayMs);
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

  // Scheduled Tasks Runner
  useEffect(() => {
    if (!currentUser) return;

    const runScheduledTasks = () => {
      const now = new Date();
      scheduledTasks.forEach(async (task) => {
        // Safe time comparison
        if (task.isActive && task.nextRunAt.getTime() <= now.getTime()) {
          // Check if already executing to prevent double execution
          if (executingTasksRef.current.has(task.id)) {
            return;
          }
          executingTasksRef.current.add(task.id);
          console.log(`Running scheduled task: ${task.title}`);
          
          // Calculate next run immediately to prevent double execution
          let nextRun = calculateNextRunAt(
            task.scheduleType,
            task.time,
            task.scheduleType === 'once' ? task.date : undefined,
            task.scheduleType === 'weekly' ? task.daysOfWeek : undefined,
            task.scheduleType === 'monthly' ? task.dayOfMonth : undefined,
            new Date(task.nextRunAt.getTime() + 1000) // start slightly after current scheduled time
          );
          
          if (task.scheduleType === 'once') {
            task.isActive = false; // 'once'
          }

          task.lastRunAt = now;
          task.nextRunAt = nextRun;
          
          try {
            // Save task state right away
            await saveScheduledTask(currentUser.uid, task);

            // Execute task
            const newSessionId = crypto.randomUUID();
            const newSession: ChatSession = {
              id: newSessionId,
              title: task.title,
              timestamp: now,
              category: 'general',
              messages: [{
                id: crypto.randomUUID(),
                sender: 'user',
                text: task.prompt,
                timestamp: now
              }],
              isUnread: true,
              isScheduled: true
            };

            // Save session first
            await saveSession(currentUser.uid, newSession);
            
            // Also update React state immediately so it's instantly visible in the sidebar with the blue dot
            setSessions((prev) => {
              const exists = prev.some(s => s.id === newSession.id);
              if (exists) return prev;
              return [newSession, ...prev];
            });
            
            // Mark execution
            await saveTaskExecution(currentUser.uid, {
              id: crypto.randomUUID(),
              taskId: task.id,
              taskTitle: task.title,
              executedAt: now,
              sessionId: newSessionId,
              status: 'success'
            });

            // Now call the AI to process it (similar to handleSendMessage)
            fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: task.prompt,
                isSearchEnabled: true,
                model: selectedModel,
                skills: skills,
                history: []
              }),
            })
            .then(async (res) => {
              let aiText = "";
              let aiFinalSynthesis = "";
              let aiSearchSources: any[] = [];
              let aiSearchImages: any[] = [];
              let aiSearchSteps: any[] = [];

              if (!res.ok) {
                aiText = `⚠️ **Erro ao executar a tarefa agendada:** ${res.statusText} (Código: ${res.status})`;
              } else {
                const contentType = res.headers.get("content-type") || "";
                if (!contentType.includes("text/event-stream")) {
                  const data = await res.json();
                  aiText = data.text || data.error || "Nenhuma resposta gerada.";
                  aiFinalSynthesis = data.text || data.finalSynthesis || "";
                  aiSearchSources = data.searchSources || [];
                  aiSearchImages = data.searchImages || [];
                } else {
                  if (!res.body) throw new Error("No response body");
                  const reader = res.body.getReader();
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
                        const data = JSON.parse(cleanedLine.substring(6));
                        if (data.type === "plan") {
                          if (data.searchSteps) {
                            aiSearchSteps = data.searchSteps;
                          }
                        } else if (data.type === "step_complete") {
                          if (aiSearchSteps[data.index]) {
                            aiSearchSteps[data.index].sources = data.sources;
                            aiSearchSteps[data.index].isCompleted = true;
                          }
                        } else if (data.type === "chunk" && data.text) {
                          aiText += data.text;
                        } else if (data.type === "final") {
                          if (data.text) {
                            aiText = data.text;
                          }
                          if (data.finalSynthesis) {
                            aiFinalSynthesis = data.finalSynthesis;
                          }
                          if (data.searchSources) {
                            aiSearchSources = data.searchSources;
                          }
                          if (data.searchImages) {
                            aiSearchImages = data.searchImages;
                          }
                        } else if (data.text) {
                          aiText += data.text;
                        } else if (data.finalSynthesis) {
                          aiFinalSynthesis = data.finalSynthesis;
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
              
              if (!aiText && !aiFinalSynthesis) {
                aiText = "Tarefa agendada processada, mas nenhuma resposta de texto foi retornada.";
              }

              // Update session with AI response
              const finalSession: ChatSession = {
                ...newSession,
                messages: [
                  ...newSession.messages,
                  {
                    id: crypto.randomUUID(),
                    sender: 'ai',
                    text: aiText,
                    finalSynthesis: aiFinalSynthesis,
                    timestamp: new Date(),
                    isSearchMessage: true,
                    searchSources: aiSearchSources,
                    searchImages: aiSearchImages,
                    searchSteps: aiSearchSteps,
                    isSimulatingSearch: false
                  }
                ]
              };
              
              await saveSession(currentUser.uid, finalSession);

              // Update React state immediately with AI response
              setSessions((prev) => {
                return prev.map(s => s.id === finalSession.id ? finalSession : s);
              });

              // Send browser notification if not focused
              if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  const notificationTitle = `Tarefa executada: ${task.title}`;
                  new Notification(notificationTitle, {
                    body: aiText.substring(0, 100) + "...",
                    icon: '/favicon.ico'
                  });
                } catch (e) {
                  console.error("Error showing execution notification:", e);
                }
              }
            })
            .catch(async (err) => {
              console.error("Scheduled task execution failed in fetch", err);
              const errorSession: ChatSession = {
                ...newSession,
                messages: [
                  ...newSession.messages,
                  {
                    id: crypto.randomUUID(),
                    sender: 'ai',
                    text: `⚠️ **Erro de execução:** ${err.message || String(err)}`,
                    timestamp: new Date()
                  }
                ]
              };
              await saveSession(currentUser.uid, errorSession);
              setSessions((prev) => prev.map(s => s.id === errorSession.id ? errorSession : s));
            })
            .finally(() => {
              // Remove from running set after execution is fully completed
              executingTasksRef.current.delete(task.id);
            });

          } catch (err) {
            console.error("Failed to start scheduled task execution:", err);
            executingTasksRef.current.delete(task.id);
          }
        }
      });
    };

    const intervalId = setInterval(runScheduledTasks, 15000); // Check every 15 seconds for more responsive execution
    
    return () => clearInterval(intervalId);
  }, [currentUser, scheduledTasks, selectedModel, skills]);

  // Handle switching to a specific session
  const handleSelectSession = (id: string | null) => {
    if (activeSessionRef.current && isDirtyRef.current) {
      persistSession(activeSessionRef.current);
    }

    // Clear all temporary sessions except the one we might be selecting (usually none)
    setSessions((prev) => prev.filter((s) => !s.isTemporary || s.id === id));
    
    if (id && currentUser) {
      const selectedSession = sessions.find(s => s.id === id);
      if (selectedSession && selectedSession.isUnread) {
        saveSession(currentUser.uid, { ...selectedSession, isUnread: false });
        setSessions((prev) => prev.map(s => s.id === id ? { ...s, isUnread: false } : s));
      }
    }

    setIsImagesView(false);
    setIsToolsView(false);
    setIsScheduledTasksView(false);
    setIsTranslatorMode(false);
    setActiveSessionId(id);
  };

  // Create a brand new clean chat session
  const handleNewChat = () => {
    if (activeSessionRef.current && isDirtyRef.current) {
      persistSession(activeSessionRef.current);
    }
    // Discard all temporary chats
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(false);
    setIsToolsView(false);
    setIsScheduledTasksView(false);
    setIsTranslatorMode(false);
    setActiveSessionId(null);
  };

  // Create a brand new temporary chat session
  const handleNewTemporaryChat = () => {
    if (activeSessionRef.current && isDirtyRef.current) {
      persistSession(activeSessionRef.current);
    }
    
    const tempId = `temp-session-${Date.now()}`;
    const newSession: ChatSession = {
      id: tempId,
      title: "Chat temporário",
      timestamp: new Date(),
      messages: [],
      category: 'general',
      isTemporary: true
    };
    
    // Set sessions with the new temporary session, discarding any old temporary sessions
    setSessions((prev) => [newSession, ...prev.filter((s) => !s.isTemporary)]);
    activeSessionIdRef.current = tempId;
    setActiveSessionId(tempId);
    
    setIsImagesView(false);
    setIsToolsView(false);
    setIsScheduledTasksView(false);
    setIsTranslatorMode(false);
    setIsMobileHistoryOpen(false);
  };

  // Toggle images gallery view
  const handleToggleImagesView = () => {
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(!isImagesView);
    setIsToolsView(false);
    setIsScheduledTasksView(false);
    setIsTranslatorMode(false);
  };
  
  // Translator Handler
  const handleOpenTranslator = () => {
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(false);
    setIsToolsView(false);
    setIsScheduledTasksView(false);
    setActiveSessionId(null);
    setIsTranslatorMode(true);
  };

  const handleOpenToolsView = () => {
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(false);
    setIsTranslatorMode(false);
    setActiveSessionId(null);
    setIsScheduledTasksView(false);
    setIsToolsView(true);
  };

  const handleOpenTasksView = () => {
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(false);
    setIsTranslatorMode(false);
    setActiveSessionId(null);
    setIsToolsView(false);
    setIsScheduledTasksView(true);
  };

  // Delete an existing session from Firestore
  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;
    setSessionToDeleteId(id);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDeleteId || !currentUser) return;
    const isTemp = sessionToDeleteId.startsWith('temp-session-') || sessions.find(s => s.id === sessionToDeleteId)?.isTemporary;
    try {
      if (activeSessionId === sessionToDeleteId) {
        isDirtyRef.current = false;
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
      }
      if (isTemp) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionToDeleteId));
      } else {
        await deleteSessionFromDb(currentUser.uid, sessionToDeleteId);
      }
      if (activeSessionId === sessionToDeleteId) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error('Erro ao excluir sessão:', err);
    } finally {
      setSessionToDeleteId(null);
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



  const checkAndApplySkillUpdate = async (aiText: string) => {
    if (!currentUser) return;

    // Matches tags like [Criando Skill: user] or [Editando Skill: user] or [Excluindo Skill: user] (case-insensitive)
    const skillActionRegex = /\[(Criando|Editando|Excluindo) Skill:\s*(.*?)\]/gi;
    const match = skillActionRegex.exec(aiText);
    if (!match) return;

    const action = match[1].toLowerCase(); // 'criando', 'editando', 'excluindo'
    const rawSkillName = match[2].trim();
    // Clean trailing bracket if present
    const skillName = rawSkillName.replace(/\]/g, '').trim();
    const skillId = skillName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    let skillContent = "";
    // Try to extract content inside <wsm_skill_content>, <skill_content>, <skill>, <[skillId]>, or <[skillName]>
    const tags = ['wsm_skill_content', 'skill_content', 'skill', skillId, skillName.toLowerCase()];
    for (const tag of tags) {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, 'i');
      const contentMatch = regex.exec(aiText);
      if (contentMatch) {
        skillContent = contentMatch[1].trim();
        break;
      }
    }

    if (action !== 'excluindo' && !skillContent) {
      console.log(`[skills-format-error] Skill "${skillName}" is missing explicit content tags. Injecting format error.`);
      
      // Update latest AI message text to append the friendly message
      setSessions((prev) => {
        const currentSess = prev.find((s) => s.id === activeSessionIdRef.current);
        if (!currentSess) return prev;
        return prev.map((s) => {
          if (s.id !== activeSessionIdRef.current) return s;
          return {
            ...s,
            messages: s.messages.map((m, idx) => {
              if (idx === s.messages.length - 1 && m.sender === 'ai') {
                return {
                  ...m,
                  text: m.text + `\n\n*(Ops! Formato de skill incorreto.)*`,
                  finalSynthesis: (m.finalSynthesis || m.text) + `\n\n*(Ops! Formato de skill incorreto.)*`,
                };
              }
              return m;
            }),
          };
        });
      });

      const formatErrorMessage = `[SISTEMA: ERRO DE CONTEÚDO] Você tentou realizar a ação [${match[1]} Skill: ${skillName}], mas não forneceu o conteúdo útil da skill envelopado em tags de conteúdo válidas como <wsm_skill_content>...</wsm_skill_content>.
Por favor, reenvie a sua resposta incluindo o conteúdo estruturado e limpo (Markdown, tópicos, etc.) estritamente dentro da tag:
<wsm_skill_content>
(apenas dados úteis estruturados aqui, como o perfil do usuário ou notas úteis, sem conversas normais de chat ou raciocínio)
</wsm_skill_content>
Sua resposta normal de chat deve ficar fora dessa tag.`;

      setTimeout(() => {
        handleSendMessage(formatErrorMessage, isSearchActiveRef.current, undefined, undefined, true);
      }, 1200);
      return;
    }

    if (action === 'criando') {
      // Check for conflict: does this skill already exist?
      const existingSkill = skills.find(s => s.id === skillId || s.name.toLowerCase() === skillName.toLowerCase());
      if (existingSkill) {
        console.log(`[skills-conflict] Skill "${skillName}" already exists. Injecting conflict message.`);
        
        // Update latest AI message text to append the friendly message
        setSessions((prev) => {
          const currentSess = prev.find((s) => s.id === activeSessionIdRef.current);
          if (!currentSess) return prev;
          return prev.map((s) => {
            if (s.id !== activeSessionIdRef.current) return s;
            return {
              ...s,
              messages: s.messages.map((m, idx) => {
                if (idx === s.messages.length - 1 && m.sender === 'ai') {
                  const cleanedText = m.text.replace(/\[Criando Skill:.*?\]/gi, '').trim();
                  return {
                    ...m,
                    text: cleanedText + `\n\nOps, essa skill já existe!`,
                    finalSynthesis: (m.finalSynthesis || cleanedText) + `\n\nOps, essa skill já existe!`,
                  };
                }
                return m;
              }),
            };
          });
        });

        // Auto-reply conflict system message (hidden from the user!)
        const conflictMessage = `[SISTEMA: ERRO DE CONFLITO] Você tentou criar a Skill "${skillName}", mas uma Skill com o mesmo nome já existe.
O conteúdo atual da Skill existente é:
\`\`\`markdown
${existingSkill.content}
\`\`\`

Por favor, se você quiser alterar o conteúdo desta Skill, utilize a tag [Editando Skill: ${skillName}] e forneça o conteúdo atualizado dentro da tag <wsm_skill_content>...</wsm_skill_content>. Se o seu objetivo era criar uma nova Skill com um nome diferente, escolha outro nome exclusivo e envie a tag adequada [Criando Skill: Novo Nome] com as devidas tags de conteúdo.
Apresente essa resposta e opções de forma amigável para o usuário.`;

        // Automatically trigger AI re-run carrying this conflict warning
        setTimeout(() => {
          handleSendMessage(conflictMessage, isSearchActiveRef.current, undefined, undefined, true);
        }, 1200);
        return;
      }

      // No conflict - save the new skill
      await saveSkill(currentUser.uid, {
        id: skillId,
        name: skillName,
        description: 'Skill personalizada criada pela IA',
        content: skillContent
      });
    } else if (action === 'editando') {
      await saveSkill(currentUser.uid, {
        id: skillId,
        name: skillName,
        description: 'Skill personalizada editada pela IA',
        content: skillContent
      });
    } else if (action === 'excluindo') {
      await deleteSkillFromDb(currentUser.uid, skillId);
    }
  };

  const checkAndApplySkillReading = async (aiText: string): Promise<boolean> => {
    if (!currentUser) return false;

    // Match [Lendo Skill: Nome da Skill] (case-insensitive)
    const lendoRegex = /\[Lendo Skill:\s*(.*?)\]/i;
    const match = lendoRegex.exec(aiText);
    if (!match) return false;

    const rawSkillName = match[1].trim();
    // Clean trailing bracket if present
    const skillName = rawSkillName.replace(/\]/g, '').trim();

    // Look up skill
    const skill = skills.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase() || s.id.toLowerCase() === skillName.toLowerCase()
    );

    if (skill) {
      console.log(`[skills-loading] Loading content of Skill "${skill.name}"...`);
      const systemMessage = `[SISTEMA: SKILL REQUISITADA] Você solicitou a leitura da Skill "${skill.name}". O conteúdo completo dela é:
<wsm_skill_content>
${skill.content}
</wsm_skill_content>

Por favor, prossiga e execute a solicitação do usuário utilizando os conhecimentos desta skill.`;

      setTimeout(() => {
        handleSendMessage(systemMessage, isSearchActiveRef.current, undefined, undefined, true);
      }, 1000);
      return true;
    } else {
      console.log(`[skills-loading-error] Skill "${skillName}" not found in current skills list.`);
      const listStr = skills.map(s => `- ${s.name}`).join("\n");
      const systemMessage = `[SISTEMA: ERRO DE SKILL] A skill "${skillName}" não foi encontrada na sua biblioteca.
As skills disponíveis no momento são:
${listStr || 'Nenhuma skill cadastrada.'}

Por favor, corrija o nome solicitado para a leitura ou crie a skill se necessário.`;

      setTimeout(() => {
        handleSendMessage(systemMessage, isSearchActiveRef.current, undefined, undefined, true);
      }, 1000);
      return true;
    }
  };

  // Main sendMessage routine (used by both MainHome input and ChatWindow input)
  const handleSendMessage = async (text: string, isSearchEnabled: boolean, overrideMessages?: Message[], attachments?: any[], isHidden?: boolean) => {
    if (!currentUser) return;

    if (text.trim().toUpperCase() === 'ADM') {
      setShowAdminAuth(true);
      return;
    }

    isSearchActiveRef.current = isSearchEnabled;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date(),
      attachments: attachments,
      isHidden: isHidden,
    };

    const currentActiveSessionId = activeSessionIdRef.current;
    let sessionToUpdate: ChatSession;

    if (!currentActiveSessionId) {
      // Create a brand new session locally first
      let titleText = text;
      if (!titleText && attachments && attachments.length > 0) {
        titleText = `Anexo: ${attachments[0].name}`;
      } else if (!titleText) {
        titleText = "Nova conversa";
      }
      const truncatedTitle = titleText.length > 28 ? `${titleText.substring(0, 28)}...` : titleText;
      const newId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: newId,
        title: truncatedTitle,
        timestamp: new Date(),
        messages: [userMsg],
        category: 'general',
        model: selectedModel,
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
      const currentSession = activeSessionRef.current || sessions.find((s) => s.id === currentActiveSessionId);
      if (!currentSession) {
        console.warn("[App.tsx] currentSession not found for active session ID:", currentActiveSessionId);
        return;
      }
      
      const isFirstMessage = currentSession.messages.length === 0;
      let titleText = currentSession.title;
      if (isFirstMessage) {
        let textForTitle = text;
        if (!textForTitle && attachments && attachments.length > 0) {
          textForTitle = `Anexo: ${attachments[0].name}`;
        } else if (!textForTitle) {
          textForTitle = "Chat temporário";
        }
        titleText = textForTitle.length > 28 ? `${textForTitle.substring(0, 28)}...` : textForTitle;
      }

      sessionToUpdate = {
        ...currentSession,
        title: titleText,
        messages: overrideMessages ? [...overrideMessages, userMsg] : [...currentSession.messages, userMsg],
      };
      
      // Update local state immediately for smooth UI transition
      setSessions((prev) => prev.map((s) => s.id === currentActiveSessionId ? sessionToUpdate : s));
      
      if (!currentSession.isTemporary) {
        isDirtyRef.current = true;
        triggerDebouncedSave(sessionToUpdate);
      }
    }

    // Real AI response fetch from Express backend
    setIsThinking(true);

    if (abortControllerRef.current) {
      isExplicitCancelRef.current = false;
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

      // Format current request text with attachments if present
      let requestText = text;
      if (!requestText && attachments && attachments.length > 0) {
        requestText = "Enviei arquivos em anexo.";
      }
      if (attachments && attachments.length > 0) {
        const fileList = attachments.map(att => `- [Anexo: ${att.name} (${att.type === 'image' ? 'Imagem' : att.type === 'video' ? 'Vídeo' : att.type === 'audio' ? 'Áudio' : 'Documento'}, ${(att.size / 1024).toFixed(1)} KB)]`).join('\n');
        requestText += `\n\n[Arquivos Anexados]\n${fileList}`;
      }

      // Add 45-second timeout to prevent eternal loading if the request hangs
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          console.warn("Request timed out after 45 seconds. Aborting.");
          abortControllerRef.current.abort();
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
                        text: `⚠️ **Tempo limite de conexão excedido.** O servidor não respondeu a tempo. Por favor, tente novamente utilizando o botão "Tentar novamente" abaixo.`,
                        isSimulatingSearch: false,
                        searchIntro: "Tempo limite excedido.",
                      }
                    : m
                ),
              };
            });
          });
        }
      }, 45000);

      fetch("/api/chat", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: requestText,
          isSearchEnabled,
          isTranslatorMode,
          model: sessionToUpdate.model || selectedModel,
          reasoningLevel: reasoningLevel,
          skills: skills,
          history: sessionToUpdate.messages.map(m => {
            let msgText = m.text || m.finalSynthesis || "";
            if (!msgText && m.sender === 'user' && m.attachments && m.attachments.length > 0) {
              msgText = "Enviei arquivos em anexo.";
            }
            if (m.sender === 'user' && m.attachments && m.attachments.length > 0) {
              const fileList = m.attachments.map(att => `- [Anexo: ${att.name} (${att.type === 'image' ? 'Imagem' : att.type === 'video' ? 'Vídeo' : att.type === 'audio' ? 'Áudio' : 'Documento'}, ${(att.size / 1024).toFixed(1)} KB)]`).join('\n');
              msgText += `\n\n[Arquivos Anexados]\n${fileList}`;
            }

            const parts: any[] = [{ text: msgText }];

            if (m.sender === 'user' && m.attachments && Array.isArray(m.attachments)) {
              m.attachments.forEach(att => {
                if (att.base64 && att.mimeType) {
                  parts.push({
                    inlineData: {
                      mimeType: att.mimeType,
                      data: att.base64
                    }
                  });
                }
              });
            }

            return {
              role: m.sender === 'user' ? 'user' : 'model',
              parts: parts
            };
          })
        }),
      })
        .then(async (res) => {
          clearTimeout(timeoutId);
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
              if (!currentSess.isTemporary) {
                isDirtyRef.current = true;
                triggerDebouncedSave(finalSession, 500);
              }
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
          let accumulatedFinalText = "";

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
                  if (eventData.type === "sync_text") {
                     accumulatedFinalText = eventData.text || "";
                  } else {
                     accumulatedFinalText += eventData.text || "";
                  }
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) return prev;
                    return prev.map((s) => {
                      if (s.id !== sessionToUpdate.id) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) => {
                          if (m.id === initialAiMsg.id) {
                            let newText = eventData.type === "sync_text" ? eventData.text : (m.text + eventData.text);
                            const lendoRegex = /\[Lendo Skill:\s*(.*?)\]/i;
                            const matchText = lendoRegex.exec(newText);
                            if (matchText) {
                               newText = newText.substring(0, matchText.index + matchText[0].length);
                            }
                            return {
                              ...m,
                              text: newText,
                              finalSynthesis: newText,
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
                  accumulatedFinalText = eventData.finalSynthesis || eventData.text || "";
                  
                  let textToSave = eventData.text || "";
                  let finalSynthesisToSave = eventData.finalSynthesis || "";
                  
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
                            text: textToSave,
                            finalSynthesis: finalSynthesisToSave,
                            searchImages: eventData.searchImages,
                            searchSources: eventData.searchSources,
                            isSimulatingSearch: m.isSearchMessage ? true : false,
                          };
                        }
                        return m;
                      }),
                    };
                    console.log(`[App.tsx] Final event applied. Matched initialAiMsg.id (${initialAiMsg.id}):`, matched);
                    if (!currentSess.isTemporary) {
                      isDirtyRef.current = true;
                      triggerDebouncedSave(finalSession, 500);
                    }
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
          
          if (accumulatedFinalText) {
             checkAndApplySkillReading(accumulatedFinalText).then((wasReading) => {
               if (!wasReading) {
                 checkAndApplySkillUpdate(accumulatedFinalText);
               }
             });
          }

          if (!isSearchActiveRef.current) {
            sendCompletionNotification();
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          setIsThinking(false);
          sendCompletionNotification();
          if (err.name === 'AbortError') {
            console.log('Request was aborted');
            setSessions((prev) => {
              const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
              if (!currentSess) return prev;
              const finalSession = {
                ...currentSess,
                messages: currentSess.messages.map((m) => {
                  if (m.id === initialAiMsg.id) {
                    return {
                      ...m,
                      text: isExplicitCancelRef.current ? "Você cancelou essa resposta" : m.text,
                      finalSynthesis: isExplicitCancelRef.current ? "Você cancelou essa resposta" : m.finalSynthesis,
                      isSimulatingSearch: false,
                      searchIntro: undefined,
                    };
                  }
                  return m;
                }),
              };
              if (!currentSess.isTemporary) {
                isDirtyRef.current = true;
                triggerDebouncedSave(finalSession, 500);
              }
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

      if (!activeSess.isTemporary) {
        isDirtyRef.current = true;
        triggerDebouncedSave(finalSession, 500);
      }

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
      isExplicitCancelRef.current = true;
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
  const isBenchmarkRoute = typeof window !== 'undefined' && (window.location.pathname === '/benchmark' || window.location.pathname === '/benchmark/');

  if (isBenchmarkRoute) {
    return <BenchmarkPage />;
  }

  if (authLoading) {
    return (
      <div id="wsm-loading-screen" className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#fcfbfa] select-none dot-grid">
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
    <div className="flex h-[100dvh] w-screen bg-[#faf9f6] text-gray-800 font-sans overflow-hidden">
      {/* Sidebar Area */}
      <Sidebar
        sessions={sessions.filter((s) => !s.isTemporary)}
        activeSessionId={isTranslatorMode ? null : activeSessionId}
        onSelectSession={(id) => { handleSelectSession(id); setIsMobileHistoryOpen(false); }}
        onDeleteSession={handleDeleteSession}
        onNewChat={() => { handleNewChat(); setIsMobileHistoryOpen(false); }}
        onToggleImagesView={() => { handleToggleImagesView(); setIsMobileHistoryOpen(false); }}
        isImagesView={isImagesView}
        userEmail={currentUser.email}
        userName={currentUser.displayName}
        onSignOut={handleSignOut}
        onOpenTools={() => { handleOpenToolsView(); setIsMobileHistoryOpen(false); }}
        onOpenTasks={() => { handleOpenTasksView(); setIsMobileHistoryOpen(false); }}
        isMobileHistoryOpen={isMobileHistoryOpen}
        onCloseMobileHistory={() => setIsMobileHistoryOpen(false)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
      />

      {/* Global Search Modal in Center of Screen */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        sessions={sessions.filter((s) => !s.isTemporary)}
        onSelectSession={(id) => { handleSelectSession(id); setIsMobileHistoryOpen(false); }}
        onNewChat={() => { handleNewChat(); setIsMobileHistoryOpen(false); }}
      />

      {/* Main View Area (Responsive) */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${isMobileHistoryOpen ? 'hidden md:flex' : 'flex'}`}>
        {isAdminView ? (
          <AdminDashboard 
            onBack={() => setIsAdminView(false)} 
            actualSessionsCount={sessions.filter((s) => !s.isTemporary).length}
          />
        ) : isTranslatorMode ? (
          <Translator 
            onOpenMobileHistory={() => setIsMobileHistoryOpen(true)}
            onBack={() => {
              setIsTranslatorMode(false);
              setIsToolsView(true);
            }}
          />
        ) : isToolsView ? (
          <ToolsDashboard
            onOpenTranslator={handleOpenTranslator}
          />
        ) : isScheduledTasksView ? (
          <ScheduledTasksDashboard
            tasks={scheduledTasks}
            executions={taskExecutions}
            sessions={sessions.filter((s) => !s.isTemporary)}
            onOpenMobileHistory={() => setIsMobileHistoryOpen(true)}
            onSaveTask={async (task) => {
              if (currentUser) {
                await saveScheduledTask(currentUser.uid, task);
              }
            }}
            onDeleteTask={async (taskId) => {
              if (currentUser) {
                await deleteScheduledTask(currentUser.uid, taskId);
              }
            }}
            onToggleTask={async (taskId, isActive) => {
              if (currentUser) {
                const task = scheduledTasks.find(t => t.id === taskId);
                if (task) {
                  await saveScheduledTask(currentUser.uid, { ...task, isActive });
                }
              }
            }}
            onOpenSession={(sessionId) => {
              handleSelectSession(sessionId);
            }}
          />
        ) : isImagesView ? (
          <ImagesGallery onBackToHome={() => { handleNewChat(); setIsMobileHistoryOpen(true); }} />
        ) : activeSession ? (
          <ChatWindow
            key={activeSession.id}
            messages={activeSession.messages}
            title={activeSession.title}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onBackToHome={() => { handleNewChat(); setIsMobileHistoryOpen(true); }}
            selectedModel={activeSession.model || selectedModel}
            setSelectedModel={setSelectedModel}
            reasoningLevel={reasoningLevel}
            setReasoningLevel={setReasoningLevel}
            onSearchSimulationComplete={handleSearchSimulationComplete}
            onCancelGeneration={handleCancelGeneration}
            onEditMessage={handleEditMessage}
            onDeleteSession={() => {
              if (activeSessionId) {
                handleDeleteSession(activeSessionId);
              }
            }}
            onOpenMobileHistory={() => setIsMobileHistoryOpen(true)}
            initialDraft={activeSessionId ? drafts[activeSessionId] : undefined}
            onSaveDraft={(draft) => { if (currentUser && activeSessionId) saveDraft(currentUser.uid, activeSessionId, draft) }}
            onDeleteDraft={() => { if (currentUser && activeSessionId) deleteDraft(currentUser.uid, activeSessionId) }}
            skills={skills}
            isTemporary={!!activeSession.isTemporary}
            onStartTemporaryChat={handleNewTemporaryChat}
          />
        ) : (
          <MainHome
            onSendMessage={handleSendMessage}
            onSuggestionClick={handleSuggestionClick}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            reasoningLevel={reasoningLevel}
            setReasoningLevel={setReasoningLevel}
            onOpenMobileHistory={() => setIsMobileHistoryOpen(true)}
            initialDraft={drafts['new_chat']}
            onSaveDraft={(draft) => currentUser && saveDraft(currentUser.uid, 'new_chat', draft)}
            onDeleteDraft={() => currentUser && deleteDraft(currentUser.uid, 'new_chat')}
            userProfile={userProfile}
            onDismissNewsCard={() => {
              if (currentUser) {
                dismissNewsCardForUser(currentUser.uid);
              }
            }}
            skills={skills}
            onStartTemporaryChat={handleNewTemporaryChat}
            isProfileLoading={!isProfileLoaded}
          />
        )}
      </div>
      
      {showAdminAuth && (
        <AdminAuthModal 
          onClose={() => setShowAdminAuth(false)}
          onSuccess={() => {
            setShowAdminAuth(false);
            setIsAdminView(true);
          }}
        />
      )}

      {sessionToDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#eae6e1] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100 text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-base font-bold text-gray-900">
                Excluir Conversa?
              </h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {sessionToDeleteId?.startsWith('temp-session-') || sessions.find(s => s.id === sessionToDeleteId)?.isTemporary ? (
                "Tem certeza que deseja encerrar e excluir este chat temporário? Todas as mensagens serão perdidas e não são salvas em nenhum servidor."
              ) : (
                "Tem certeza que deseja excluir esta conversa? Esta ação é irreversível e todas as mensagens serão apagadas permanentemente do servidor."
              )}
            </p>
            
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                onClick={() => setSessionToDeleteId(null)}
                className="px-4 py-2 bg-gray-50 border border-[#eae6e1] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all cursor-pointer active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-4 py-2 bg-red-500 border border-red-600 rounded-xl text-xs font-semibold text-white hover:bg-red-600 transition-all cursor-pointer active:scale-[0.98] shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
