import React from 'react';
import { Terminal, FileCode, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
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
    const isRunning = execAction.status === 'running';
    const isFailed = execAction.status === 'failed' || execAction.status === 'timed_out' || (typeof execAction.exitCode === 'number' && execAction.exitCode !== 0);

    return (
      <div className="flex items-center justify-start py-0.5 my-1">
        {isRunning ? (
          <button
            type="button"
            onClick={onOpenTerminal}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none cursor-pointer border-0 bg-transparent p-0"
          >
            <Loader2 className="w-4 h-4 text-[#8e9099] dark:text-gray-400 animate-spin shrink-0" />
            <span className="shimmer-text">Executando no terminal...</span>
          </button>
        ) : isFailed ? (
          <button
            type="button"
            onClick={onOpenTerminal}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors select-none border-0 bg-transparent p-0 cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>Falha no terminal (Exit {execAction.exitCode ?? 1})</span>
            <ChevronRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenTerminal}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors select-none border-0 bg-transparent p-0 cursor-pointer text-[#6b7076] hover:text-black dark:text-gray-400 dark:hover:text-white"
          >
            <Terminal className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
            <span>Executou no terminal</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          </button>
        )}
      </div>
    );
  }

  if (fileAction) {
    const fileName = fileAction.path.replace('/workspace/', '').replace(/^\//, '');
    const isMock = Boolean(
      fileAction.isMock || 
      fileAction.status === 'simulated' || 
      (fileAction as any).isSimulated ||
      fileName.includes('mock') ||
      fileName.includes('simula')
    );

    return (
      <div className="flex items-center justify-start py-0.5 my-1">
        <button
          type="button"
          onClick={onOpenTerminal}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors select-none border-0 bg-transparent p-0 cursor-pointer text-[#6b7076] hover:text-black dark:text-gray-400 dark:hover:text-white"
        >
          <FileCode className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
          {isMock ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded">
                SIMULAÇÃO / MOCK
              </span>
              <span>Gravou arquivo em modo simulado: <code className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-[13px] font-mono text-gray-800 dark:text-gray-200">{fileName}</code></span>
            </span>
          ) : (
            <span>Criou o arquivo (Real em Sandbox) <code className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-[13px] font-mono text-gray-800 dark:text-gray-200">{fileName}</code></span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
        </button>
      </div>
    );
  }

  return null;
};
