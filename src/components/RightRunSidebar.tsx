import React, { useState } from 'react';
import { OmnixRun, RunStep, DetailedToolCall } from '../types';
import { 
  CheckCircle2,
  X, 
  Clock, 
  AlertCircle, 
  Terminal, 
  Workflow, 
  ShieldCheck, 
  RefreshCw, 
  Layers, 
  FileCheck2, 
  PlayCircle,
  ExternalLink,
  Lock,
  ChevronRight,
  Activity,
  Cpu,
  Info
} from 'lucide-react';

interface RightRunSidebarProps {
  run: OmnixRun | null;
  isOpen?: boolean;
  onClose?: () => void;
  isStreaming?: boolean;
}

export const RightRunSidebar: React.FC<RightRunSidebarProps> = ({
  run,
  isOpen = true,
  onClose,
  isStreaming = false
}) => {
  const [activeTab, setActiveTab] = useState<'etapas' | 'fontes'>('etapas');
  const [selectedToolCall, setSelectedToolCall] = useState<DetailedToolCall | null>(null);

  if (!isOpen) return null;

  const steps = run?.plan?.steps || [
    {
      id: 'step_default_1',
      title: 'Interpretando pedido do usuário',
      description: 'Analisando requisitos e contexto para estruturar o plano de execução.',
      status: isStreaming ? 'running' : 'completed'
    },
    {
      id: 'step_default_2',
      title: 'Gerando conteúdo e síntese',
      description: 'Sintetizando informações e preparando entregáveis.',
      status: isStreaming ? 'running' : 'completed'
    }
  ];

  const toolCalls = run?.toolCalls || [];
  const tests = run?.plan?.verifiableTests || [];

  return (
    <aside className="w-80 md:w-96 shrink-0 h-full bg-[#fcfbf9] dark:bg-[#121212] border-l border-[#eae6e1] dark:border-zinc-800 flex flex-col font-sans select-none overflow-hidden relative z-10">
      {/* Top Segmented Pill Switcher (Matching Reference Image) */}
      <div className="p-3 border-b border-[#eae6e1] dark:border-zinc-800 bg-[#f7f5f0]/80 dark:bg-zinc-900/80 backdrop-blur-xs flex items-center justify-center shrink-0 relative">
        <div className="bg-[#eae7e1] dark:bg-zinc-800 p-1 rounded-full flex items-center w-full max-w-[260px] text-xs font-semibold shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('etapas')}
            className={`flex-1 py-1.5 px-4 rounded-full text-center transition-all duration-200 cursor-pointer ${
              activeTab === 'etapas'
                ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Etapas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fontes')}
            className={`flex-1 py-1.5 px-4 rounded-full text-center transition-all duration-200 cursor-pointer ${
              activeTab === 'fontes'
                ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Fontes / Run
          </button>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:bg-[#eae7e1] dark:hover:bg-zinc-800 rounded-full cursor-pointer transition-colors"
            title="Fechar Painel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Tab Viewports */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* TAB 1: ETAPAS (Exact visual match to the reference screenshot) */}
        {activeTab === 'etapas' && (
          <div className="space-y-6 pt-1">
            {/* Header subtext */}
            <div className="flex items-center justify-between pb-2 border-b border-[#eae6e1] dark:border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Linha do Tempo de Execução
              </span>
              {isStreaming && steps.some(s => s.status === 'running' || s.status === 'pending') ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  Executando em tempo real
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Execução Concluída
                </span>
              )}
            </div>

            {/* Vertical Steps List */}
            <div className="relative space-y-6 pl-1">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isRunning = step.status === 'running';
                const isReplanned = step.status === 'replanned';
                const isCompleted = step.status === 'completed';

                return (
                  <div key={step.id || idx} className="relative flex items-start gap-3.5 group">
                    {/* Vertical Connecting Line */}
                    {!isLast && (
                      <div className="absolute top-4.5 bottom-[-24px] left-[5.5px] w-[1.5px] bg-[#e2ded8] dark:bg-zinc-800 -z-0" />
                    )}

                    {/* Bullet Point Circle Icon (Matching grey/black filled dots in screenshot, or checkmark when complete) */}
                    <div className="relative z-10 shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="w-[13px] h-[13px] rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center text-white ring-2 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs">
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : isRunning ? (
                        <div className="w-[13px] h-[13px] rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-950/60 animate-pulse flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      ) : isReplanned ? (
                        <div className="w-[11px] h-[11px] rounded-full bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-950/60" />
                      ) : (
                        <div className="w-[11px] h-[11px] rounded-full bg-[#3e3e3e] dark:bg-[#c5c5c5]" />
                      )}
                    </div>

                    {/* Content text */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className={`font-bold text-[13.5px] leading-snug tracking-tight transition-all duration-200 ${
                          isCompleted 
                            ? 'line-through text-stone-400 dark:text-stone-500 decoration-[#1a1a1a]/30 dark:decoration-stone-700' 
                            : 'text-[#1a1a1a] dark:text-[#f0f0f0]'
                        }`}>
                          {step.title}
                        </h4>
                        {isReplanned && (
                          <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900 shrink-0">
                            Replanejado
                          </span>
                        )}
                      </div>
                      <p className={`text-[12.5px] leading-relaxed font-normal font-sans transition-all duration-200 ${
                        isCompleted 
                          ? 'line-through text-stone-400/80 dark:text-stone-500/80 decoration-[#5c5c5c]/20 dark:decoration-stone-800' 
                          : 'text-[#5c5c5c] dark:text-[#a3a3a3]'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: FONTES / RUN (Detailed Run Center dashboard) */}
        {activeTab === 'fontes' && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Objective Banner */}
            <div className="bg-white dark:bg-zinc-900 border border-[#eae6e1] dark:border-zinc-800 rounded-2xl p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
                <span>Objetivo do Run</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">ID: {run?.id.slice(0, 10) || 'run_root'}</span>
              </div>
              <p className="font-bold text-stone-900 dark:text-stone-100 text-[13px] leading-snug">
                {run?.objective || 'Processamento agêntico e síntese verificável'}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-mono">
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Progresso</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{run?.progressPercentage || 100}%</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Custo Aprox.</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    ${run?.approxCost?.amount ? run.approxCost.amount.toFixed(4) : '0.0018'} USD
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-400 block">Tempo Decorrido</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    {run?.elapsedTimeMs ? `${run.elapsedTimeMs}ms` : '1.2s'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tool Calls Log Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-600" />
                  Chamadas de Ferramentas ({toolCalls.length})
                </span>
                {run?.plan?.replanCount ? (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {run.plan.replanCount} Replanejamentos
                  </span>
                ) : null}
              </div>

              {toolCalls.length === 0 ? (
                <div className="bg-stone-50 dark:bg-zinc-900/50 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl p-3 text-stone-500 text-[11px] text-center">
                  Nenhuma chamada externa efetuada. Execução direta do modelo.
                </div>
              ) : (
                <div className="space-y-2">
                  {toolCalls.map((tc, idx) => (
                    <div 
                      key={tc.id || idx}
                      onClick={() => setSelectedToolCall(selectedToolCall?.id === tc.id ? null : tc)}
                      className="bg-white dark:bg-zinc-900 border border-[#eae6e1] dark:border-zinc-800 rounded-xl p-2.5 space-y-1.5 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[11.5px] text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-blue-600" />
                          {tc.tool_name}
                        </span>
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                          tc.status === 'success' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : tc.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {tc.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-zinc-800">
                        <div>
                          <span className="font-bold text-stone-400">Risco:</span>{' '}
                          <span className={tc.risk === 'high' || tc.risk === 'critical' ? 'text-rose-600 font-bold' : 'text-stone-700 dark:text-stone-300'}>
                            {tc.risk.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-stone-400">Permissão:</span>{' '}
                          <span className="text-stone-700 dark:text-stone-300">{tc.permission}</span>
                        </div>
                      </div>

                      {/* Expanded View of arguments */}
                      {selectedToolCall?.id === tc.id && (
                        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-zinc-800 space-y-1.5 text-[10.5px] font-mono bg-stone-50 dark:bg-zinc-950/60 p-2 rounded-lg">
                          <div>
                            <span className="font-bold text-stone-600 dark:text-stone-400 block">Entrada Normalizada:</span>
                            <span className="text-stone-800 dark:text-stone-200 break-all">{tc.normalized_input}</span>
                          </div>
                          {tc.arguments && (
                            <div>
                              <span className="font-bold text-stone-600 dark:text-stone-400 block">Argumentos:</span>
                              <pre className="text-[9.5px] text-stone-700 dark:text-stone-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(tc.arguments, null, 2)}
                              </pre>
                            </div>
                          )}
                          {tc.result_ref && (
                            <div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Resultado Ref:</span>
                              <span className="text-stone-800 dark:text-stone-200">{tc.result_ref}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validator Verifiable Tests Section */}
            <div className="bg-white dark:bg-zinc-900 border border-[#eae6e1] dark:border-zinc-800 rounded-2xl p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-stone-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Validador & Testes ({tests.length})
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {tests.filter(t => t.status === 'passed').length} / {tests.length} Aprovados
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {tests.map((test, tIdx) => (
                  <div key={test.id || tIdx} className="flex items-start gap-2 text-[11px] border-b border-stone-100 dark:border-zinc-800/80 pb-1.5 last:border-0 last:pb-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-800 dark:text-stone-200 block leading-tight">{test.name}</span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">{test.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            {run?.nextSteps && run.nextSteps.length > 0 && (
              <div className="bg-[#f5f3ee] dark:bg-zinc-900/60 border border-[#eae6e1] dark:border-zinc-800 rounded-2xl p-3 space-y-1.5 text-[11px]">
                <span className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider text-[10px] block">
                  Próximos Passos
                </span>
                <ul className="space-y-1 text-stone-600 dark:text-stone-400 pl-3 list-disc">
                  {run.nextSteps.map((ns, nIdx) => (
                    <li key={nIdx}>{ns}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
