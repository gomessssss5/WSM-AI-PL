import React from 'react';
import { Terminal, FileCode, ChevronRight, Loader2, AlertTriangle, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { WsmTerminalExecAction, WsmTerminalFileAction } from '../utils/terminalParser';

interface TerminalActionCardProps {
  execAction?: WsmTerminalExecAction;
  fileAction?: WsmTerminalFileAction;
  onOpenTerminal: () => void;
}

export const TerminalActionCard: React.FC<TerminalActionCardProps> = ({
  execAction,
  fileAction,
  onOpenTerminal
}) => {
  if (execAction) {
    const act = execAction as any;
    const isRunning = act.status === 'running';
    const isBlocked = act.status === 'blocked';
    const isFailed = act.status === 'failed' || act.status === 'timed_out' || (typeof act.exitCode === 'number' && act.exitCode !== 0);
    const isMock = act.isMock || act.status === 'simulated' || act.isSimulated;
    const requiresAuth = act.status === 'requires_auth';
    const isSuccess = !isRunning && !isFailed && !isBlocked && !isMock && !requiresAuth && act.exitCode === 0;

    let stateLabel = "DESCONHECIDO";
    let stateColor = "text-gray-500 bg-gray-100 border-gray-200";
    let Icon = Terminal;

    if (isRunning) { stateLabel = "EXECUTANDO"; stateColor = "text-blue-600 bg-blue-50 border-blue-200"; Icon = Loader2; }
    else if (isBlocked) { stateLabel = "BLOQUEADO"; stateColor = "text-red-700 bg-red-100 border-red-300"; Icon = ShieldAlert; }
    else if (requiresAuth) { stateLabel = "REQUER AUTENTICAÇÃO"; stateColor = "text-amber-700 bg-amber-100 border-amber-300"; Icon = Lock; }
    else if (isFailed) { stateLabel = "FALHOU"; stateColor = "text-rose-700 bg-rose-50 border-rose-200"; Icon = AlertTriangle; }
    else if (isMock) { stateLabel = "SIMULADO"; stateColor = "text-amber-800 bg-amber-100 border-amber-300"; Icon = FileCode; }
    else if (isSuccess) { stateLabel = "SUCESSO"; stateColor = "text-emerald-700 bg-emerald-50 border-emerald-200"; Icon = CheckCircle2; }

    return (
      <div className="w-full my-2 border border-[#eae6e1] dark:border-[#2e2e2e] rounded-xl bg-[#faf9f6] dark:bg-[#151515] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#eae6e1] dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border ${stateColor}`}>
              <Icon className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {stateLabel}
            </span>
            <span className="text-[12px] font-mono text-gray-800 dark:text-gray-200 truncate max-w-[200px]" title={act.command}>
              $ {act.command}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTerminal}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center cursor-pointer"
          >
            Terminal <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Run ID</span>
            <span className="truncate text-gray-800 dark:text-gray-200">{act.runId || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Origem</span>
            <span className="truncate text-gray-800 dark:text-gray-200">Terminal (Exec)</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Exit Code</span>
            <span className="truncate text-gray-800 dark:text-gray-200">{act.exitCode ?? 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">URL Testada</span>
            <span className="truncate text-gray-800 dark:text-gray-200">N/A</span>
          </div>
        </div>
      </div>
    );
  }

  if (fileAction) {
    const act = fileAction as any;
    const fileName = act.path.replace('/workspace/', '').replace(/^\//, '');
    const isMock = Boolean(
      act.isMock || 
      act.status === 'simulated' || 
      act.isSimulated ||
      fileName.includes('mock') ||
      fileName.includes('simula')
    );
    const isFailed = act.status === 'failed';
    const isRunning = act.status === 'writing' || act.status === 'working';
    const isSuccess = !isRunning && !isFailed && !isMock;

    let stateLabel = "DESCONHECIDO";
    let stateColor = "text-gray-500 bg-gray-100 border-gray-200";
    let Icon = FileCode;

    if (isRunning) { stateLabel = "EXECUTANDO"; stateColor = "text-blue-600 bg-blue-50 border-blue-200"; Icon = Loader2; }
    else if (isFailed) { stateLabel = "FALHOU"; stateColor = "text-rose-700 bg-rose-50 border-rose-200"; Icon = AlertTriangle; }
    else if (isMock) { stateLabel = "SIMULADO"; stateColor = "text-amber-800 bg-amber-100 border-amber-300"; Icon = FileCode; }
    else if (isSuccess) { stateLabel = "SUCESSO"; stateColor = "text-emerald-700 bg-emerald-50 border-emerald-200"; Icon = CheckCircle2; }

    return (
      <div className="w-full my-2 border border-[#eae6e1] dark:border-[#2e2e2e] rounded-xl bg-[#faf9f6] dark:bg-[#151515] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#eae6e1] dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border ${stateColor}`}>
              <Icon className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {stateLabel}
            </span>
            <span className="text-[12px] font-mono text-gray-800 dark:text-gray-200 truncate max-w-[200px]" title={fileName}>
              {fileName}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTerminal}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center cursor-pointer"
          >
            Workspace <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Run ID</span>
            <span className="truncate text-gray-800 dark:text-gray-200">{act.runId || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Origem</span>
            <span className="truncate text-gray-800 dark:text-gray-200">Terminal (File)</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Caminho / ID</span>
            <span className="truncate text-gray-800 dark:text-gray-200" title={fileName}>{fileName}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Hash</span>
            <span className="truncate text-gray-800 dark:text-gray-200">{act.hash || 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
