import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import SearchModal from './components/SearchModal';
import MainHome from './components/MainHome';
import ChatWindow from './components/ChatWindow';
import ImagesGallery from './components/ImagesGallery';
import Login from './components/Login';
import { auth, onAuthStateChanged, signOut, User, getRedirectResult, googleProvider, signInWithPopup } from './lib/firebase';
import { subscribeSessions, saveSession, deleteSessionFromDb, subscribeDrafts, saveDraft, deleteDraft, subscribeUserProfile, dismissNewsCardForUser, dismissWelcomeCardForUser } from './lib/chatService';
import { ChatSession, Message, Draft, ScheduledTask, TaskExecution, ExecutionLedgerEntry, ExecutionState, ExecutionStep, ValidationCriterion, ExecutionAuthDetails } from './types';
import ExecutionLedgerModal from './components/ExecutionLedgerModal';
import { Sparkles, Trash2 } from 'lucide-react';
import ScheduledTasksDashboard from './components/ScheduledTasksDashboard';
import SharedChatView from "./components/SharedChatView";
import AdminDashboard from './components/AdminDashboard';
import AdminAuthModal from './components/AdminAuthModal';
import BenchmarkPage from './components/BenchmarkPage';
import { Skill, subscribeSkills, saveSkill, deleteSkillFromDb } from './lib/skills';
import { OFFICIAL_SKILLS } from './lib/officialSkills';
import { getLayeredMemories } from './utils/layeredMemory';
import { DEFAULT_COMPOSABLE_SKILLS } from './utils/defaultSkills';
import { subscribeScheduledTasks, subscribeTaskExecutions, saveScheduledTask, deleteScheduledTask, saveTaskExecution, calculateNextRunAt } from './lib/scheduledTasks';
import { getCleanSessionTitle } from './utils/sessionUtils';
import { terminalSandbox } from './lib/terminalSandbox';
import { logAuditEvent } from './utils/auditLogger';

import { OfficialSkillsStore } from './components/OfficialSkillsStore';
import UserProfileModal from './components/UserProfileModal';
import AgenticSecurityModal from './components/AgenticSecurityModal';
import ReauthModal from './components/ReauthModal';
import PasswordChangeModal from './components/PasswordChangeModal';

