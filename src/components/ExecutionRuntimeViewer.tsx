import React, { useState, useEffect } from 'react';
import { formatTimeSafely } from '../utils/dateUtils';
import { ExecutionTask, ExecutionStepRecord } from '../types';
import { getLocalTaskGraph } from '../utils/executionRuntime';
import { 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertOctagon, 
  PauseCircle, 
  DollarSign, 
  Key, 
  ChevronDown, 
  ChevronUp, 
  FileCheck,
  Terminal,
  Activity,
  Workflow
} from 'lucide-react';

interface ExecutionRuntimeViewerProps {
  sessionId?: string;
}

export const ExecutionRuntimeViewer: React.FC<ExecutionRuntimeViewerProps> = ({ sessionId }) => {
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ExecutionTask | null>(null);

  useEffect(() => {
    const loadedTasks = getLocalTaskGraph(sessionId);
    setTasks(loadedTasks);
    if (loadedTasks.length > 0 && !selectedTask) {
      setSelectedTask(loadedTasks[loadedTasks.length - 1]);
    }

    const interval = setInterval(() => {
      const updated = getLocalTaskGraph(sessionId);
      setTasks(updated);
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (tasks.length === 0) return null;

  const getTaskStatusBadge = (status: ExecutionTask['status']) => {
    switch (status) {
      case 'succeeded':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50 animate-pulse';
      case 'awaiting_confirmation':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
      case 'blocked':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700';
      default: // planned
        return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-900 dark:text-gray-400 dark:border-zinc-800';
    }
  };

  const getTaskStatusLabel = (status: ExecutionTask['status']) => {
    switch (status) {
      case 'succeeded': return 'Sucesso';
      case 'failed': return 'Falhou';
      case 'running': return 'Em Execução';
      case 'awaiting_confirmation': return 'Aguardando Confirmação';
      case 'blocked': return 'Bloqueado';
      case 'cancelled': return 'Cancelado';
      default: return 'Planejado';
    }
  };

  return (
    <div className="w-full my-3 border border-[#eae6e1] dark:border-[#2e2e2e] rounded-2xl bg-[#faf9f6] dark:bg-[#181818] overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[#f5f3ef] dark:hover:bg-[#202020] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Workflow className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Grafo de Execução do Runtime ({tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'})
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Rastreamento de estados, custos, permissões e passos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="text-gray-400 p-0.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-[#eae6e1] dark:border-[#2e2e2e] bg-white dark:bg-[#121212] p-4 space-y-4">
          {/* Tasks List Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#f0ede9] dark:border-[#242424]">
            {tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              const badgeStyle = getTaskStatusBadge(task.status);
              const label = getTaskStatusLabel(task.status);

              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`px-3 py-2 rounded-xl text-left border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#f5f3ef] dark:bg-[#222222] border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20' 
                      : 'bg-white dark:bg-[#181818] border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                      {task.title}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border uppercase ${badgeStyle}`}>
                      {label}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-2">
                    <span>{task.steps.length} passos</span>
                    {task.parentTaskId && <span>• Sub-tarefa</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Task Details */}
          {selectedTask && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {selectedTask.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 font-mono text-[11px]">Run ID: {selectedTask.runId}</span>
                </div>
              </div>

              {/* Execution Steps Table */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Passos de Execução ({selectedTask.steps.length}):
                </span>

                {selectedTask.steps.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    Nenhum passo registrado ainda para esta tarefa.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTask.steps.map((step) => (
                      <div 
                        key={step.id}
                        className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-[#fafafa] dark:bg-[#161616] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] flex items-center justify-center font-bold">
                              {step.stepNumber}
                            </span>
                            <span>{step.tool}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <DollarSign className="w-3 h-3" />
                              ${step.estimatedCost.toFixed(5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Key className="w-3 h-3 text-purple-500" />
                              {step.permissionsUsed.join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Tool Arguments */}
                        <div className="bg-white dark:bg-[#101010] p-2 rounded-lg border border-gray-200 dark:border-zinc-800 font-mono text-[11px] text-gray-700 dark:text-gray-300 overflow-x-auto">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Argumentos da Ferramenta:
                          </span>
                          <code>{JSON.stringify(step.arguments, null, 2)}</code>
                        </div>

                        {/* Produced Artifacts */}
                        {step.artifactsProduced.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Artefatos produzidos: {step.artifactsProduced.join(', ')}</span>
                          </div>
                        )}

                        {/* Timing */}
                        <div className="text-[10.5px] text-gray-400 dark:text-gray-500 flex items-center gap-2">
                          <span>Início: {formatTimeSafely(step.startTime, undefined, 'Data indisponível')}</span>
                          {step.endTime && (
                            <span>• Fim: {formatTimeSafely(step.endTime, undefined, 'Data indisponível')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
