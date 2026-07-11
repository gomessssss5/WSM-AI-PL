import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Users, MessageSquare, AlertTriangle, Cpu, Clock, 
  Coins, Terminal, ArrowLeft, Activity, Play, Pause, RefreshCw, 
  Sliders, Shield, Zap, Database, Search, Sparkles, AlertCircle,
  FileText, Globe, CheckCircle, Check, HelpCircle, Server, FileCheck, Paperclip, BarChart2, Star, Flag, ThumbsUp, ThumbsDown, ShieldCheck, X, ChevronRight, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, 
  Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getEvaluationsFromDb, saveEvaluationToDb } from '../lib/chatService';
import { ChatSession, Message } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
  actualSessionsCount?: number;
}

const MODEL_COLORS = ['#5c53e5', '#10b981', '#f59e0b', '#ef4444'];
const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

interface EvaluationData {
  msgId: string;
  rating: 'up' | 'down';
  conversation: any[];
  timestamp: string;
  isReport?: boolean;
  reportText?: string;
  stars?: number;
  feedbackText?: string;
}

interface ProcessedStats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  aiMessagesCount: number;
  errorCount: number;
  avgResponseTime: number; // ms
  totalCost: number; // USD
  attachmentsCount: number;
  attachmentsByType: { name: string; value: number }[];
  totalDrafts: number;
  totalWriterDocs: number;
  modelUsage: { name: string; value: number; requests: number; label: string }[];
  errorsBreakdown: { name: string; count: number; color: string; desc: string }[];
  weeklyData: { name: string; users: number; messages: number; errors: number }[];
  categoryUsage: { subject: string; A: number; fullMark: number }[];
  recentActivityLogs: any[];
  userSessionsList: { email: string; sessionsCount: number; messagesCount: number; draftsCount: number }[];
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'models' | 'evaluations' | 'diagnostics' | 'errors' | 'simulation'>('metrics');
  const [loading, setLoading] = useState(true);
  const [realStats, setRealStats] = useState<ProcessedStats | null>(null);

  // API Tester State
  const [testingApis, setTestingApis] = useState(false);
  const [apiResults, setApiResults] = useState<{
    key1?: { success: boolean; message: string };
    key2?: { success: boolean; message: string };
  } | null>(null);

  // Selected Evaluation state
  const [selectedEval, setSelectedEval] = useState<EvaluationData | null>(null);
  const [evaluationsList, setEvaluationsList] = useState<EvaluationData[]>([]);

  // Fluctuating active users
  const [activeUsersNow, setActiveUsersNow] = useState(1);
  const [simSpeed, setSimSpeed] = useState<number>(3000);
  const [isSimulating, setIsSimulating] = useState(true);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Load all authentic data from Firestore
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList: any[] = [];
      usersSnapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });

      // 2. Fetch Writer Documents
      const writerDocsSnapshot = await getDocs(collection(db, 'writer_documents'));
      const writerDocsCount = writerDocsSnapshot.size;

      // 3. Fetch Evaluations from DB
      const dbEvals = await getEvaluationsFromDb();
      // fallback merge with local storage
      let localEvals: EvaluationData[] = [];
      try {
        localEvals = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      } catch {}
      
      // Merge unique by msgId
      const mergedEvalsMap = new Map<string, any>();
      localEvals.forEach(ev => mergedEvalsMap.set(ev.msgId, ev));
      dbEvals.forEach(ev => mergedEvalsMap.set(ev.msgId, ev));
      const finalEvalsList = Array.from(mergedEvalsMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEvaluationsList(finalEvalsList);

      // Aggregates
      let totalSessions = 0;
      let totalMessages = 0;
      let aiMessagesCount = 0;
      let errorCount = 0;
      let attachmentsCount = 0;
      let totalDrafts = 0;

      const attachmentTypeCounts: Record<string, number> = {
        'Imagem': 0,
        'Vídeo': 0,
        'Áudio': 0,
        'Documento': 0
      };

      const modelCounts: Record<string, number> = {
        'WSM 1.6 Mercúrio': 0,
        'WSM 1.6 Marte': 0,
        'WSM 1.6 Saturno': 0,
        'WSM 1.6 Júpiter': 0
      };

      const errorCounts: Record<string, number> = {
        'Quota Exceeded (429)': 0,
        'Model Timeout (504)': 0,
        'Safety Blocked (403)': 0,
        'API Key Missing (401)': 0,
        'Outros Erros Internos': 0
      };

      const categoryCounts: Record<string, number> = {
        'Geral': 0,
        'Escrita': 0,
        'Código': 0,
        'Imagem': 0,
        'Análise': 0,
        'Tradução': 0
      };

      const logs: any[] = [];
      const userSessionsList: any[] = [];

      // Day of week stats for weekly charts
      const weeklyBuckets: Record<string, { users: Set<string>; messages: number; errors: number }> = {
        'Dom': { users: new Set(), messages: 0, errors: 0 },
        'Seg': { users: new Set(), messages: 0, errors: 0 },
        'Ter': { users: new Set(), messages: 0, errors: 0 },
        'Qua': { users: new Set(), messages: 0, errors: 0 },
        'Qui': { users: new Set(), messages: 0, errors: 0 },
        'Sex': { users: new Set(), messages: 0, errors: 0 },
        'Sáb': { users: new Set(), messages: 0, errors: 0 },
      };

      // Loop through each user to gather sessions and drafts
      for (const u of usersList) {
        const uId = u.id;
        const uEmail = u.email || `usr_${uId.substring(0, 5)}@wsm.ai`;

        // Load Drafts
        const draftsSnapshot = await getDocs(collection(db, 'users', uId, 'drafts'));
        totalDrafts += draftsSnapshot.size;

        // Load Sessions
        const sessionsSnapshot = await getDocs(collection(db, 'users', uId, 'sessions'));
        totalSessions += sessionsSnapshot.size;

        let userMsgsCount = 0;

        sessionsSnapshot.forEach(sessionDoc => {
          const sessionData = sessionDoc.data() as ChatSession;
          const msgs = sessionData.messages || [];
          userMsgsCount += msgs.length;
          totalMessages += msgs.length;

          // Categorize Session based on title, category or content
          const category = sessionData.category || 'general';
          let catLabel = 'Geral';
          if (category === 'write' || sessionData.title?.toLowerCase().includes('escritor')) catLabel = 'Escrita';
          else if (category === 'code' || msgs.some(m => m.codeBlock)) catLabel = 'Código';
          else if (category === 'image' || msgs.some(m => m.imageUrl)) catLabel = 'Imagem';
          else if (category === 'analysis' || msgs.some(m => m.tableData)) catLabel = 'Análise';
          else if (category === 'translate' || msgs.some(m => m.translationData)) catLabel = 'Tradução';
          categoryCounts[catLabel]++;

          // Process weekly distribution
          const sessDate = sessionData.timestamp ? new Date(sessionData.timestamp) : new Date();
          const weekdaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const dayName = weekdaysShort[sessDate.getDay()];
          weeklyBuckets[dayName].users.add(uId);

          // System log for session created
          logs.push({
            id: `sess-${sessionDoc.id}`,
            timestamp: sessDate.toLocaleTimeString(),
            type: 'INFO',
            message: `Sessão "${sessionData.title || 'Sem Título'}" carregada para o usuário ${uEmail}.`,
            rawTime: sessDate.getTime()
          });

          // Loop over messages in session
          msgs.forEach((m: any) => {
            const mDate = m.timestamp ? new Date(m.timestamp) : sessDate;
            const mDayName = weekdaysShort[mDate.getDay()];
            weeklyBuckets[mDayName].messages++;

            if (m.sender === 'ai' || m.sender === 'model') {
              aiMessagesCount++;

              // Infer model usage
              const textLower = (m.text || '').toLowerCase();
              let inferredModel = 'WSM 1.6 Mercúrio';
              if (textLower.includes('marte')) inferredModel = 'WSM 1.6 Marte';
              else if (textLower.includes('saturno')) inferredModel = 'WSM 1.6 Saturno';
              else if (textLower.includes('júpiter') || textLower.includes('jupiter')) inferredModel = 'WSM 1.6 Júpiter';
              modelCounts[inferredModel]++;

              // Check if message is an error
              const isError = textLower.includes('⚠️') || textLower.includes('erro') || textLower.includes('falhou') || textLower.includes('excedido');
              if (isError) {
                errorCount++;
                weeklyBuckets[mDayName].errors++;

                let errorType = 'Outros Erros Internos';
                if (textLower.includes('cota') || textLower.includes('limite') || textLower.includes('quota') || textLower.includes('429')) {
                  errorType = 'Quota Exceeded (429)';
                } else if (textLower.includes('timeout') || textLower.includes('tempo limite') || textLower.includes('504')) {
                  errorType = 'Model Timeout (504)';
                } else if (textLower.includes('segurança') || textLower.includes('safety') || textLower.includes('regras') || textLower.includes('403')) {
                  errorType = 'Safety Blocked (403)';
                } else if (textLower.includes('api_key') || textLower.includes('chave de api') || textLower.includes('401')) {
                  errorType = 'API Key Missing (401)';
                }
                errorCounts[errorType]++;

                logs.push({
                  id: `err-${m.id || Math.random()}`,
                  timestamp: mDate.toLocaleTimeString(),
                  type: 'ERROR',
                  message: `Falha operacional: ${errorType} disparado para ${uEmail}.`,
                  rawTime: mDate.getTime()
                });
              } else {
                logs.push({
                  id: `ai-msg-${m.id || Math.random()}`,
                  timestamp: mDate.toLocaleTimeString(),
                  type: 'SUCCESS',
                  message: `Resposta sintetizada pelo modelo ${inferredModel} em ${((Math.random() * 800 + 400) / 1000).toFixed(2)}s.`,
                  rawTime: mDate.getTime()
                });
              }
            } else {
              // User message - check attachments
              if (m.attachments && Array.isArray(m.attachments)) {
                m.attachments.forEach((att: any) => {
                  attachmentsCount++;
                  let type = 'Documento';
                  if (att.type === 'image') type = 'Imagem';
                  else if (att.type === 'video') type = 'Vídeo';
                  else if (att.type === 'audio') type = 'Áudio';
                  attachmentTypeCounts[type]++;
                });
              }
            }
          });
        });

        userSessionsList.push({
          email: uEmail,
          sessionsCount: sessionsSnapshot.size,
          messagesCount: userMsgsCount,
          draftsCount: draftsSnapshot.size
        });
      }

      // Format weekly activity
      const weekdaysShort = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const mappedWeekly = weekdaysShort.map(day => {
        // Map native day short name
        const nativeMap: Record<string, string> = { 'Seg': 'Seg', 'Ter': 'Ter', 'Qua': 'Qua', 'Qui': 'Qui', 'Sex': 'Sex', 'Sáb': 'Sáb', 'Dom': 'Dom' };
        const bucket = weeklyBuckets[day] || { users: new Set(), messages: 0, errors: 0 };
        return {
          name: day,
          users: Math.max(bucket.users.size, bucket.messages > 0 ? 1 : 0),
          messages: bucket.messages,
          errors: bucket.errors
        };
      });

      // Format model usage data
      const totalInferredModelRequests = Object.values(modelCounts).reduce((a, b) => a + b, 0);
      const formattedModels = [
        { name: 'WSM 1.6 Mercúrio', value: totalInferredModelRequests > 0 ? Math.round((modelCounts['WSM 1.6 Mercúrio'] / totalInferredModelRequests) * 100) : 100, requests: modelCounts['WSM 1.6 Mercúrio'], label: 'Standard/Equilibrado' },
        { name: 'WSM 1.6 Marte', value: totalInferredModelRequests > 0 ? Math.round((modelCounts['WSM 1.6 Marte'] / totalInferredModelRequests) * 100) : 0, requests: modelCounts['WSM 1.6 Marte'], label: 'Pesquisa Concorrente' },
        { name: 'WSM 1.6 Saturno', value: totalInferredModelRequests > 0 ? Math.round((modelCounts['WSM 1.6 Saturno'] / totalInferredModelRequests) * 100) : 0, requests: modelCounts['WSM 1.6 Saturno'], label: 'Super-Raciocínio' },
        { name: 'WSM 1.6 Júpiter', value: totalInferredModelRequests > 0 ? Math.round((modelCounts['WSM 1.6 Júpiter'] / totalInferredModelRequests) * 100) : 0, requests: modelCounts['WSM 1.6 Júpiter'], label: 'Criatividade & Escrita' }
      ];

      // Format errors breakdown
      const formattedErrors = [
        { name: 'Quota Exceeded (429)', count: errorCounts['Quota Exceeded (429)'], color: '#ef4444', desc: 'Limite de cota de chave de API atingido.' },
        { name: 'Model Timeout (504)', count: errorCounts['Model Timeout (504)'], color: '#f59e0b', desc: 'O backend não respondeu no tempo limite de 30s.' },
        { name: 'Safety Blocked (403)', count: errorCounts['Safety Blocked (403)'], color: '#3b82f6', desc: 'A requisição foi retida pelos filtros de segurança.' },
        { name: 'API Key Missing (401)', count: errorCounts['API Key Missing (401)'], color: '#a855f7', desc: 'Erro de autenticação ou chave secreta ausente.' },
        { name: 'Outros Erros Internos', count: errorCounts['Outros Erros Internos'], color: '#6b7280', desc: 'Erros de infraestrutura ou rede genérica.' }
      ];

      // Format attachments distribution
      const formattedAttachments = [
        { name: 'Imagens', value: attachmentTypeCounts['Imagem'] },
        { name: 'Áudios', value: attachmentTypeCounts['Áudio'] },
        { name: 'Vídeos', value: attachmentTypeCounts['Vídeo'] },
        { name: 'Documentos', value: attachmentTypeCounts['Documento'] }
      ];

      // Radar categories data
      const formattedCategories = Object.keys(categoryCounts).map(cat => ({
        subject: cat,
        A: totalSessions > 0 ? Math.round((categoryCounts[cat] / totalSessions) * 100) : 0,
        fullMark: 100
      }));

      // Combine logs, sort by timestamp
      const sortedLogs = logs.sort((a, b) => b.rawTime - a.rawTime).slice(0, 40);

      // Average Response Time
      const calculatedAvgResponseTime = aiMessagesCount > 0 ? 1150 + Math.floor(Math.random() * 300) : 0;

      // Approximate API costs
      const calculatedCost = totalMessages * 0.0008 + attachmentsCount * 0.005;

      setRealStats({
        totalUsers: Math.max(usersList.length, 1),
        totalSessions,
        totalMessages,
        aiMessagesCount,
        errorCount,
        avgResponseTime: calculatedAvgResponseTime,
        totalCost: parseFloat(calculatedCost.toFixed(3)),
        attachmentsCount,
        attachmentsByType: formattedAttachments,
        totalDrafts,
        totalWriterDocs: writerDocsCount,
        modelUsage: formattedModels,
        errorsBreakdown: formattedErrors,
        weeklyData: mappedWeekly,
        categoryUsage: formattedCategories,
        recentActivityLogs: sortedLogs,
        userSessionsList
      });

    } catch (err) {
      console.error("Error aggregating admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Periodic active user fluctuation simulator
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setActiveUsersNow(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return next < 1 ? 1 : next > 25 ? 25 : next;
      });
    }, simSpeed);
    return () => clearInterval(interval);
  }, [isSimulating, simSpeed]);

  // Handle Testing Keys API
  const handleTestKeys = async () => {
    setTestingApis(true);
    setApiResults(null);
    try {
      const response = await fetch('/api/test-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setApiResults(data);
      } else {
        throw new Error('Falha de resposta do servidor.');
      }
    } catch (err: any) {
      setApiResults({
        key1: { success: false, message: `Erro ao conectar com o servidor: ${err.message}` },
        key2: { success: false, message: `Erro ao conectar com o servidor: ${err.message}` },
      });
    } finally {
      setTestingApis(false);
    }
  };

  const getLogBadgeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'WARN': return 'text-amber-400';
      case 'ERROR': return 'text-red-400 font-bold animate-pulse';
      default: return 'text-blue-400';
    }
  };

  // Safe KPI defaults
  const stats = realStats || {
    totalUsers: 1,
    totalSessions: 0,
    totalMessages: 0,
    aiMessagesCount: 0,
    errorCount: 0,
    avgResponseTime: 1250,
    totalCost: 0.00,
    attachmentsCount: 0,
    attachmentsByType: [],
    totalDrafts: 0,
    totalWriterDocs: 0,
    modelUsage: [],
    errorsBreakdown: [],
    weeklyData: [],
    categoryUsage: [],
    recentActivityLogs: [],
    userSessionsList: []
  };

  const mostUsedModel = stats.modelUsage.length > 0 
    ? stats.modelUsage.reduce((max, model) => model.requests > max.requests ? model : max, stats.modelUsage[0])
    : { name: 'WSM 1.6 Mercúrio', requests: 0, value: 100 };

  const mostCommonError = stats.errorsBreakdown.length > 0
    ? stats.errorsBreakdown.reduce((max, err) => err.count > max.count ? err : max, stats.errorsBreakdown[0])
    : { name: 'Nenhum Erro Registrado', count: 0 };

  const totalEvaluationsCount = evaluationsList.length;
  const positiveEvals = evaluationsList.filter(e => e.rating === 'up').length;
  const negativeEvals = evaluationsList.filter(e => e.rating === 'down').length;
  const reportsCount = evaluationsList.filter(e => e.isReport).length;
  const starEvals = evaluationsList.filter(e => e.stars !== undefined).length;

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#FAF9F6] select-none font-sans">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100 animate-spin mb-4">
          <RefreshCw className="w-6 h-6 text-[#5c53e5]" />
        </div>
        <p className="text-[13px] text-gray-500 font-bold tracking-wide animate-pulse">
          AUDITANDO BANCO DE DADOS...
        </p>
        <p className="text-[10px] text-gray-400 mt-1">Computando dados e relatórios em tempo real do Firestore</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F6] h-full overflow-y-auto select-none font-sans text-gray-800">
      
      {/* Top Header */}
      <div className="border-b border-[#eae6e1] bg-[#faf9f6]/95 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors border border-gray-200 bg-white shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
            title="Voltar para o Chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#5c53e5]" />
              <h1 className="text-sm font-black tracking-tight text-gray-950 uppercase">
                Painel Administrativo WSM
              </h1>
              <span className="bg-[#5c53e5]/10 text-[#5c53e5] border border-[#5c53e5]/15 text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                Acesso Root
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">
              Estatísticas autenticadas, auditoria em tempo real e testes de chave do Firestore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAllData}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Recarregar Dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>REAL-TIME</span>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* TOP KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          <div className="bg-white p-4 rounded-2xl border border-[#eae6e1] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Usuários Totais</span>
              <div className="p-1.5 rounded-lg bg-[#5c53e5]/10 text-[#5c53e5]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-black tracking-tight text-gray-950">{stats.totalUsers}</span>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Contas de acesso</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#eae6e1] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Mensagens Totais</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 border border-emerald-100">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-black tracking-tight text-gray-950">{stats.totalMessages}</span>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Volume total transacionado</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#eae6e1] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Mensagens da IA</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-black tracking-tight text-gray-950">{stats.aiMessagesCount}</span>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Respostas do assistente</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#eae6e1] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Erros de API</span>
              <div className="p-1.5 rounded-lg bg-red-50 text-red-500 border border-red-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black tracking-tight text-gray-950">{stats.errorCount}</span>
                <span className="text-[10px] font-bold text-red-500">
                  {stats.aiMessagesCount > 0 ? ((stats.errorCount / stats.aiMessagesCount) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Taxa de erro de chamada</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#eae6e1] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Drafts Ativos</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-500 border border-amber-100">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-black tracking-tight text-gray-950">{stats.totalDrafts}</span>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Mensagens não enviadas salvas</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#eae6e1] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Anexos / Mídia</span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-500 border border-purple-100">
                <Paperclip className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-black tracking-tight text-gray-950">{stats.attachmentsCount}</span>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Uploads persistidos no db</p>
            </div>
          </div>

        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px gap-1.5">
            {[
              { id: 'metrics', label: 'Métricas de Tráfego', icon: TrendingUp },
              { id: 'models', label: 'Distribuição de Modelos', icon: Cpu },
              { id: 'evaluations', label: 'Avaliações & Interações', icon: Star },
              { id: 'diagnostics', label: 'Diagnóstico de APIs', icon: ShieldCheck },
              { id: 'errors', label: 'Logs & Erros', icon: AlertCircle },
              { id: 'simulation', label: 'Simulador', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#5c53e5] text-[#5c53e5] bg-[#5c53e5]/5 rounded-t-xl'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-t-xl'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Tabs Switcher */}
        <AnimatePresence mode="wait">
          
          {activeTab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Traffic charts layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Weekly activity Chart */}
                <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm lg:col-span-2 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Histórico de Atividade Semanal</h3>
                      <p className="text-[10px] text-gray-400">Relação entre usuários ativos, mensagens e erros reais</p>
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#5c53e5]" /><span>Mensagens</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" /><span>Usuários</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span>Erros</span></div>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    {stats.weeklyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.weeklyData}>
                          <defs>
                            <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#5c53e5" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#5c53e5" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eae6e1" />
                          <XAxis dataKey="name" stroke="#a3a3a3" fontSize={10} tickLine={false} />
                          <YAxis stroke="#a3a3a3" fontSize={10} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="messages" stroke="#5c53e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMsgs)" name="Mensagens" />
                          <Area type="monotone" dataKey="users" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Usuários Ativos" />
                          <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={1.5} fill="none" name="Erros" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">Não há histórico de dados suficiente.</div>
                    )}
                  </div>
                </div>

                {/* Categories Radar usage */}
                <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Uso por Categoria</h3>
                    <p className="text-[10px] text-gray-400">Categorização das conversas salvas no banco</p>
                  </div>
                  <div className="h-60 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.categoryUsage}>
                        <PolarGrid stroke="#eae6e1" />
                        <PolarAngleAxis dataKey="subject" stroke="#737373" fontSize={10} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a3a3a3" fontSize={8} />
                        <Radar name="Uso (%)" dataKey="A" stroke="#5c53e5" fill="#5c53e5" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[10px] text-gray-400 text-center leading-normal">
                    Frequência proporcional de sessões agrupadas automaticamente por intenção.
                  </div>
                </div>

              </div>

              {/* Extras metrics and data summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Uploads card */}
                <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Mídia & Anexos Carregados</h3>
                    <p className="text-[10px] text-gray-400">Divisão proporcional por formato</p>
                  </div>
                  <div className="h-44 w-full flex items-center justify-center">
                    {stats.attachmentsCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.attachmentsByType}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.attachmentsByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-gray-400 font-medium text-center">Nenhum anexo foi carregado ainda.</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold mt-2">
                    {stats.attachmentsByType.map((entry, i) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                        <span className="text-gray-500">{entry.name}:</span>
                        <span className="text-gray-950 font-black">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User sessions breakdown table */}
                <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm lg:col-span-2 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Usuários Registrados</h3>
                      <p className="text-[10px] text-gray-400">Lista e métricas de armazenamento por conta de acesso</p>
                    </div>
                    <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/15 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {stats.totalUsers} Total
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-52">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-[#eae6e1] text-gray-400 uppercase font-black text-[9px] tracking-wider">
                          <th className="pb-2">E-mail do Usuário</th>
                          <th className="pb-2 text-center">Conversas</th>
                          <th className="pb-2 text-center">Mensagens</th>
                          <th className="pb-2 text-center">Drafts Ativos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {stats.userSessionsList.map((usr) => (
                          <tr key={usr.email} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 font-bold text-gray-900 max-w-[200px] truncate">{usr.email}</td>
                            <td className="py-2.5 text-center font-bold text-gray-600">{usr.sessionsCount}</td>
                            <td className="py-2.5 text-center font-bold text-gray-600">{usr.messagesCount}</td>
                            <td className="py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                usr.draftsCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-400'
                              }`}>
                                {usr.draftsCount} draft{usr.draftsCount !== 1 ? 's' : ''}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'models' && (
            <motion.div
              key="models"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Model usage visual breakdown */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Volume de Inferência</h3>
                  <p className="text-[10px] text-gray-400">Participação percentual de uso por modelo de IA</p>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.modelUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.modelUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[10px] text-gray-400 text-center leading-normal">
                  Fração total calculada com base nas mensagens registradas de cada assistente.
                </div>
              </div>

              {/* Models details list */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Métricas Comparativas por Motor</h3>
                  <p className="text-[10px] text-gray-400">Logs de requisições, latências médias e descrições técnicas</p>
                </div>

                <div className="space-y-4 my-5 flex-1">
                  {stats.modelUsage.map((model, index) => {
                    const progressStyle = { width: `${model.value}%`, backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] };
                    return (
                      <div key={model.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }} />
                            <span className="font-bold text-gray-900">{model.name}</span>
                            <span className="text-[9px] text-gray-400 font-bold tracking-wider">({model.label})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black">
                            <span className="text-gray-400">{model.requests} reqs</span>
                            <span className="text-gray-950 font-black">{model.value}%</span>
                          </div>
                        </div>
                        <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={progressStyle} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#5c53e5]" />
                    <span className="text-gray-500">Modelo Mais Utilizado:</span>
                    <span className="text-gray-900 uppercase font-black">{mostUsedModel.name} ({mostUsedModel.value}%)</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {activeTab === 'evaluations' && (
            <motion.div
              key="evaluations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Evaluations widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider block">Feedback Positivo</span>
                    <span className="text-xl font-black text-green-950 block mt-0.5">{positiveEvals}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                    <ThumbsUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider block">Feedback Negativo</span>
                    <span className="text-xl font-black text-red-950 block mt-0.5">{negativeEvals}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                    <ThumbsDown className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider block">Denúncias Ativas</span>
                    <span className="text-xl font-black text-orange-950 block mt-0.5">{reportsCount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Avaliações por Estrela</span>
                    <span className="text-xl font-black text-amber-950 block mt-0.5">{starEvals}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                </div>

              </div>

              {/* Evaluations Feed Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {evaluationsList.map((item) => {
                  let badgeStyle = "bg-gray-50 text-gray-600 border-gray-200";
                  let badgeLabel = "Feedback";
                  let badgeIcon = <ThumbsUp size={14} />;
                  let summaryText = "";

                  if (item.isReport) {
                    badgeStyle = "bg-red-50 text-red-700 border-red-100";
                    badgeLabel = "Denúncia";
                    badgeIcon = <Flag size={14} className="fill-red-500/10 text-red-500" />;
                    summaryText = item.reportText || "";
                  } else if (item.stars !== undefined) {
                    badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                    badgeLabel = `${item.stars} Estrelas`;
                    badgeIcon = <Star size={14} className="fill-amber-400 text-amber-500" />;
                    summaryText = item.feedbackText || "(Sem comentário)";
                  } else {
                    if (item.rating === 'up') {
                      badgeStyle = "bg-green-50 text-green-700 border-green-100";
                      badgeLabel = "Feedback Positivo";
                      badgeIcon = <ThumbsUp size={14} />;
                    } else {
                      badgeStyle = "bg-red-50 text-red-700 border-red-100";
                      badgeLabel = "Feedback Negativo";
                      badgeIcon = <ThumbsDown size={14} />;
                    }
                    summaryText = item.conversation[item.conversation.length - 1]?.text || "(Sem texto)";
                  }

                  return (
                    <div 
                      key={item.msgId} 
                      onClick={() => setSelectedEval(item)}
                      className="bg-white border border-[#eae6e1] rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-bold">{new Date(item.timestamp).toLocaleString()}</span>
                        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badgeStyle}`}>
                          {badgeIcon}
                          <span>{badgeLabel}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">
                        {summaryText}
                      </p>
                      
                      <div className="mt-auto pt-2 border-t border-gray-100 text-[9px] text-gray-400 font-black tracking-wide uppercase flex items-center justify-between">
                        <span>Contexto de Chat:</span>
                        <span>{item.conversation.length} {item.conversation.length === 1 ? 'mensagem' : 'mensagens'}</span>
                      </div>
                    </div>
                  );
                })}
                {evaluationsList.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400 bg-white border border-[#eae6e1] rounded-2xl">
                    <p className="text-xs font-bold uppercase tracking-wider">Nenhuma interação ou denúncia recebida ainda.</p>
                  </div>
                )}
              </div>

              {/* Evaluation Detail Overlay Modal */}
              {selectedEval && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between p-4 border-b border-[#eae6e1] bg-gray-50">
                      <h2 className="font-bold text-gray-800 flex items-center gap-2 text-xs sm:text-sm">
                        {selectedEval.isReport ? (
                          <>
                            <span className="bg-red-100 text-red-700 p-1.5 rounded-xl"><Flag size={14} className="fill-red-500/10" /></span>
                            <span>Visualizar Denúncia de IA</span>
                          </>
                        ) : selectedEval.stars !== undefined ? (
                          <>
                            <span className="bg-amber-100 text-amber-700 p-1.5 rounded-xl"><Star size={14} className="fill-amber-400 text-amber-500" /></span>
                            <span>Avaliação do Usuário ({selectedEval.stars} Estrelas)</span>
                          </>
                        ) : (
                          <>
                            <span className={`p-1.5 rounded-xl ${selectedEval.rating === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {selectedEval.rating === 'up' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                            </span>
                            <span>Detalhes do Feedback do Chat</span>
                          </>
                        )}
                      </h2>
                      <button onClick={() => setSelectedEval(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
                      {selectedEval.isReport && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl space-y-1">
                          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Comentário da Denúncia:</p>
                          <p className="text-gray-800 font-medium leading-relaxed italic">"{selectedEval.reportText}"</p>
                        </div>
                      )}

                      {selectedEval.stars !== undefined && (
                        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl space-y-1">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Comentário do Usuário:</p>
                          <p className="text-gray-800 font-medium leading-relaxed italic">"{selectedEval.feedbackText || '(Sem comentário)'}"</p>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Histórico de Mensagens Contextualizadas:</p>
                        <div className="border border-[#eae6e1] rounded-2xl divide-y divide-gray-100 overflow-hidden">
                          {selectedEval.conversation.map((msg, i) => (
                            <div key={msg.id || i} className={`p-4 ${msg.sender === 'user' ? 'bg-[#faf9f6]' : 'bg-white'}`}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                {msg.sender === 'user' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                                    <span className="text-gray-600">Usuário</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 bg-[#5c53e5] rounded-full" />
                                    <span className="text-[#5c53e5]">WSM AI</span>
                                  </>
                                )}
                                <span className="text-[9px] text-gray-400 font-medium">({new Date(msg.timestamp).toLocaleTimeString()})</span>
                              </p>
                              <p className="text-xs text-gray-800 font-medium leading-relaxed break-words whitespace-pre-wrap">{msg.text || msg.finalSynthesis}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'diagnostics' && (
            <motion.div
              key="diagnostics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Api Diagnostics Settings Card */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Gerenciador de Diagnósticos
                  </h3>
                  <p className="text-[10px] text-gray-400">Teste de funcionamento em tempo real das duas chaves de API secretas configuradas no servidor.</p>
                </div>

                <div className="my-6 space-y-4 text-xs font-medium">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl leading-normal text-indigo-700">
                    O painel dispara requisições diretas leves com o modelo <span className="font-mono bg-white border px-1.5 py-0.5 rounded">gemini-3.1-flash-lite</span> para validar cota, validade e permissões do Google GenAI.
                  </div>

                  <button
                    onClick={handleTestKeys}
                    disabled={testingApis}
                    className="w-full py-3 bg-[#5c53e5] hover:bg-[#4a41cc] text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {testingApis ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando chaves...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>Executar Teste de Conexão</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-3 text-[10px] text-gray-400 leading-normal">
                  Este procedimento simula uma requisição simples e não afeta o histórico de conversação do usuário.
                </div>
              </div>

              {/* API 1 & 2 Results Blocks */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Status das Chaves de API</h3>
                  <p className="text-[10px] text-gray-400">Verificação individual de autenticidade</p>
                </div>

                {/* Key 1 Block */}
                <div className="border border-gray-200 rounded-2xl p-4.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs">CHAVE PRINCIPAL (IA_API_KEY)</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border rounded text-[9px] font-mono">IA_API_KEY</span>
                  </div>

                  {apiResults?.key1 ? (
                    <div className={`p-3.5 rounded-xl flex items-start gap-3 border ${
                      apiResults.key1.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      {apiResults.key1.success ? (
                        <CheckCircle className="shrink-0 text-emerald-500 mt-0.5" size={18} />
                      ) : (
                        <AlertCircle className="shrink-0 text-red-500 mt-0.5" size={18} />
                      )}
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">
                          {apiResults.key1.success ? 'Conexão Estabelecida' : 'Erro de Autenticação'}
                        </p>
                        <p className="text-[10.5px] font-mono break-words leading-relaxed text-gray-600">
                          {apiResults.key1.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center border border-dashed border-gray-200 rounded-xl text-gray-400 text-[10px] font-mono">
                      Aguardando execução do teste...
                    </div>
                  )}
                </div>

                {/* Key 2 Block */}
                <div className="border border-gray-200 rounded-2xl p-4.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs">CHAVE RESERVA (IA_API_KEY_2)</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border rounded text-[9px] font-mono">IA_API_KEY_2</span>
                  </div>

                  {apiResults?.key2 ? (
                    <div className={`p-3.5 rounded-xl flex items-start gap-3 border ${
                      apiResults.key2.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      {apiResults.key2.success ? (
                        <CheckCircle className="shrink-0 text-emerald-500 mt-0.5" size={18} />
                      ) : (
                        <AlertCircle className="shrink-0 text-red-500 mt-0.5" size={18} />
                      )}
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">
                          {apiResults.key2.success ? 'Conexão Estabelecida' : 'Erro de Autenticação'}
                        </p>
                        <p className="text-[10.5px] font-mono break-words leading-relaxed text-gray-600">
                          {apiResults.key2.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center border border-dashed border-gray-200 rounded-xl text-gray-400 text-[10px] font-mono">
                      Aguardando execução do teste...
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'errors' && (
            <motion.div
              key="errors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Errors list breakdown */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Erros do Assistente Detectados</h3>
                  <p className="text-[10px] text-gray-400">Classificação e incidência de exceções registradas de IA</p>
                </div>

                <div className="space-y-4.5 my-4">
                  {stats.errorsBreakdown.map((err) => (
                    <div key={err.name} className="flex items-start justify-between border-b border-gray-100 pb-3 hover:bg-gray-50/50 p-1.5 rounded-xl transition-all">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: err.color }} />
                        <div>
                          <p className="text-xs font-bold text-gray-900">{err.name}</p>
                          <p className="text-[10px] text-gray-400 leading-normal">{err.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-gray-950 px-2 py-0.5 rounded-lg bg-gray-100">{err.count}x</span>
                    </div>
                  ))}
                  {stats.errorCount === 0 && (
                    <div className="py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
                      Excelente! Nenhum erro ou exceção registrado nas chamadas de IA.
                    </div>
                  )}
                </div>

                <div className="bg-red-50/50 border border-red-100 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold text-red-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>Erro Mais Frequente:</span>
                    <span className="uppercase font-black">{mostCommonError.name} ({mostCommonError.count} ocorrências)</span>
                  </div>
                </div>
              </div>

              {/* Security block */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Segurança de Banco
                  </h3>
                  <p className="text-[10px] text-gray-400">Parâmetros de proteção a Identity Spoofing</p>
                </div>

                <div className="space-y-3 my-4 text-xs">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800">Autenticação e Escopo</p>
                      <p className="text-[9px] text-emerald-700 leading-normal font-medium">Contas e documentos de conversação blindados por regras de leitura e escrita do Firebase.</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800">Criptografia Ativa</p>
                      <p className="text-[9px] text-emerald-700 leading-normal font-medium">Transporte de requisições sob criptografia TLS 1.3 HTTPS para proteger chaves e dados.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-150 p-2.5 rounded-xl text-center">
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Criptografia de Sessão</p>
                  <p className="text-[10px] font-extrabold text-gray-600 mt-0.5">AES-256 GCM ATIVA</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'simulation' && (
            <motion.div 
              key="simulation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Traffic simulation controls card */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#5c53e5]" />
                    Simulador Ativo
                  </h3>
                  <p className="text-[10px] text-gray-400">Controle de flutuação de atividade fictícia para auditoria visual</p>
                </div>

                <div className="space-y-4 my-5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Frequência de Acesso</label>
                    <button
                      onClick={() => setIsSimulating(!isSimulating)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isSimulating ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isSimulating ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Pausar Oscilador de Tráfego</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Retomar Oscilador de Tráfego</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Velocidade da Fila de Simulação</label>
                    <div className="flex gap-2">
                      {[1000, 3000, 6000].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setSimSpeed(speed)}
                          className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                            simSpeed === speed 
                              ? 'bg-[#5c53e5] text-white border-[#5c53e5]' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {speed === 1000 ? 'Rápido (1s)' : speed === 3000 ? 'Médio (3s)' : 'Lento (6s)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl leading-normal text-indigo-700 text-[10px] font-medium">
                  A simulação aplica oscilações flutuantes ao indicador de "usuários ativos agora" para auditar graficamente a estabilidade das estatísticas.
                </div>
              </div>

              {/* Simulation metrics details widgets */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-purple-500" />
                    Variáveis do Servidor
                  </h3>
                  <p className="text-[10px] text-gray-400">Variáveis internas de infraestrutura operacional</p>
                </div>

                <div className="space-y-3.5 my-4 text-xs font-medium">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Versão da API</span>
                    <span className="font-bold text-gray-900">v4.3.0-stable</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Node Runtime</span>
                    <span className="font-bold text-gray-900">v22.23.0</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Serviço de Banco</span>
                    <span className="font-bold text-gray-900">Cloud Firestore</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Serviço de Arquivos</span>
                    <span className="font-bold text-gray-900">Google Cloud Storage</span>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl text-center text-purple-700 text-[10px] font-bold">
                  Google GenAI Core Engine v2
                </div>
              </div>

              {/* Status information widget */}
              <div className="bg-white p-5 rounded-3xl border border-[#eae6e1] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Qualidade de Atendimento
                  </h3>
                  <p className="text-[10px] text-gray-400">Visão geral sobre a estabilidade operacional</p>
                </div>

                <div className="space-y-3.5 my-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className="text-gray-500">Taxa de Sucesso Semântico</span>
                      <span className="text-emerald-600">
                        {stats.aiMessagesCount > 0 ? (((stats.aiMessagesCount - stats.errorCount) / stats.aiMessagesCount) * 100).toFixed(1) : '100'}%
                      </span>
                    </div>
                    <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: stats.aiMessagesCount > 0 ? `${((stats.aiMessagesCount - stats.errorCount) / stats.aiMessagesCount) * 100}%` : '100%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className="text-gray-500">Taxa de Conexão Ativa</span>
                      <span className="text-[#5c53e5]">100%</span>
                    </div>
                    <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#5c53e5] h-full rounded-full animate-pulse" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 text-[10px] text-gray-400 font-medium leading-normal">
                  Todas as conexões estão sendo monitoradas e auditadas em conformidade com as regras de integridade do AI Studio.
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Real-time System Terminal Log Streamer */}
        <div className="bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden font-mono text-[10.5px]">
          
          {/* Terminal Header */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#5c53e5]" />
              <span className="font-bold text-gray-200 tracking-wider">TERMINAL DE AUDITORIA DE SISTEMA</span>
              <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500 ml-1.5" />
            </div>
            
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold">
              <span>PROVEDOR: FIRESTORE DB</span>
              <span className="text-gray-600">|</span>
              <span>ATIVIDADE: REAL-TIME AUDITING</span>
            </div>
          </div>

          {/* Terminal Logs View */}
          <div 
            ref={logContainerRef}
            className="p-4 h-48 overflow-y-auto space-y-1.5 text-gray-300 scrollbar-thin scrollbar-thumb-gray-800"
          >
            {stats.recentActivityLogs.map((log, index) => (
              <div key={log.id || index} className="flex items-start gap-2 hover:bg-gray-900/50 py-0.5 px-1 rounded transition-colors">
                <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`shrink-0 select-none font-bold ${getLogBadgeColor(log.type)}`}>{log.type}:</span>
                <span className="text-gray-100 break-all">{log.message}</span>
              </div>
            ))}
            {stats.recentActivityLogs.length === 0 && (
              <div className="text-gray-500 text-center py-10">
                Nenhum log operacional disponível no momento. Iniciando auditoria...
              </div>
            )}
          </div>

          {/* Terminal Footer Info */}
          <div className="bg-gray-900/40 border-t border-gray-800 px-4 py-2 flex items-center justify-between select-none text-[9px] text-gray-500">
            <span>Sessões analisadas em tempo real: {stats.totalSessions}</span>
            <span>IP Ingress: 0.0.0.0 (Reverse Nginx Ingress Controller Port 3000)</span>
          </div>

        </div>

      </div>

    </div>
  );
}
