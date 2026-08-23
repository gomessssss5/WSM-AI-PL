import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  Terminal as TerminalIcon, 
  X, 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  FolderTree, 
  Clock, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  ShieldAlert, 
  FileCode2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  FileText, 
  Sparkles, 
  RefreshCw,
  Sliders,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  SkipBack
} from 'lucide-react';
import { sandboxEngine, SandboxFileEntry, TerminalCommandLog, SandboxResourceUsage } from '../lib/terminalSandbox';

interface TerminalSandboxPaneProps {
  isOpen: boolean;
  onClose: () => void;
  isAiExecuting?: boolean;
  activeCommand?: string;
  onRunFinished?: (result: { command: string; exitCode: number; stdout: string; filesModified: string[] }) => void;
}

export const TerminalSandboxPane: React.FC<TerminalSandboxPaneProps> = ({
  isOpen,
  onClose,
  isAiExecuting = false,
  activeCommand,
  onRunFinished
}) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);

  const [activeTab, setActiveTab] = useState<'terminal' | 'files' | 'history' | 'settings'>('terminal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProcessInfo, setCurrentProcessInfo] = useState<{ command: string; pid: number } | null>(null);
  
  // File Explorer State
  const [files, setFiles] = useState<SandboxFileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<SandboxFileEntry | null>(null);
  const [fileEditorContent, setFileEditorContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  // Command History & Audit
  const [commandLogs, setCommandLogs] = useState<TerminalCommandLog[]>([]);
  const [resourceUsage, setResourceUsage] = useState<SandboxResourceUsage>(sandboxEngine.getResourceUsage());
  const [copiedCode, setCopiedCode] = useState(false);

  // Shell prompt line buffer
  const promptBuffer = useRef<string>('');
  const historyIndex = useRef<number>(-1);
  const localCommandHistory = useRef<string[]>([]);

  const [currentCwd, setCurrentCwd] = useState<string>(sandboxEngine.getCwd());

  // Refresh files & resources
  const refreshSandboxState = () => {
    setCurrentCwd(sandboxEngine.getCwd());
    setFiles(sandboxEngine.listFiles('/workspace'));
    setCommandLogs(sandboxEngine.getHistory());
    setResourceUsage(sandboxEngine.getResourceUsage());
  };

  const writePrompt = () => {
    if (xtermInstance.current) {
      xtermInstance.current.write(`\r\n${sandboxEngine.getPrompt()}`);
      promptBuffer.current = '';
    }
  };

  // Initialize xterm with Manus AI light theme matching screenshot
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!terminalRef.current) return;

      if (!xtermInstance.current) {
        const term = new Terminal({
          cursorBlink: true,
          convertEol: true,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 13,
          lineHeight: 1.3,
          theme: {
            background: '#f6f6f7',
            foreground: '#374151',
            cursor: '#16a34a',
            cursorAccent: '#ffffff',
            selectionBackground: 'rgba(22, 163, 74, 0.2)',
            black: '#18181b',
            red: '#dc2626',
            green: '#16a34a',
            yellow: '#d97706',
            blue: '#2563eb',
            magenta: '#9333ea',
            cyan: '#0891b2',
            white: '#64748b',
            brightBlack: '#71717a',
            brightRed: '#ef4444',
            brightGreen: '#15803d',
            brightYellow: '#f59e0b',
            brightBlue: '#3b82f6',
            brightMagenta: '#a855f7',
            brightCyan: '#06b6d4',
            brightWhite: '#09090b'
          }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermInstance.current = term;
        fitAddonInstance.current = fitAddon;

        // Write full terminal history on mount
        term.write(sandboxEngine.getTerminalHistoryText().replace(/\n/g, '\r\n'));

        // Keyboard handler
        term.onData((data) => {
          if (isRunning) return;

          // Enter key
          if (data === '\r') {
            const cmd = promptBuffer.current.trim();
            term.write('\r\n');
            if (cmd) {
              localCommandHistory.current.push(cmd);
              historyIndex.current = localCommandHistory.current.length;
              executeCommandInTerminal(cmd);
            } else {
              writePrompt();
            }
            promptBuffer.current = '';
            return;
          }

          // Backspace
          if (data === '\x7f' || data === '\b') {
            if (promptBuffer.current.length > 0) {
              promptBuffer.current = promptBuffer.current.slice(0, -1);
              term.write('\b \b');
            }
            return;
          }

          // Ctrl+C
          if (data === '\x03') {
            term.write('^C\r\n');
            promptBuffer.current = '';
            writePrompt();
            return;
          }

          // Ctrl+L (clear)
          if (data === '\x0c') {
            term.clear();
            writePrompt();
            return;
          }

          // Arrow Up (History Prev)
          if (data === '\x1b[A') {
            if (localCommandHistory.current.length > 0 && historyIndex.current > 0) {
              historyIndex.current--;
              const prevCmd = localCommandHistory.current[historyIndex.current];
              term.write('\r\x1b[K' + sandboxEngine.getPrompt() + prevCmd);
              promptBuffer.current = prevCmd;
            }
            return;
          }

          // Arrow Down (History Next)
          if (data === '\x1b[B') {
            if (historyIndex.current < localCommandHistory.current.length - 1) {
              historyIndex.current++;
              const nextCmd = localCommandHistory.current[historyIndex.current];
              term.write('\r\x1b[K' + sandboxEngine.getPrompt() + nextCmd);
              promptBuffer.current = nextCmd;
            } else {
              historyIndex.current = localCommandHistory.current.length;
              term.write('\r\x1b[K' + sandboxEngine.getPrompt());
              promptBuffer.current = '';
            }
            return;
          }

          // Standard character input
          if (data.length === 1 && data.charCodeAt(0) >= 32) {
            promptBuffer.current += data;
            term.write(data);
          }
        });
      } else {
        fitAddonInstance.current?.fit();
      }
    }, 50);

    const handleResize = () => {
      fitAddonInstance.current?.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Subscribe to Sandbox Engine events
  useEffect(() => {
    const unsubscribe = sandboxEngine.subscribe((event) => {
      if (event.type === 'stdout' && event.data?.text && xtermInstance.current) {
        xtermInstance.current.write(event.data.text.replace(/\n/g, '\r\n'));
        xtermInstance.current.scrollToBottom();
      } else if (event.type === 'stderr' && event.data?.text && xtermInstance.current) {
        xtermInstance.current.write(`\x1b[31m${event.data.text.replace(/\n/g, '\r\n')}\x1b[0m`);
        xtermInstance.current.scrollToBottom();
      } else if (event.type === 'fs_change') {
        refreshSandboxState();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Run a command inside xterm
  const executeCommandInTerminal = async (cmdLine: string, caller: 'ai' | 'user' = 'user') => {
    if (!cmdLine.trim()) return;

    setIsRunning(true);
    setCurrentProcessInfo({ command: cmdLine, pid: Math.floor(Math.random() * 9000) + 1000 });

    try {
      const { exitCode, outputText, filesModified } = await sandboxEngine.spawn(cmdLine, [], { caller });
      refreshSandboxState();

      if (onRunFinished) {
        onRunFinished({ command: cmdLine, exitCode, stdout: outputText, filesModified });
      }
    } catch (err: any) {
      if (xtermInstance.current) {
        xtermInstance.current.write(`\x1b[31m✕ Falha na execução: ${err?.message || String(err)}\x1b[0m\r\n`);
      }
    } finally {
      setIsRunning(false);
      setCurrentProcessInfo(null);
      writePrompt();
    }
  };

  // Clear terminal screen
  const handleClearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      writePrompt();
    }
  };

  // If AI initiated an active execution, trigger it in terminal automatically
  useEffect(() => {
    if (activeCommand && isOpen) {
      executeCommandInTerminal(activeCommand, 'ai');
    }
  }, [activeCommand]);

  // Workspace ZIP download
  const handleDownloadZip = async () => {
    try {
      const blob = await sandboxEngine.exportWorkspaceZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnix_sandbox_workspace_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err);
    }
  };

  // Reset sandbox
  const handleResetSandbox = () => {
    sandboxEngine.seedDefaultFileSystem();
    sandboxEngine.clearHistory();
    refreshSandboxState();
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.writeln('\x1b[1;33m[Sandbox reiniciado para o estado padrão com sucesso]\x1b[0m');
      writePrompt();
    }
  };

  // Save file from editor
  const handleSaveFile = () => {
    if (!selectedFile) return;
    try {
      sandboxEngine.writeFile(selectedFile.path, fileEditorContent);
      setIsEditingFile(false);
      refreshSandboxState();
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar arquivo');
    }
  };

  // Create new file
  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const path = `/workspace/${newFileName.trim().replace(/^\//, '')}`;
    try {
      sandboxEngine.writeFile(path, '');
      setNewFileName('');
      setIsCreatingFile(false);
      refreshSandboxState();
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar arquivo');
    }
  };

  if (!isOpen) return null;

  return (
    <aside 
      aria-label="Terminal Sandbox"
      className={`relative flex flex-col bg-[#f5f5f7] dark:bg-zinc-950 text-gray-800 dark:text-gray-200 border-l border-gray-200/90 dark:border-zinc-800 shadow-xl transition-all duration-300 z-40 ${
        isFullscreen ? 'fixed inset-0 w-full h-full z-50' : 'w-full h-full shrink-0'
      }`}
    >
      {/* Sleek Manus Header */}
      <div className="px-4 py-2.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TerminalIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 font-mono tracking-tight">
              ubuntu@sandbox:{currentCwd}
            </span>
            {isRunning && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Executando comando...
              </span>
            )}
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <button
            type="button"
            onClick={handleClearTerminal}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer border border-gray-200 dark:border-zinc-700"
            title="Limpar tela do terminal"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-500" />
            <span>Limpar</span>
          </button>
          
          <button
            type="button"
            onClick={handleDownloadZip}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer text-gray-600 dark:text-gray-400"
            title="Baixar Workspace (.zip)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetSandbox}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer text-gray-600 dark:text-gray-400"
            title="Resetar Sandbox"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/10 hover:text-red-600 rounded-md transition-colors cursor-pointer"
            title="Fechar Terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="px-3 py-1 bg-gray-100 dark:bg-zinc-900/80 border-b border-gray-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal CLI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Histórico & Auditoria</span>
            {commandLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-zinc-700 font-mono">
                {commandLogs.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'files'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Arquivos Workspace</span>
            {files.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-zinc-700 font-mono">
                {files.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[10px] text-gray-500 font-mono hidden sm:inline-block">
          Ubuntu 22.04 LTS Container
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 relative overflow-hidden bg-[#f6f6f7] dark:bg-zinc-950 flex flex-col">
        {activeTab === 'terminal' && (
          <div className="w-full h-full p-3 overflow-hidden flex flex-col">
            <div 
              ref={terminalRef} 
              className="w-full h-full flex-1 overflow-hidden" 
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="w-full h-full p-4 overflow-y-auto space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-zinc-800">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Histórico Detalhado de Execuções
              </h4>
              <button
                type="button"
                onClick={() => {
                  sandboxEngine.clearHistory();
                  refreshSandboxState();
                }}
                className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Histórico
              </button>
            </div>

            {commandLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Nenhum comando foi executado na sessão atual.
              </div>
            ) : (
              commandLogs.slice().reverse().map((log, idx) => (
                <div key={log.id || idx} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.exitCode === 0 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
                      }`}>
                        {log.exitCode === 0 ? '✓ SUCESSO' : `✕ ERRO (Exit ${log.exitCode})`}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs">
                        $ {log.command}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>Duração: {log.durationMs}ms</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('terminal');
                          executeCommandInTerminal(log.command);
                        }}
                        className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Re-executar
                      </button>
                    </div>
                  </div>

                  {log.stdout && (
                    <div className="p-2 bg-gray-50 dark:bg-zinc-950 rounded border border-gray-100 dark:border-zinc-800/80 text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[11px]">
                      <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">STDOUT:</div>
                      {log.stdout}
                    </div>
                  )}

                  {log.stderr && (
                    <div className="p-2 bg-red-50/50 dark:bg-red-950/30 rounded border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[11px]">
                      <div className="text-[9px] font-bold text-red-400 uppercase mb-1">STDERR:</div>
                      {log.stderr}
                    </div>
                  )}

                  {log.filesModified && log.filesModified.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-gray-500">
                      <span className="font-bold">Arquivos Modificados:</span>
                      {log.filesModified.map((f, fIdx) => (
                        <span key={fIdx} className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded font-mono text-gray-800 dark:text-gray-200">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="w-full h-full p-4 overflow-y-auto space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-zinc-800">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-500" />
                Explorador de Arquivos do Workspace
              </h4>
              <button
                type="button"
                onClick={() => setIsCreatingFile(true)}
                className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Arquivo
              </button>
            </div>

            {isCreatingFile && (
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nome do Novo Arquivo (ex: app.py, script.js, index.html)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="novo_arquivo.py"
                    className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-xs font-mono text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFile}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile(false)}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between hover:border-emerald-500 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex flex-col truncate">
                      <span className="font-mono font-bold text-gray-900 dark:text-white truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {file.size} bytes
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const { downloadWorkspaceFile } = await import('../utils/fileDownload');
                      downloadWorkspaceFile(file.name);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 rounded cursor-pointer"
                    title="Baixar arquivo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default TerminalSandboxPane;