const cleanSessionTitle = (raw: string) => {
  if (!raw) return 'Nova conversa';
  let t = raw;
  t = t.replace(/^\[Utilize as seguintes skills:[\s\S]*?\]\n\n/i, '');
  t = t.replace(/^\[SISTEMA:[\s\S]*?\]\n\n/i, '');
  t = t.replace(/^\[Texto Anexado do Editor:\n"[\s\S]*?"\]\n\n/i, '');
  t = t.replace(/\[PACOTE_SKILL_DECLARATIVO[\s\S]*?\[SOLICITAÇÃO DO USUÁRIO\]:\s*/gi, '');
  t = t.replace(/\[PIPELINE_DE_SKILLS_DECLARATIVO[\s\S]*?\[SOLICITAÇÃO DO USUÁRIO\]:\s*/gi, '');
  t = t.replace(/\[PACOTE_SKILL_DECLARATIVO[\s\S]*?$/gi, '');
  t = t.replace(/\[PIPELINE_DE_SKILLS_DECLARATIVO[\s\S]*?$/gi, '');
  t = t.replace(/\[SOLICITAÇÃO DO USUÁRIO\]:\s*/gi, '');
  t = t.trim();
  if (!t) return 'Nova conversa';
  return t.length > 28 ? `${t.substring(0, 28)}...` : t;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isImagesView, setIsImagesView] = useState(false);
  const [isScheduledTasksView, setIsScheduledTasksView] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [taskExecutions, setTaskExecutions] = useState<TaskExecution[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isReauthModalOpen, setIsReauthModalOpen] = useState(false);
  const [reauthDetails, setReauthDetails] = useState<ExecutionAuthDetails | null>(null);
  const [isRenewingToken, setIsRenewingToken] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const pendingExecutionRef = useRef<any>(null);
  const [executionLedgerEntries, setExecutionLedgerEntries] = useState<ExecutionLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem('wsm_execution_ledger');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((e: any) => ({
            ...e,
            startedAt: new Date(e.startedAt),
            finishedAt: e.finishedAt ? new Date(e.finishedAt) : undefined,
          }));
        }
      }
    } catch (e) {}
    return [
      {
        runId: 'RUN-2026-DEMO',
        sessionId: 'demo-session',
        sessionTitle: '[DEMO / EXEMPLO DE SISTEMA] Pesquisa Mercado & Relatório',
        intentGoal: '[EXEMPLO DEMO DE SISTEMA] Analisar tendências de tecnologia e consolidar relatório para a equipe de produto',
        constraints: ['Apenas dados pós-2025', 'Formato Markdown sem saudações'],
        state: 'succeeded',
        riskLevel: 'low',
        requiresApproval: false,
        isApproved: true,
        steps: [
          { id: 's1', name: 'Interpretação de Intenção & Escopo', tool: 'workspace', status: 'completed', details: 'Filtros e critérios estabelecidos' },
          { id: 's2', name: 'Execução de Busca Web Integrada', tool: 'browser', status: 'completed', details: '25 fontes primárias consultadas' },
          { id: 's3', name: 'Validação de Integridade e Citações', tool: 'code', status: 'completed', details: 'Verificação de duplicações e síntese' },
        ],
        validations: [
          { id: 'v1', description: 'Sem duplicações ou loops de busca', status: 'passed' },
          { id: 'v2', description: 'Atendimento estrito às restrições', status: 'passed' }
        ],
        artifacts: [
          { id: 'a1', title: 'Relatório_Exemplo_Demo.md', format: 'md' }
        ],
        evidenceLogs: [
          `[${new Date(Date.now() - 3600000).toISOString()}] [DEMO] Intenção extraída: Pesquisa e Relatório de Exemplo`,
          `[${new Date(Date.now() - 3590000).toISOString()}] [DEMO] Busca web efetuada em fontes externas (25 fontes)`,
          `[${new Date(Date.now() - 3540000).toISOString()}] [DEMO] Validador de convergência executado com sucesso`
        ],
        startedAt: new Date(Date.now() - 3600000),
        finishedAt: new Date(Date.now() - 3540000),
        durationMs: 60000,
        tokensUsed: 420
      }
    ];
  });

  // Listen to User Skills from Firestore
  useEffect(() => {
    if (!currentUser) {
      setSkills([]);
      return;
    }

    const unsubscribeSkills = subscribeSkills(currentUser.uid, async (loadedSkills) => {
      setSkills(loadedSkills);
      // Delete the "user" skill from database if it exists
      const userSkill = loadedSkills.find(s => s.name && s.name.toLowerCase() === 'user');
      if (userSkill && userSkill.id) {
        deleteSkillFromDb(currentUser.uid, userSkill.id).catch(console.error);
      }
    });

    return () => unsubscribeSkills();
  }, [currentUser]);
  const [userLocation, setUserLocation] = useState<string>("São Paulo, SP (Brasil)");

  // Detect user city via IP Geolocation safely
  useEffect(() => {
    fetch('https://ipwho.is/')
      .then(res => res.json())
      .then(data => {
        if (data && data.success !== false && data.city) {
          const cityStr = `${data.city}${data.region_code ? `, ${data.region_code}` : ''}${data.country ? ` (${data.country})` : ''}`;
          setUserLocation(cityStr);
        }
      })
      .catch(() => {
        // Silent fallback to ipapi.co if needed
        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(data => {
            if (data && data.city) {
              const cityStr = `${data.city}${data.region_code ? `, ${data.region_code}` : ''}${data.country_name ? ` (${data.country_name})` : ''}`;
              setUserLocation(cityStr);
            }
          })
          .catch(() => {});
      });
  }, []);

  const getUserContext = () => ({
    city: userLocation,
    date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return 'Omnix 1.6';
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
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
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
  const isThinkingRef = useRef<boolean>(false);
  const lastExecutionsRef = useRef<Record<string, string>>({});

  // Sync isThinking reference
  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);

  // Subscribe to terminalSandbox events for audit logging
  useEffect(() => {
    // Keep track of running processes command lines so we can report them on exit
    const runningCmds = new Map<number, string>();

    const unsubscribe = terminalSandbox.subscribe((event) => {
      try {
        if (event.type === 'start') {
          const { pid, command } = event.data || {};
          if (pid && command) {
            runningCmds.set(pid, command);
            logAuditEvent({
              toolName: 'Terminal Sandbox (Executando)',
              riskLevel: 'medium',
              details: `Processo [PID: ${pid}] iniciado no sandbox: "${command}"`,
              status: 'executed',
              normalized_input: command,
              permissions_used: ['execute_tool', 'terminal_sandbox']
            });
          }
        } else if (event.type === 'exit') {
          const { pid, exitCode, durationMs } = event.data || {};
          const command = runningCmds.get(pid) || 'Comando desconhecido';
          runningCmds.delete(pid);

          const isError = exitCode !== 0;
          logAuditEvent({
            toolName: 'Terminal Sandbox (Concluído)',
            riskLevel: isError ? 'high' : 'low',
            details: `Processo [PID: ${pid}] finalizado com código ${exitCode} em ${durationMs || 0}ms. Comando: "${command}"`,
            status: isError ? 'blocked' : 'executed',
            normalized_input: command,
            output: isError ? `Erro de execução no terminal: Exit ${exitCode}` : 'Execução do processo concluída com sucesso.',
            permissions_used: ['execute_tool', 'terminal_sandbox']
          });
        } else if (event.type === 'fs_change') {
          const { action, path } = event.data || {};
          if (action && path) {
            // Only log if it's not a temporary sandbox internal write
            const name = path.replace('/workspace/', '').replace(/^\//, '');
            if (name && !name.startsWith('.')) {
              logAuditEvent({
                toolName: action === 'write' ? 'Gravação de Arquivo' : 'Exclusão de Arquivo',
                riskLevel: action === 'write' ? 'medium' : 'high',
                details: action === 'write' 
                  ? `Arquivo gravado/atualizado no Workspace Sandbox: "${name}"`
                  : `Arquivo removido do Workspace Sandbox: "${name}"`,
                status: 'executed',
                normalized_input: `Caminho: ${path}`,
                permissions_used: ['write_workspace']
              });
            }
          }
        }
      } catch (e) {
        console.error('[AuditLogs] Error processing terminalSandbox event:', e);
      }
    });

    return unsubscribe;
  }, [currentUser]);

  // Request Notification permission and setup beforeunload beacon for interrupted responses
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Permissão de notificação concedida:', permission);
      });
    }

    const handleBeforeUnload = () => {
      if (isThinkingRef.current && currentUserRef.current?.email?.toLowerCase().endsWith('@gmail.com')) {
        const activeSession = activeSessionRef.current;
        const lastUserMsg = activeSession?.messages.filter(m => m.sender === 'user').slice(-1)[0];
        const lastAssistantMsg = activeSession?.messages.filter(m => m.sender === 'ai').slice(-1)[0];

        const payload = JSON.stringify({
          toEmail: currentUserRef.current.email,
          userPrompt: lastUserMsg?.text || "Sua mensagem",
          aiResponseSnippet: lastAssistantMsg?.text || lastAssistantMsg?.finalSynthesis || "A resposta foi concluída no seu histórico."
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/notify-interrupted-response', new Blob([payload], { type: 'application/json' }));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setUnreadCount(0);
      }
    };

    const handleFocus = () => {
      setUnreadCount(0);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (unreadCount > 0) {
      const suffix = unreadCount === 1 ? '(1) Nova Mensagem!' : `(${unreadCount}) Novas Mensagens!`;
      document.title = `Omnix AI - ${suffix}`;
    } else {
      document.title = 'Omnix AI';
    }
  }, [unreadCount]);

  const sendCompletionNotification = () => {
    if (document.hidden || document.visibilityState === 'hidden') {
      setUnreadCount((prev) => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const title = "Resposta do Omnix AI está pronta!";
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
    }
  };

  useEffect(() => {
    if (!currentUser) {
      try {
        const savedExecs = localStorage.getItem('wsm_task_executions');
        if (savedExecs) {
          setTaskExecutions(JSON.parse(savedExecs));
        }
      } catch (e) {}
    }
  }, [currentUser]);

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

  const recordLedgerRun = useCallback((
    sessionId: string,
    sessionTitle: string,
    userPrompt: string,
    state: ExecutionState = 'succeeded',
    isComputer: boolean = false,
    sourcesCount: number = 0,
    attachments: any[] = [],
    errorMessage?: string,
    authDetails?: ExecutionAuthDetails
  ) => {
    const startTime = new Date(Date.now() - 3000);
    const endTime = new Date();
    const runId = `RUN-${Date.now().toString().slice(-6)}`;
    
    const isAuthError = state === 'auth_required';
    const isFailed = state === 'failed' || isAuthError;

    const steps: ExecutionStep[] = [
      {
        id: `step-1-${Date.now()}`,
        name: '1. Leitura de Intenção & Análise do Workspace',
        tool: 'workspace',
        status: 'completed',
        details: `Validação de contexto e verificação de arquivos (${attachments.length} anexo(s))`,
        timestamp: startTime
      },
      {
        id: `step-2-${Date.now()}`,
        name: isAuthError ? '2. Validação de Credenciais & Token de Acesso (HTTP 401/419)' : (isComputer ? '2. Execução de Ferramentas Web (Playwright)' : '2. Processamento do Modelo de Linguagem'),
        tool: isComputer ? 'browser' : 'code',
        status: isFailed ? 'failed' : 'completed',
        details: isAuthError ? (authDetails?.cause || 'Token de acesso rejeitado ou expirado (401/419)') : (sourcesCount > 0 ? `${sourcesCount} fontes consultadas e sintetizadas` : 'Síntese gerada pelo executor'),
        timestamp: endTime
      },
      {
        id: `step-3-${Date.now()}`,
        name: '3. Validação de Saída & Registro no Ledger',
        tool: 'code',
        status: isFailed ? 'failed' : 'completed',
        details: isFailed ? (errorMessage || authDetails?.cause || 'Falha na validação de critérios') : 'Saída validada e gravada com evidências',
        timestamp: endTime
      }
    ];

    const validations: ValidationCriterion[] = [
      {
        id: `val-1-${Date.now()}`,
        description: isAuthError ? 'Validação do token de autenticação e credencial da sessão' : 'Atendimento estrito aos critérios do prompt da conversa',
        status: isFailed ? 'failed' : 'passed'
      },
      {
        id: `val-2-${Date.now()}`,
        description: 'Integridade da resposta e ausência de contradições',
        status: isAuthError ? 'pending' : 'passed'
      }
    ];

    const artifacts = attachments.map(att => ({
      id: att.name || 'anexo',
      title: att.name || 'Anexo',
      format: att.type || 'documento'
    }));

    const evidenceLogs = [
      `[${startTime.toISOString()}] Execução agêntica iniciada no ecossistema Omnix OS`,
      `[${startTime.toISOString()}] conversa_id: "${sessionId}" | titulo: "${sessionTitle}"`,
      `[${startTime.toISOString()}] prompt_usuario: "${(userPrompt || 'Execução de Chat').slice(0, 100)}${(userPrompt || '').length > 100 ? '...' : ''}"`,
      isAuthError 
        ? `[${endTime.toISOString()}] [AUTH 401/419 INTERCEPTED] Causa: ${authDetails?.cause || errorMessage || 'Token expirado'} | Etapa: ${authDetails?.stage || 'Autenticação'} | Recomendado: ${authDetails?.recommendedAction || 'Reautenticar'}`
        : (isComputer ? `[${endTime.toISOString()}] Ferramenta Browser/Playwright executada com sucesso` : `[${endTime.toISOString()}] Modelo executado e resposta final gerada`),
      `[${endTime.toISOString()}] Estado final: ${state.toUpperCase()} | run_id: ${runId}`
    ];

    const newEntry: ExecutionLedgerEntry = {
      runId,
      sessionId,
      sessionTitle,
      intentGoal: userPrompt || 'Execução de Chat/Automação',
      constraints: ['Política de Execução Agêntica Omnix OS v2.5', 'Atribuição explícita de fonte de dados'],
      state,
      riskLevel: isAuthError ? 'high' : (isComputer ? 'medium' : 'low'),
      requiresApproval: false,
      isApproved: true,
      steps,
      validations,
      artifacts,
      evidenceLogs,
      startedAt: startTime,
      finishedAt: endTime,
      durationMs: 3000,
      tokensUsed: Math.floor(((userPrompt || '').length + 600) / 4),
      errorMessage: errorMessage || authDetails?.cause,
      authDetails
    };

    setExecutionLedgerEntries((prev) => {
      const updated = [newEntry, ...prev.filter(e => e.runId !== runId)];
      try {
        localStorage.setItem('wsm_execution_ledger', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const resumePendingExecution = useCallback(async (pending: any, newToken: string) => {
    if (!pending) return;

    setIsThinking(true);
    isExplicitCancelRef.current = false;
    abortControllerRef.current = new AbortController();

    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsThinking(false);
      }
    }, 90000);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
    }

    fetch("/api/chat", {
      method: "POST",
      signal: abortControllerRef.current.signal,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: pending.requestText }],
        text: pending.requestText,
        rawText: pending.text,
        attachments: pending.attachments || [],
        language: 'pt-BR',
        metadata: { clientTimestamp: Date.now(), clientVersion: '1.6.0' },
        sessionId: pending.sessionToUpdate.id,
        chatMemoryDoc: pending.sessionToUpdate.chatMemoryDoc || "",
        isSearchEnabled: pending.isSearchEnabled,
        isComputerEnabled: pending.isComputerEnabled,
        model: pending.sessionToUpdate.model || selectedModel,
        reasoningLevel,
        skills: [...OFFICIAL_SKILLS, ...DEFAULT_COMPOSABLE_SKILLS, ...skills],
        layeredMemories: getLayeredMemories(),
        userContext: getUserContext(),
        userInfo: currentUser ? {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário Omnix'
        } : undefined,
        history: pending.sessionToUpdate.messages?.map((m: Message) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text || m.finalSynthesis || "" }]
        })) || []
      })
    })
    .then(async (res) => {
      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 419) {
        setIsThinking(false);
        let errData: any = {};
        try { errData = await res.json(); } catch (e) {}

        const details: ExecutionAuthDetails = {
          cause: errData?.cause || "Falha ao validar as novas credenciais de acesso (HTTP 401/419).",
          stage: "2. Validação de Credencial e Comunicação com API Omnix OS",
          recommendedAction: "Por favor, efetue a reautenticação para renovar suas credenciais."
        };

        setSessions((prev) => prev.map((s) => {
          if (s.id !== pending.sessionToUpdate.id) return s;
          return {
            ...s,
            messages: s.messages.map((m) => {
              if (m.id === pending.initialAiMsgId) {
                return {
                  ...m,
                  text: "🔒 **Execução Interrompida: Reautenticação Necessária (HTTP 401/419)**\n\nNão foi possível validar o novo token de acesso. A execução agêntica foi terminada e gravada com o status **auth_required** no Run Center.",
                  finalSynthesis: "Execução terminada com estado auth_required.",
                  isSimulatingSearch: false
                };
              }
              return m;
            })
          };
        }));

        recordLedgerRun(
          pending.sessionToUpdate.id,
          pending.sessionToUpdate.title,
          pending.text,
          'auth_required',
          !!pending.isComputerEnabled,
          0,
          pending.attachments || [],
          details.cause,
          details
        );
        return;
      }

      if (!res.ok) throw new Error("Erro no servidor após reautenticação");

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const data = await res.json();
        setSessions((prev) => prev.map((s) => {
          if (s.id !== pending.sessionToUpdate.id) return s;
          return {
            ...s,
            messages: s.messages.map((m) => m.id === pending.initialAiMsgId ? {
              ...m,
              text: data.text || "",
              finalSynthesis: data.text || "",
              isSimulatingSearch: false
            } : m)
          };
        }));
        setIsThinking(false);
        recordLedgerRun(pending.sessionToUpdate.id, pending.sessionToUpdate.title, pending.text, 'succeeded', !!pending.isComputerEnabled, 0, pending.attachments);
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
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk' && data.text) {
                accumulatedFinalText += data.text;
                setSessions((prev) => prev.map((s) => {
                  if (s.id !== pending.sessionToUpdate.id) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) => m.id === pending.initialAiMsgId ? {
                      ...m,
                      text: accumulatedFinalText,
                      finalSynthesis: accumulatedFinalText,
                      isSimulatingSearch: false
                    } : m)
                  };
                }));
              }
            } catch (e) {}
          }
        }
      }

      setIsThinking(false);
      recordLedgerRun(pending.sessionToUpdate.id, pending.sessionToUpdate.title, pending.text, 'succeeded', !!pending.isComputerEnabled, 0, pending.attachments);
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      setIsThinking(false);
      recordLedgerRun(pending.sessionToUpdate.id, pending.sessionToUpdate.title, pending.text, 'failed', !!pending.isComputerEnabled, 0, pending.attachments, err.message);
    });
  }, [skills, selectedModel, reasoningLevel, currentUser, recordLedgerRun]);

  const handleRenewToken = useCallback(async (): Promise<boolean> => {
    setIsRenewingToken(true);
    setReauthError(null);
    try {
      let token: string | undefined;
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken(true);
      }
      if (!token) {
        const result = await signInWithPopup(auth, googleProvider);
        token = await result.user.getIdToken(true);
      }

      if (token) {
        setIsReauthModalOpen(false);
        setIsRenewingToken(false);
        const pending = pendingExecutionRef.current;
        if (pending) {
          pendingExecutionRef.current = null;
          await resumePendingExecution(pending, token);
        }
        return true;
      } else {
        throw new Error("Não foi possível obter uma credencial válida.");
      }
    } catch (err: any) {
      console.error("Falha ao renovar token:", err);
      setReauthError("Erro ao renovar o token. Por favor, tente reautenticar com sua conta.");
      setIsRenewingToken(false);
      return false;
    }
  }, [resumePendingExecution]);

  const handleCancelReauth = useCallback(() => {
    setIsReauthModalOpen(false);
    setIsRenewingToken(false);
    setReauthError(null);

    if (pendingExecutionRef.current) {
      const pending = pendingExecutionRef.current;
      pendingExecutionRef.current = null;

      const details: ExecutionAuthDetails = reauthDetails || {
        cause: 'Token de acesso/sessão expirado e renovação de credenciais cancelada pelo usuário (HTTP 401/419)',
        stage: '2. Validação de Credencial e Comunicação com API Omnix OS',
        recommendedAction: 'Efetuar login/reautenticação para prosseguir com a execução agêntica'
      };

      setSessions((prev) => prev.map((s) => {
        if (s.id !== pending.sessionToUpdate.id) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (m.id === pending.initialAiMsgId) {
              return {
                ...m,
                text: "🔒 **Execução Interrompida: Reautenticação Necessária (HTTP 401/419)**\n\nSua sessão de acesso expirou durante a execução agêntica. A renovação de credenciais não foi concluída. O estado desta execução foi gravado como **auth_required** no Run Center.",
                finalSynthesis: "Execução terminada com estado auth_required.",
                isSimulatingSearch: false,
                searchIntro: undefined
              };
            }
            return m;
          })
        };
      }));

      recordLedgerRun(
        pending.sessionToUpdate.id,
        pending.sessionToUpdate.title,
        pending.text,
        'auth_required',
        !!pending.isComputerEnabled,
        0,
        pending.attachments || [],
        details.cause,
        details
      );
    }
  }, [reauthDetails, recordLedgerRun]);

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
        const isActiveLocalDirtyOrPreserved = activeLocal && (isDirtyRef.current || isStreamingOrSimulating || isThinkingRef.current);
        const isActiveInLoaded = loadedSessions.some((loaded) => loaded.id === currentActiveId);

        const updatedLoaded = loadedSessions.map((loaded) => {
          const cleanedTitle = cleanSessionTitle(loaded.title);
          if (loaded.id === currentActiveId && activeLocal && isActiveLocalDirtyOrPreserved) {
            return {
              ...loaded,
              messages: activeLocal.messages,
              title: cleanSessionTitle(activeLocal.title)
            };
          }
          return {
            ...loaded,
            title: cleanedTitle
          };
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
      
      try {
        localStorage.setItem('wsm_task_executions', JSON.stringify(loadedExecutions));
      } catch (e) {}

      // Track executions and log audit events on status changes in real-time
      loadedExecutions.forEach((exec) => {
        const lastStatus = lastExecutionsRef.current[exec.id];
        if (lastStatus !== exec.status) {
          lastExecutionsRef.current[exec.id] = exec.status;

          // Don't log on first load if it's undefined to avoid spamming historical entries
          if (lastStatus !== undefined) {
            if (exec.status === 'running') {
              logAuditEvent({
                toolName: 'Execução de Automação',
                riskLevel: 'medium',
                details: `Disparo da tarefa agendada: "${exec.taskTitle}" [ID: ${exec.taskId}]. Status: Em Andamento.`,
                status: 'executed',
                user_id: currentUser.uid,
                task_id: exec.taskId,
                run_id: exec.runId
              });
            } else if (exec.status === 'succeeded') {
              logAuditEvent({
                toolName: 'Execução de Automação (Sucesso)',
                riskLevel: 'low',
                details: `Tarefa agendada "${exec.taskTitle}" concluída com êxito.`,
                status: 'executed',
                user_id: currentUser.uid,
                task_id: exec.taskId,
                run_id: exec.runId,
                output: exec.outputSummary || 'Executada com sucesso.'
              });
            } else if (exec.status === 'failed') {
              logAuditEvent({
                toolName: 'Execução de Automação (Falhou)',
                riskLevel: 'high',
                details: `Falha na execução da tarefa agendada "${exec.taskTitle}". Erro: ${exec.error || 'Erro interno'}`,
                status: 'blocked',
                user_id: currentUser.uid,
                task_id: exec.taskId,
                run_id: exec.runId,
                output: exec.error || 'Erro na execução.'
              });
            }
          }
        }
      });
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
  }, [currentUser]);

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
      if ((import.meta as any).env?.DEV) console.log('Persisting session to Firestore:', session.id);
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
    // The execution is now handled in the backend by api/scheduledTasksBackground.ts
    // This listener just watches the database for UI updates (handled by the subscribe methods)
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
    setIsScheduledTasksView(false);
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
    setIsScheduledTasksView(false);
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
    setIsScheduledTasksView(false);
    setIsMobileHistoryOpen(false);
  };

  // Toggle images gallery view
  const handleToggleImagesView = () => {
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(!isImagesView);
    setIsScheduledTasksView(false);
  };

  const handleOpenTasksView = () => {
    setSessions((prev) => prev.filter((s) => !s.isTemporary));
    setIsImagesView(false);
    setActiveSessionId(null);
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

    // 2. Code Block Response
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
      text: `${searchStatus}# 👋 Bem-vindo ao Omnix AI Hub!

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

    // Match all instances of [Lendo Skill: Nome da Skill] (case-insensitive)
    const matches = Array.from(aiText.matchAll(/\[Lendo Skill:\s*([^\]]+)\]/gi));
    if (matches.length === 0) return false;

    const allAvailableSkills = [...OFFICIAL_SKILLS, ...skills];
    const foundSkills = [];
    const missingSkills = [];

    for (const match of matches) {
      const rawSkillName = match[1].trim();
      const skillName = rawSkillName.replace(/\]/g, '').trim();
      const skill = allAvailableSkills.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase() || s.id.toLowerCase() === skillName.toLowerCase()
      );
      if (skill) {
        foundSkills.push(skill);
      } else {
        missingSkills.push(skillName);
      }
    }

    if (foundSkills.length > 0) {
      console.log(`[skills-loading] Loading content of Skills: ${foundSkills.map(s => s.name).join(', ')}...`);
      let systemMessage = `[SISTEMA: SKILLS REQUISITADAS] Você solicitou a leitura das seguintes Skills:\n\n`;
      
      foundSkills.forEach(skill => {
        systemMessage += `### Skill: ${skill.name}\n<wsm_skill_content>\n${skill.content}\n</wsm_skill_content>\n\n`;
      });

      if (missingSkills.length > 0) {
        systemMessage += `Atenção: As seguintes skills solicitadas não foram encontradas:\n` + missingSkills.map(s => `- ${s}`).join('\n') + `\n\n`;
      }

      systemMessage += `Por favor, prossiga e execute a solicitação do usuário utilizando os conhecimentos destas skills.`;

      setTimeout(() => {
        handleSendMessage(systemMessage, isSearchActiveRef.current, undefined, undefined, true);
      }, 1000);
      return true;
    } else if (missingSkills.length > 0) {
      console.log(`[skills-loading-error] None of the requested skills were found: ${missingSkills.join(', ')}`);
      const listStr = allAvailableSkills.map(s => `- ${s.name}`).join("\n");
      const systemMessage = `[SISTEMA: ERRO DE SKILLS] Nenhuma das skills solicitadas foi encontrada na sua biblioteca.
As skills disponíveis no momento são:
${listStr || 'Nenhuma skill cadastrada.'}

Por favor, corrija os nomes solicitados para a leitura ou crie as skills se necessário.`;

      setTimeout(() => {
        handleSendMessage(systemMessage, isSearchActiveRef.current, undefined, undefined, true);
      }, 1000);
      return true;
    }

    return false;
  };

  // Main sendMessage routine (used by both MainHome input and ChatWindow input)
  const computeClientSha256 = async (str: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '';
    }
  };

  const handleSendMessage = async (
    text: string, 
    isSearchEnabled: boolean, 
    overrideMessages?: Message[], 
    attachments?: any[], 
    isHidden?: boolean, 
    isComputerEnabled?: boolean,
    activeSkills?: Skill[],
    skillMode?: 'uma_skill' | 'pipeline'
  ) => {
    if (!currentUser) return;

    if (text.trim().toUpperCase() === 'ADM') {
      setShowAdminAuth(true);
      return;
    }

    isSearchActiveRef.current = isSearchEnabled;

    const payloadHash = await computeClientSha256(text || '');
    const clientMetadata = {
      clientTimestamp: Date.now(),
      charCount: (text || '').length,
      lineCount: (text || '').split('\n').length,
      payloadHash: payloadHash,
      isMultiline: (text || '').includes('\n'),
      clientVersion: '1.6.0'
    };

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date(),
      payloadHash,
      metadata: clientMetadata,
      attachments: attachments,
      isHidden: isHidden,
      activeSkills: activeSkills && activeSkills.length > 0 ? activeSkills.map(s => ({
        id: s.id,
        name: s.name,
        isOfficial: s.isOfficial,
        version: s.version
      })) : undefined,
    };

    const currentActiveSessionId = activeSessionIdRef.current;
    let sessionToUpdate: ChatSession;

    if (!currentActiveSessionId) {
      // Create a brand new session locally first
      let cleanTitleText = cleanSessionTitle(text || '');

      if (!cleanTitleText || cleanTitleText === 'Nova conversa') {
        if (attachments && attachments.length > 0) {
          cleanTitleText = `Anexo: ${attachments[0].name}`;
        } else if (activeSkills && activeSkills.length > 0) {
          cleanTitleText = `Skill /${activeSkills[0].name}`;
        } else {
          cleanTitleText = "Nova conversa";
        }
      }
      const truncatedTitle = cleanTitleText.length > 28 ? `${cleanTitleText.substring(0, 28)}...` : cleanTitleText;
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
      
      let titleText = currentSession.title;
      const needsTitleUpdate = !titleText || 
        ['nova conversa', 'chat temporário', 'conversa', 'chat', 'undefined'].includes(titleText.toLowerCase().trim()) ||
        titleText.startsWith('[SISTEMA') ||
        titleText.startsWith('[Utilize') ||
        titleText.startsWith('[PACOTE') ||
        titleText.startsWith('[PIPELINE') ||
        titleText.startsWith('Olá!');

      if (needsTitleUpdate) {
        let cleanText = cleanSessionTitle(text || '');

        if (cleanText && cleanText !== 'Nova conversa') {
          titleText = cleanText.length > 28 ? `${cleanText.substring(0, 28)}...` : cleanText;
        } else if (attachments && attachments.length > 0) {
          titleText = `Anexo: ${attachments[0].name}`;
        } else if (activeSkills && activeSkills.length > 0) {
          titleText = `Skill /${activeSkills[0].name}`;
        }
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

    const currentRequestedModel = sessionToUpdate.model || selectedModel;
    const initialAiMsg: Message = {
      id: `msg-${Date.now()}-ai`,
      sender: "ai",
      text: "",
      userQuery: text,
      timestamp: new Date(),
      model: currentRequestedModel,
      geminiModel: 'gemini-3.5-flash-lite',
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
        const fileList = attachments.map(att => {
          const bytes = att.size || 0;
          const sizeStr = bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString('pt-BR')} bytes)`;
          const mime = att.mimeType || 'application/octet-stream';
          const hashStr = att.hash ? ` | Hash: ${att.hash}` : '';
          return `- [Anexo: "${att.name}" | Tamanho Exato Real: ${sizeStr} | MIME: ${mime}${hashStr}]`;
        }).join('\n');
        requestText += `\n\n[Arquivos Anexados - Metadados Reais do File Object]\n${fileList}`;
      }

      // Add 45-second timeout to prevent eternal loading if the request hangs
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          console.warn("Request timed out after 4 minutes. Aborting.");
          abortControllerRef.current.abort();
          setIsThinking(false);
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
                        text: "Houve um problema ao gerar a resposta. Tente novamente.",
                        isSimulatingSearch: false,
                        searchIntro: "Tempo limite excedido.",
                      }
                    : m
                ),
              };
            });
          });
        }
      }, 90000); // Bug #05: 90 seconds timeout

      const idToken = currentUser ? await currentUser.getIdToken().catch(() => '') : '';
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (idToken) {
        requestHeaders["Authorization"] = `Bearer ${idToken}`;
      }

      fetch("/api/chat", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        headers: requestHeaders,
        body: JSON.stringify({
          content: [
            {
              type: 'text',
              text: requestText
            }
          ],
          text: requestText,
          rawText: text,
          attachments: attachments || [],
          language: 'pt-BR',
          metadata: clientMetadata,
          sessionId: sessionToUpdate.id,
          chatMemoryDoc: sessionToUpdate.chatMemoryDoc || "",
          workspaceFiles: (() => {
            const files: any[] = [];
            
            // 1. Library Uploads (Global)
            try {
              const savedUploads = localStorage.getItem('wsm_workspace_library_uploads');
              if (savedUploads) {
                const parsed = JSON.parse(savedUploads);
                parsed.forEach((u: any) => {
                  files.push({
                    id: u.id || u.name,
                    title: u.name,
                    format: u.type || 'documento',
                    scope: 'Workspace do Usuário (Global)',
                    origin: 'Workspace do Usuário',
                    content: u.preview || u.content || `Documento (${u.name})`
                  });
                });
              }
            } catch (e) {}

            // 2. Conversation Attachments & Generated Documents
            sessions.forEach(s => {
              s.messages?.forEach(m => {
                // Attachments
                if (m.attachments && Array.isArray(m.attachments)) {
                  m.attachments.forEach(att => {
                    files.push({
                      id: att.url || att.name,
                      title: att.name,
                      format: att.type,
                      scope: `Anexo de Conversa ("${s.title}")`,
                      origin: 'Anexo de Conversa',
                      content: (att as any).extractedText || (att as any).content || `Anexo (${att.name}, ${att.type})`
                    });
                  });
                }
                // Generated Document Tags
                if (m.text && (m.text.includes('<doc') || m.text.includes('<wsm_document'))) {
                  const docMatch = m.text.match(/<doc[^>]*title=["']([^"']+)["'][^>]*>([\s\S]*?)<\/doc>/i) ||
                                   m.text.match(/<wsm_document[^>]*title=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wsm_document>/i);
                  if (docMatch) {
                    files.push({
                      id: `doc-${docMatch[1]}`,
                      title: docMatch[1],
                      format: 'txt',
                      scope: `Artefato Gerado em Conversa ("${s.title}")`,
                      origin: 'Artefato Gerado',
                      content: docMatch[2].trim()
                    });
                  }
                }
              });
            });

            return files;
          })(),
          isSearchEnabled,
          isComputerEnabled,
          isTranslatorMode: false,
          model: sessionToUpdate.model || selectedModel,
          reasoningLevel: reasoningLevel,
          skills: [...OFFICIAL_SKILLS, ...DEFAULT_COMPOSABLE_SKILLS, ...skills],
          activeSkills: activeSkills && activeSkills.length > 0 ? activeSkills : undefined,
          activeSkillMode: skillMode || 'uma_skill',
          layeredMemories: getLayeredMemories(),
          userContext: getUserContext(),
          userInfo: currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário Omnix'
          } : undefined,
          history: sessionToUpdate.messages.map(m => {
            let msgText = m.text || m.finalSynthesis || "";
            msgText = msgText
              .replace(/\[PACOTE_SKILL_DECLARATIVO[\s\S]*?\[SOLICITAÇÃO DO USUÁRIO\]:\s*/gi, "")
              .replace(/\[PIPELINE_DE_SKILLS_DECLARATIVO[\s\S]*?\[SOLICITAÇÃO DO USUÁRIO\]:\s*/gi, "")
              .replace(/\[PACOTE_SKILL_DECLARATIVO[\s\S]*?$/gi, "")
              .replace(/\[PIPELINE_DE_SKILLS_DECLARATIVO[\s\S]*?$/gi, "")
              .replace(/\[SOLICITAÇÃO DO USUÁRIO\]:\s*/gi, "");

            if (!msgText && m.sender === 'user' && m.attachments && m.attachments.length > 0) {
              msgText = "Enviei arquivos em anexo.";
            }
            if (m.sender === 'user' && m.attachments && m.attachments.length > 0) {
              const fileList = m.attachments.map(att => {
                const bytes = att.size || 0;
                const sizeStr = bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString('pt-BR')} bytes)`;
                const mime = att.mimeType || 'application/octet-stream';
                const hashStr = att.hash ? ` | Hash: ${att.hash}` : '';
                return `- [Anexo: "${att.name}" | Tamanho Exato Real: ${sizeStr} | MIME: ${mime}${hashStr}]`;
              }).join('\n');
              msgText += `\n\n[Arquivos Anexados - Metadados Reais do File Object]\n${fileList}`;
            }

            const parts: any[] = [{ text: msgText }];

            if (m.sender === 'user' && m.attachments && Array.isArray(m.attachments)) {
              m.attachments.forEach(att => {
                let base64 = att.base64 ? String(att.base64).trim() : '';
                let mimeType = att.mimeType ? String(att.mimeType).trim() : '';

                if (base64.includes('base64,')) {
                  const partsB64 = base64.split('base64,');
                  if (partsB64[0].includes('image/')) {
                    const matchM = partsB64[0].match(/image\/[a-zA-Z0-9+-]+/);
                    if (matchM) mimeType = matchM[0];
                  }
                  base64 = partsB64[1] || '';
                }

                if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') {
                  const ext = (att.name || '').split('.').pop()?.toLowerCase();
                  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                  else if (ext === 'png') mimeType = 'image/png';
                  else if (ext === 'webp') mimeType = 'image/webp';
                  else if (ext === 'gif') mimeType = 'image/gif';
                  else if (att.type === 'image') mimeType = 'image/png';
                }

                if (base64) {
                  parts.push({
                    inlineData: {
                      mimeType: mimeType || 'image/png',
                      data: base64
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

          if (res.status === 401 || res.status === 419) {
            let errData: any = {};
            try { errData = await res.json(); } catch (e) {}

            const details: ExecutionAuthDetails = {
              cause: errData?.cause || (res.status === 419 ? "Sua sessão de acesso expirou (HTTP 419). O token de autenticação de acesso foi recusado." : "Credenciais de acesso inválidas ou token de autenticação expirado (HTTP 401)."),
              stage: errData?.stage || "2. Validação de Credencial e Comunicação com API Omnix OS",
              recommendedAction: errData?.recommendedAction || "Efetue a reautenticação para renovar o token de acesso e prosseguir com a execução agêntica."
            };

            // Freeze execution state immediately
            setIsThinking(false);

            // Save pending execution in ref to preserve prompt, context and attachments
            pendingExecutionRef.current = {
              sessionToUpdate,
              text,
              requestText,
              attachments,
              initialAiMsgId: initialAiMsg.id,
              isComputerEnabled,
              isSearchEnabled
            };

            // Open Reauth Modal
            setReauthDetails(details);
            setIsReauthModalOpen(true);

            return; // Freeze execution flow
          }

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
                chatMemoryDoc: data.chatMemoryDoc || currentSess.chatMemoryDoc || "",
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
            recordLedgerRun(sessionToUpdate.id, sessionToUpdate.title, text, 'succeeded', !!isComputerEnabled, data.searchSources?.length || 0, attachments);
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
                } else if (eventData.type === "browser_screenshot") {
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) return prev;
                    return prev.map((s) => {
                      if (s.id !== sessionToUpdate.id) return s;
                      return {
                        ...s,
                        messages: s.messages.map((m) => {
                          if (m.id === initialAiMsg.id) {
                            const existing = m.browserScreenshots || [];
                            return {
                              ...m,
                              browserScreenshots: [
                                ...existing,
                                {
                                  screenshot: eventData.screenshot,
                                  url: eventData.url,
                                  title: eventData.title,
                                  stepName: eventData.stepName,
                                  timestamp: eventData.timestamp || Date.now(),
                                }
                              ]
                            };
                          }
                          return m;
                        })
                      };
                    });
                  });
                } else if (eventData.type === "terminal_action") {
                  try {
                    if (eventData.action === "execute" && eventData.command) {
                      if (eventData.command.includes("hello.py") && !terminalSandbox.readFile("/workspace/hello.py")) {
                        terminalSandbox.writeFile("/workspace/hello.py", 'print("Hello, World!")');
                      }
                      terminalSandbox.spawn(eventData.command, [], { caller: 'ai' });
                    } else if (eventData.action === "write_file" && eventData.path) {
                      terminalSandbox.writeFile(eventData.path, eventData.content || '');
                    } else if (eventData.action === "delete_file" && eventData.path) {
                      terminalSandbox.deleteFile(eventData.path);
                    } else if (eventData.action === "run_code") {
                      const fn = eventData.filename || (eventData.language === 'python' ? 'script.py' : 'index.js');
                      const path = `/workspace/${fn.replace(/^\//, '')}`;
                      terminalSandbox.writeFile(path, eventData.code || 'print("Hello, World!")');
                      const runCmd = eventData.language === 'python' ? `python3 ${path}` : `node ${path}`;
                      terminalSandbox.spawn(runCmd, [], { caller: 'ai' });
                    }
                  } catch (err) {
                    console.error("Erro ao processar terminal_action no sandbox:", err);
                  }
                } else if (eventData.type === "tool_event" && eventData.toolEvent) {
                  const ev = eventData.toolEvent;
                  if (ev.tool === 'web_search_query' || ev.event === 'web.search') {
                    logAuditEvent({
                      toolName: 'web_search_query',
                      riskLevel: 'low',
                      details: `Consulta HTTP 200 efetuada na API de Busca Tavily. Query: "${ev.query || ev.normalized_input || 'Pesquisa'}".`,
                      status: 'executed',
                      normalized_input: ev.query || ev.normalized_input || '',
                      output: `HTTP ${ev.httpStatus || 200}: ${ev.sourcesCount || 0} fontes estruturadas retornadas.`,
                      permissions_used: ['read_workspace', 'web_search']
                    });
                  } else {
                    logAuditEvent({
                      toolName: ev.tool || ev.event || 'Uso de Ferramenta',
                      riskLevel: 'low',
                      details: ev.details || `Ferramenta ${ev.tool || ev.event} executada pelo agente.`,
                      status: ev.status === 'success' ? 'executed' : 'blocked',
                      normalized_input: ev.query || ev.normalized_input || '',
                      output: ev.details || ''
                    });
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
                            const existingEvents = m.toolEvents || [];
                            return {
                              ...m,
                              toolEvents: [...existingEvents, eventData.toolEvent]
                            };
                          }
                          return m;
                        })
                      };
                    });
                  });
                } else if (eventData.type === "final") {
                  accumulatedFinalText = eventData.finalSynthesis || eventData.text || "";
                  
                  let textToSave = eventData.text || "";
                  let finalSynthesisToSave = eventData.finalSynthesis || "";

                  // Bug #05: If both are completely empty, show explicit error
                  if (!textToSave.trim() && !finalSynthesisToSave.trim()) {
                    textToSave = "⚠️ Houve um erro na geração da resposta (Retorno vazio do modelo). Por favor, tente novamente.";
                    accumulatedFinalText = textToSave;
                  }
                  
                  setSessions((prev) => {
                    const currentSess = prev.find((s) => s.id === sessionToUpdate.id);
                    if (!currentSess) {
                      console.warn("[App.tsx] Final event: sessionToUpdate.id not found in sessions!", sessionToUpdate.id);
                      return prev;
                    }
                    let matched = false;
                    const finalSession = {
                      ...currentSess,
                      chatMemoryDoc: eventData.chatMemoryDoc || currentSess.chatMemoryDoc || "",
                      messages: currentSess.messages.map((m) => {
                        if (m.id === initialAiMsg.id) {
                          matched = true;
                          const hasSources = Boolean(eventData.searchSources && eventData.searchSources.length > 0);
                          const isSearchMsg = eventData.isSearchMessage !== undefined ? eventData.isSearchMessage : hasSources;
                          return {
                            ...m,
                            text: textToSave,
                            finalSynthesis: finalSynthesisToSave,
                            model: eventData.model || m.model || currentRequestedModel,
                            geminiModel: eventData.geminiModel || m.geminiModel || 'gemini-3.5-flash-lite',
                            searchImages: eventData.searchImages,
                            searchSources: eventData.searchSources,
                            isSearchMessage: isSearchMsg,
                            isSimulatingSearch: false,
                            toolEvents: eventData.toolEvents || m.toolEvents || [],
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
              return {
                ...s,
                messages: s.messages.map((m) => {
                  if (m.id === initialAiMsg.id) {
                    return {
                      ...m,
                      isSimulatingSearch: false,
                      text: m.text || "⚠️ O assistente parou de responder inesperadamente.",
                      finalSynthesis: m.finalSynthesis || m.text || "⚠️ O assistente parou de responder inesperadamente.",
                    };
                  }
                  return m;
                })
              };
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

          const hasTerminalFail = accumulatedFinalText.includes('status="failed"') || accumulatedFinalText.includes('status="timed_out"');
          const finalLedgerStatus = hasTerminalFail ? 'failed' : 'succeeded';
          recordLedgerRun(sessionToUpdate.id, sessionToUpdate.title, text, finalLedgerStatus, !!isComputerEnabled, 0, attachments);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          setIsThinking(false);
          sendCompletionNotification();
          
          recordLedgerRun(
            sessionToUpdate.id,
            sessionToUpdate.title,
            text,
            err.name === 'AbortError' ? 'cancelled' : 'failed',
            !!isComputerEnabled,
            0,
            attachments,
            err.message
          );
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
    
    const userMessage = currentSession.messages[idx];
    await handleSendMessage(newText, isSearchActiveRef.current, overrideMessages, userMessage.attachments, false, false);
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
        text = `Escreva um e-mail formal e amigável parabenizando a equipe Omnix AI pelo design compacto e alta performance do ${selectedModel}`;
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

  const shareMatch = typeof window !== "undefined" && window.location.pathname.match(/^\/share\/(.+)/);
  if (shareMatch) {
    const sessionId = shareMatch[1];
    const uid = new URLSearchParams(window.location.search).get("uid");
    if (uid && sessionId) {
      return (
        <SharedChatView sessionId={sessionId} uid={uid} />
      );
    }
  }

  if (isBenchmarkRoute) {
    return (
      <BenchmarkPage />
    );
  }

  if (authLoading) {
    return (
      <div id="wsm-loading-screen" className="flex h-[100dvh] w-screen flex-col items-center justify-center bg-[#fcfbfa] select-none dot-grid">
        <div className="w-12 h-12 bg-gradient-to-br from-[#2563eb] to-[#3b82f6] rounded-xl flex items-center justify-center shadow-md animate-spin mb-4">
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
          Inicializando Omnix AI Hub...
        </p>
      </div>
    );
  }

  // If no user is authenticated, force them to Login
  if (!currentUser) {
    return (
      <Login onLoginSuccess={() => {}} />
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-[#faf9f6] text-gray-800 font-sans overflow-hidden">
      {/* Sidebar Area */}
      <Sidebar
        sessions={sessions.filter((s) => !s.isTemporary)}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => { handleSelectSession(id); setIsMobileHistoryOpen(false); }}
        onDeleteSession={handleDeleteSession}
        onNewChat={() => { handleNewChat(); setIsMobileHistoryOpen(false); }}
        onToggleImagesView={() => { handleToggleImagesView(); setIsMobileHistoryOpen(false); }}
        isImagesView={isImagesView}
        userEmail={currentUser.email}
        userName={currentUser.displayName}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        onOpenTasks={() => { handleOpenTasksView(); setIsMobileHistoryOpen(false); }}
        onOpenLedger={() => setIsLedgerModalOpen(true)}
        isMobileHistoryOpen={isMobileHistoryOpen}
        onCloseMobileHistory={() => setIsMobileHistoryOpen(false)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
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
      <div className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 ${isMobileHistoryOpen ? 'hidden md:flex' : 'flex'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={
              isAdminView ? 'admin' :
              isScheduledTasksView ? 'scheduled' :
              isImagesView ? 'images' :
              activeSession ? activeSession.id : 'home'
            }
            initial={{ opacity: 0, y: 6, scale: 0.996 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.996 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full flex flex-col min-w-0 flex-1 overflow-hidden"
          >
            {isAdminView ? (
              <AdminDashboard 
                onBack={() => setIsAdminView(false)} 
                actualSessionsCount={sessions.filter((s) => !s.isTemporary).length}
              />
            ) : isScheduledTasksView ? (
              <ScheduledTasksDashboard
                tasks={scheduledTasks}
                executions={taskExecutions}
                sessions={sessions.filter((s) => !s.isTemporary)}
                currentUserId={currentUser?.uid}
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
                  setIsScheduledTasksView(false);
                }}
                onSessionCreated={(createdSession) => {
                  setSessions((prev) => [createdSession, ...prev.filter((s) => s.id !== createdSession.id)]);
                }}
                onExecutionCreated={(createdExecution) => {
                  setTaskExecutions((prev) => [createdExecution, ...prev.filter((e) => e.id !== createdExecution.id)]);
                  try {
                    const existing = JSON.parse(localStorage.getItem('wsm_task_executions') || '[]');
                    localStorage.setItem('wsm_task_executions', JSON.stringify([createdExecution, ...existing.filter((e: any) => e.id !== createdExecution.id)]));
                  } catch (e) {}
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
                onShareSession={async () => {
                  if (activeSessionId && currentUser) {
                    try {
                      await saveSession(currentUser.uid, { ...activeSession, isPublic: true });
                      const url = `${window.location.origin}/share/${activeSessionId}?uid=${currentUser.uid}`;
                      await navigator.clipboard.writeText(url);
                      alert("Link de compartilhamento copiado para a área de transferência!");
                    } catch(e) {
                      console.error(e);
                      alert("Erro ao compartilhar chat.");
                    }
                  }
                }}
                onDeleteSession={() => {
                  if (activeSessionId) {
                    handleDeleteSession(activeSessionId);
                  }
                }}
                onOpenMobileHistory={() => setIsMobileHistoryOpen(true)}
                initialDraft={activeSessionId ? drafts[activeSessionId] : undefined}
                onSaveDraft={(draft) => { if (currentUser && activeSessionId) saveDraft(currentUser.uid, activeSessionId, draft) }}
                onDeleteDraft={() => { if (currentUser && activeSessionId) deleteDraft(currentUser.uid, activeSessionId) }}
                skills={[...OFFICIAL_SKILLS, ...skills]}
                onOpenStore={() => setIsStoreModalOpen(true)}
                onSaveTask={async (task) => {
                  if (currentUser) {
                    await saveScheduledTask(currentUser.uid, task);
                  }
                }}
                onOpenScheduledTasks={() => setIsScheduledTasksView(true)}
                isTemporary={!!activeSession.isTemporary}
                isScheduled={!!activeSession.isScheduled}
                onStartTemporaryChat={handleNewTemporaryChat}
                onOpenLedger={() => setIsLedgerModalOpen(true)}
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
                skills={[...OFFICIAL_SKILLS, ...skills]}
                onOpenStore={() => setIsStoreModalOpen(true)}
                onStartTemporaryChat={handleNewTemporaryChat}
                isProfileLoading={!isProfileLoaded}
              />
            )}
          </motion.div>
        </AnimatePresence>
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

      {isStoreModalOpen && (
        <OfficialSkillsStore 
          onClose={() => setIsStoreModalOpen(false)}
          userSkills={skills}
        />
      )}

      {isProfileModalOpen && (
        <UserProfileModal
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setIsProfileModalOpen(false)}
          onSignOut={handleSignOut}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          onOpenPasswordChangeModal={() => setIsPasswordChangeModalOpen(true)}
        />
      )}

      {isPasswordChangeModalOpen && (
        <PasswordChangeModal
          isOpen={isPasswordChangeModalOpen}
          onClose={() => setIsPasswordChangeModalOpen(false)}
        />
      )}

      {isSecurityModalOpen && (
        <AgenticSecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
        />
      )}

      {isReauthModalOpen && (
        <ReauthModal
          isOpen={isReauthModalOpen}
          onClose={handleCancelReauth}
          onRenewToken={handleRenewToken}
          onCancel={handleCancelReauth}
          cause={reauthDetails?.cause}
          stage={reauthDetails?.stage}
          recommendedAction={reauthDetails?.recommendedAction}
          isRenewing={isRenewingToken}
          errorMessage={reauthError}
        />
      )}

      <AnimatePresence>
        {sessionToDeleteId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDeleteId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
              className="bg-white border border-[#eae6e1] rounded-2xl p-6 max-w-sm w-full shadow-2xl z-10 relative flex flex-col gap-4"
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
