import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Layers, 
  FileCheck2, 
  Terminal, 
  Search, 
  X, 
  Play, 
  AlertTriangle, 
  Cpu, 
  Globe, 
  FolderCheck, 
  Database, 
  Calendar,
  ChevronRight,
  Filter,
  Check,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutionLedgerEntry, ExecutionState } from '../types';

interface ExecutionLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ExecutionLedgerEntry[];
  onApproveRun?: (runId: string) => void;
  onCancelRun?: (runId: string) => void;
  onRetryRun?: (runId: string) => void;
}

const STATE_CONFIG: Record<ExecutionState, { label: string; bg: string; text: string; border: string; desc: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', desc: 'Intenção entendida; plano ainda não confirmado' },
  awaiting_approval: { label: 'Aguardando Aprovação', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', desc: 'Ação com risco ou custo externo detectada' },
  queued: { label: 'Em Fila', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', desc: 'Aguardando liberação de recursos' },
  running: { label: 'Executando', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', desc: 'Executor ativo no ecossistema' },
  waiting_user: { label: 'Aguardando Usuário', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', desc: 'Login, CAPTCHA ou esclarecimento de ambiguidade' },
  validating: { label: 'Validando', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', desc: 'Verificando critérios de aceitação e integridade' },
  succeeded: { label: 'Sucesso', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', desc: 'Critérios atendidos na totalidade' },
  partially_succeeded: { label: 'Parcialmente Concluído', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', desc: 'Entrega parcial com aviso de etapa interrompida' },
  failed: { label: 'Falhou', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', desc: 'Sem resultado aceitável; falha de execução' },
  cancelled: { label: 'Cancelado', bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300', desc: 'Interrompido por política ou pelo usuário' },
  auth_required: { label: 'Reautenticação Necessária (401/419)', bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-400', desc: 'Execução congelada: Token de acesso expirado ou credencial rejeitada.' },
};

export default function ExecutionLedgerModal({
  isOpen,
  onClose,
  entries,
  onApproveRun,
  onCancelRun,
  onRetryRun
}: ExecutionLedgerModalProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(entries[0]?.runId || null);
  const [filterState, setFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredEntries = entries.filter(e => {
    const matchesFilter = filterState === 'all' || e.state === filterState;
    const matchesSearch = e.intentGoal.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.runId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeEntry = entries.find(e => e.runId === selectedRunId) || filteredEntries[0] || entries[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden border border-[#eae6e1]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#eae6e1] bg-[#fbf9f6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Ledger de Execução Agêntica (SO de Tarefas)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black text-white uppercase tracking-wider">
                  OMNIX OS v2.5
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Registro imutável de intenções, aprovações, orquestração de ferramentas e auditoria de estado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Architecture Diagram Quick Reference Bar */}
        <div className="bg-[#f4f1ea] border-b border-[#eae6e1] px-6 py-2.5 flex items-center gap-2 text-[11px] overflow-x-auto text-gray-700 shrink-0 font-medium">
          <span className="font-bold text-gray-900 uppercase tracking-wider text-[10px] mr-1">Camadas do SO:</span>
          <span className="bg-white px-2 py-1 rounded border border-[#eae6e1] flex items-center gap-1 shrink-0">
            1. Intenção & Limites
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="bg-white px-2 py-1 rounded border border-[#eae6e1] flex items-center gap-1 shrink-0">
            2. Planejador Estruturado
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="bg-white px-2 py-1 rounded border border-[#eae6e1] flex items-center gap-1 shrink-0">
            3. Orquestrador de Execução
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="bg-white px-2 py-1 rounded border border-[#eae6e1] flex items-center gap-1 shrink-0">
            4. Validador de Saída
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="bg-emerald-600 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 shrink-0 shadow-2xs">
            5. Ledger de Histórico
          </span>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Executions List */}
          <div className="w-80 md:w-96 border-r border-[#eae6e1] bg-[#fcfbf9] flex flex-col shrink-0">
            {/* Search and Filters */}
            <div className="p-3.5 border-b border-[#eae6e1] space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Buscar por Run ID, meta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#eae6e1] rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <select 
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full bg-white border border-[#eae6e1] rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Estados ({entries.length})</option>
                <option value="running">Executando (running)</option>
                <option value="awaiting_approval">Aguardando Aprovação (awaiting_approval)</option>
                <option value="succeeded">Sucesso (succeeded)</option>
                <option value="partially_succeeded">Parcialmente Concluído (partially_succeeded)</option>
                <option value="failed">Falha (failed)</option>
                <option value="cancelled">Cancelado (cancelled)</option>
                <option value="auth_required">Reautenticação Necessária (auth_required)</option>
              </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#eae6e1]">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Nenhuma execução encontrada.
                </div>
              ) : (
                filteredEntries.map(entry => {
                  const cfg = STATE_CONFIG[entry.state] || STATE_CONFIG.running;
                  const isSelected = activeEntry?.runId === entry.runId;

                  return (
                    <button
                      key={entry.runId}
                      onClick={() => setSelectedRunId(entry.runId)}
                      className={`w-full p-3.5 text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-white border-l-4 border-l-black shadow-2xs' 
                          : 'hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-200/80 px-1.5 py-0.5 rounded">
                          {entry.runId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-gray-900 line-clamp-1">
                        {entry.intentGoal}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                        <span>{new Date(entry.startedAt).toLocaleTimeString('pt-BR')}</span>
                        <span>{entry.steps.filter(s => s.status === 'completed').length}/{entry.steps.length} Passos</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected Execution Ledger Details */}
          {activeEntry ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
              
              {/* Execution Summary Header Banner */}
              <div className="p-5 rounded-2xl border border-[#eae6e1] bg-[#fbf9f5] flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-black text-white px-2.5 py-1 rounded-md">
                      {activeEntry.runId}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATE_CONFIG[activeEntry.state].bg} ${STATE_CONFIG[activeEntry.state].text} ${STATE_CONFIG[activeEntry.state].border}`}>
                      {STATE_CONFIG[activeEntry.state].label}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      Sessão: {activeEntry.sessionTitle}
                    </span>
                  </div>

                  <h1 className="text-base font-bold text-gray-900 leading-snug">
                    {activeEntry.intentGoal}
                  </h1>

                  <p className="text-xs text-gray-600">
                    {STATE_CONFIG[activeEntry.state].desc}
                  </p>
                </div>

                {/* Interactive Action Triggers */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeEntry.state === 'awaiting_approval' && (
                    <button
                      onClick={() => onApproveRun && onApproveRun(activeEntry.runId)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Aprovar Execução
                    </button>
                  )}

                  {activeEntry.state === 'running' && (
                    <button
                      onClick={() => onCancelRun && onCancelRun(activeEntry.runId)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pause className="w-4 h-4" /> Interromper
                    </button>
                  )}

                  {(activeEntry.state === 'failed' || activeEntry.state === 'cancelled') && (
                    <button
                      onClick={() => onRetryRun && onRetryRun(activeEntry.runId)}
                      className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4" /> Retentar Tarefa
                    </button>
                  )}

                  {activeEntry.state === 'auth_required' && (
                    <button
                      onClick={() => onRetryRun && onRetryRun(activeEntry.runId)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4" /> Reautenticar e Retomar
                    </button>
                  )}
                </div>
              </div>

              {/* Prominent Auth Error / Run Center Failure Breakdown */}
              {(activeEntry.state === 'auth_required' || activeEntry.authDetails || activeEntry.errorMessage) && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Detalhes de Interrupção & Diagnóstico do Executor</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Causa</span>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {activeEntry.authDetails?.cause || activeEntry.errorMessage || 'Falha de autenticação ou credencial expirada (HTTP 401/419).'}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Etapa do Diagnóstico</span>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {activeEntry.authDetails?.stage || '2. Validação de Credencial e Comunicação de API'}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Ação Recomendada</span>
                      <p className="font-medium text-amber-900 font-semibold mt-0.5">
                        {activeEntry.authDetails?.recommendedAction || 'Renove seu token de acesso efetuando reautenticação para prosseguir.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* State Machine Criteria Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#eae6e1] bg-white space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Restrições & Limites</span>
                  <p className="text-xs font-medium text-gray-800">
                    {activeEntry.constraints?.join(', ') || 'Sem restrições adicionais'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#eae6e1] bg-white space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Nível de Risco</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    activeEntry.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    activeEntry.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeEntry.riskLevel}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-[#eae6e1] bg-white space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tempo & Tokens</span>
                  <p className="text-xs font-medium text-gray-800">
                    {activeEntry.durationMs ? `${(activeEntry.durationMs / 1000).toFixed(1)}s` : 'Em andamento'} | {activeEntry.tokensUsed || 350} tokens
                  </p>
                </div>
              </div>

              {/* Step Execution Sequence */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-black" /> Sequência de Ferramentas e Ações do Executor
                </h3>

                <div className="divide-y divide-[#eae6e1] border border-[#eae6e1] rounded-xl overflow-hidden bg-white">
                  {activeEntry.steps.map((step, idx) => (
                    <div key={step.id} className="p-3.5 flex items-start justify-between gap-4 text-xs">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900">{step.name}</p>
                          <p className="text-gray-500 text-[11px]">{step.details || 'Sem detalhes'}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 uppercase tracking-wider ${
                        step.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        step.status === 'running' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                        step.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acceptance Criteria & Validation Layer */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-purple-600" /> Validações de Saída e Critérios de Aceitação
                </h3>

                <div className="space-y-2">
                  {activeEntry.validations.map((val) => (
                    <div key={val.id} className="p-3 rounded-xl border border-[#eae6e1] bg-white flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">{val.description}</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                        val.status === 'passed' ? 'bg-emerald-100 text-emerald-800' :
                        val.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {val.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Logs Console */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" /> Console de Evidências e Providências
                </h3>

                <div className="bg-gray-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl space-y-1.5 max-h-48 overflow-y-auto leading-relaxed shadow-inner">
                  {activeEntry.evidenceLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-gray-600 select-none">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              Selecione uma execução para ver os detalhes do Ledger.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
