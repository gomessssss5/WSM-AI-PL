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
  SkipBack,
  Send,
  CornerDownLeft,
  Activity
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
  const [lastExecutionStatus, setLastExecutionStatus] = useState<{ command: string; exitCode: number; durationMs: number; timestamp: number } | null>(null);
  
  // Auxiliary input field state
  const [auxiliaryInput, setAuxiliaryInput] = useState('');
  const auxiliaryInputRef = useRef<HTMLInputElement | null>(null);

  // File Explorer State
  const [files, setFiles] = useState<SandboxFileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<SandboxFileEntry | null>(null);
  const [fileEditorContent, setFileEditorContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  // Command History & Audit
  const [commandLogs, setCommandLogs] = useState<TerminalCommandLog[]>(sandboxEngine.getHistory());
  const [resourceUsage, setResourceUsage] = useState<SandboxResourceUsage>(sandboxEngine.getResourceUsage());

  // Shell prompt line buffer
  const promptBuffer = useRef<string>('');
  const historyIndex = useRef<number>(-1);
  const localCommandHistory = useRef<string[]>([]);

  const [currentCwd, setCurrentCwd] = useState<string>(sandboxEngine.getCwd());

  // Refresh files, history & resources
  const refreshSandboxState = () => {
    setCurrentCwd(sandboxEngine.getCwd());
    setFiles(sandboxEngine.listFiles('/workspace'));
    setCommandLogs(sandboxEngine.getHistory());
    setResourceUsage(sandboxEngine.getResourceUsage());
  };

  // Synchronize on mount and whenever isOpen / activeTab changes
  useEffect(() => {
    refreshSandboxState();
  }, [isOpen, activeTab]);

  const writePrompt = () => {
    if (xtermInstance.current) {
      xtermInstance.current.write(`\r\n${sandboxEngine.getPrompt()}`);
      promptBuffer.current = '';
    }
  };

  // Initialize and clean up xterm instance
  useEffect(() => {
    if (!isOpen) return;

    let isDisposed = false;

    const timer = setTimeout(() => {
      if (isDisposed || !terminalRef.current) return;

      // Clean up previous xterm instance if any
      if (xtermInstance.current) {
        try {
          xtermInstance.current.dispose();
        } catch (e) {}
        xtermInstance.current = null;
        fitAddonInstance.current = null;
      }

      if (terminalRef.current) {
        terminalRef.current.innerHTML = '';
      }

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

      if (terminalRef.current) {
        term.open(terminalRef.current);
        try {
          fitAddon.fit();
        } catch (e) {}
      }

      xtermInstance.current = term;
      fitAddonInstance.current = fitAddon;

      // Write full terminal history on mount
      const historyText = sandboxEngine.getTerminalHistoryText();
      term.write(historyText.replace(/\n/g, '\r\n'));
      term.scrollToBottom();

      // Keyboard & Paste handler
      term.onData((data) => {
        if (sandboxEngine.getIsRunning()) return;

        // Arrow Up (History Prev)
        if (data === '\x1b[A') {
          const hist = sandboxEngine.getHistory().map(h => h.command);
          if (hist.length > 0) {
            if (historyIndex.current === -1) {
              historyIndex.current = hist.length - 1;
            } else if (historyIndex.current > 0) {
              historyIndex.current--;
            }
            const prevCmd = hist[historyIndex.current];
            term.write('\r\x1b[K' + sandboxEngine.getPrompt() + prevCmd);
            promptBuffer.current = prevCmd;
          }
          return;
        }

        // Arrow Down (History Next)
        if (data === '\x1b[B') {
          const hist = sandboxEngine.getHistory().map(h => h.command);
          if (historyIndex.current !== -1 && historyIndex.current < hist.length - 1) {
            historyIndex.current++;
            const nextCmd = hist[historyIndex.current];
            term.write('\r\x1b[K' + sandboxEngine.getPrompt() + nextCmd);
            promptBuffer.current = nextCmd;
          } else {
            historyIndex.current = -1;
            term.write('\r\x1b[K' + sandboxEngine.getPrompt());
            promptBuffer.current = '';
          }
          return;
        }

        // Process input character by character
        let idx = 0;
        while (idx < data.length) {
          const char = data[idx];

          // Enter key (\r or \n)
          if (char === '\r' || char === '\n') {
            const cmd = promptBuffer.current.trim();
            promptBuffer.current = '';
            term.write('\r\n');
            if (cmd) {
              localCommandHistory.current.push(cmd);
              historyIndex.current = -1;
              executeCommandInTerminal(cmd, 'user', true);
            } else {
              term.write(sandboxEngine.getPrompt());
            }
            idx++;
            if (char === '\r' && idx < data.length && data[idx] === '\n') {
              idx++;
            }
            continue;
          }

          // Backspace
          if (char === '\x7f' || char === '\b') {
            if (promptBuffer.current.length > 0) {
              promptBuffer.current = promptBuffer.current.slice(0, -1);
              term.write('\b \b');
            }
            idx++;
            continue;
          }

          // Ctrl+C
          if (char === '\x03') {
            term.write('^C\r\n');
            promptBuffer.current = '';
            term.write(sandboxEngine.getPrompt());
            idx++;
            continue;
          }

          // Ctrl+L (clear)
          if (char === '\x0c') {
            term.clear();
            term.write(sandboxEngine.getPrompt());
            idx++;
            continue;
          }

          // Printable characters & Tab
          const code = char.charCodeAt(0);
          if (code >= 32 || code === 9) {
            promptBuffer.current += char;
            term.write(char);
          }
          idx++;
        }
      });

      // Initial focus
      setTimeout(() => {
        try {
          xtermInstance.current?.focus();
        } catch (e) {}
      }, 100);
    }, 60);

    const handleResize = () => {
      try {
        fitAddonInstance.current?.fit();
      } catch (e) {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (xtermInstance.current) {
        try {
          xtermInstance.current.dispose();
        } catch (e) {}
        xtermInstance.current = null;
        fitAddonInstance.current = null;
      }
    };
  }, [isOpen, activeTab]);

  // Subscribe to Sandbox Engine events
  useEffect(() => {
    const unsubscribe = sandboxEngine.subscribe((event) => {
      if (event.type === 'stdout' && event.data?.text && xtermInstance.current) {
        xtermInstance.current.write(event.data.text.replace(/\n/g, '\r\n'));
        xtermInstance.current.scrollToBottom();
      } else if (event.type === 'stderr' && event.data?.text && xtermInstance.current) {
        xtermInstance.current.write(`\x1b[31m${event.data.text.replace(/\n/g, '\r\n')}\x1b[0m`);
        xtermInstance.current.scrollToBottom();
      } else if (event.type === 'start') {
        setIsRunning(true);
        refreshSandboxState();
      } else if (event.type === 'exit') {
        setIsRunning(false);
        setCurrentProcessInfo(null);
        refreshSandboxState();
      } else if (event.type === 'fs_change') {
        refreshSandboxState();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Run a command inside xterm
  const executeCommandInTerminal = async (
    cmdLine: string, 
    caller: 'ai' | 'user' = 'user',
    isDirectTyping = false
  ) => {
    if (!cmdLine.trim()) return;

    setIsRunning(true);
    setCurrentProcessInfo({ command: cmdLine, pid: Math.floor(Math.random() * 9000) + 1000 });

    try {
      // If run from auxiliary bar, programmatic button, or AI, write prompt + command clearly to xterm
      if (!isDirectTyping && xtermInstance.current) {
        xtermInstance.current.write(`\r\n${sandboxEngine.getPrompt()}${cmdLine}\r\n`);
      }

      const { exitCode, outputText, filesModified } = await sandboxEngine.spawn(cmdLine, [], { 
        caller,
        echoCommand: !isDirectTyping,
        echoPrompt: false
      });

      setLastExecutionStatus({
        command: cmdLine,
        exitCode,
        durationMs: 0,
        timestamp: Date.now()
      });

      refreshSandboxState();

      if (onRunFinished) {
        onRunFinished({ command: cmdLine, exitCode, stdout: outputText, filesModified });
      }
    } catch (err: any) {
      if (xtermInstance.current) {
        xtermInstance.current.write(`\x1b[31m✕ Falha na execução: ${err?.message || String(err)}\x1b[0m\r\n`);
        xtermInstance.current.write(sandboxEngine.getPrompt());
      }
    } finally {
      setIsRunning(false);
      setCurrentProcessInfo(null);
      refreshSandboxState();
    }
  };

  // Handle submit from Auxiliary Input
  const handleAuxiliarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = auxiliaryInput.trim();
    if (!cmd || isRunning) return;

    setAuxiliaryInput('');
    setActiveTab('terminal');
    executeCommandInTerminal(cmd, 'user', false);
  };

  // Clear terminal screen
  const handleClearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.write(sandboxEngine.getPrompt());
    }
    sandboxEngine.clearTerminalHistory();
  };

  // If AI initiated an active execution, trigger it in terminal automatically
  useEffect(() => {
    if (activeCommand && isOpen) {
      executeCommandInTerminal(activeCommand, 'ai', false);
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
    sandboxEngine.clearTerminalHistory();
    refreshSandboxState();
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.writeln('\x1b[1;33m[Sandbox reiniciado para o estado padrão com sucesso]\x1b[0m');
      xtermInstance.current.write(sandboxEngine.getPrompt());
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

  const quickCommands = [
    { label: "printf 'OMNIX_TERMINAL_OK\\n'", cmd: "printf 'OMNIX_TERMINAL_OK\\n'" },
    { label: "echo OMNIX_TERM_OK", cmd: "echo OMNIX_TERM_OK" },
    { label: "ls -la", cmd: "ls -la" },
    { label: "node index.js", cmd: "node index.js" },
    { label: "python3 analise.py", cmd: "python3 analise.py" },
    { label: "npm test", cmd: "npm test" }
  ];

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
            {isRunning ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Executando comando...
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Sessão Ativa
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
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
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
          <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Terminal Canvas Area */}
            <div 
              className="flex-1 w-full p-3 overflow-hidden flex flex-col cursor-text min-h-0"
              onClick={() => {
                xtermInstance.current?.focus();
              }}
            >
              <div 
                ref={terminalRef} 
                className="w-full h-full flex-1 overflow-hidden" 
              />
            </div>

            {/* Interactive Auxiliary Command Execution Bar */}
            <div className="p-2.5 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 shrink-0 space-y-2">
              {/* Quick suggestions pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Atalhos:
                </span>
                {quickCommands.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isRunning}
                    onClick={() => {
                      executeCommandInTerminal(q.cmd, 'user', false);
                    }}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-gray-600 dark:text-gray-300 rounded font-mono text-[10.5px] border border-gray-200 dark:border-zinc-700 hover:border-emerald-500/30 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAuxiliarySubmit} className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold select-none">
                    $
                  </span>
                  <input
                    ref={auxiliaryInputRef}
                    type="text"
                    value={auxiliaryInput}
                    onChange={(e) => setAuxiliaryInput(e.target.value)}
                    placeholder="Campo Auxiliar: Digite um comando (ex: echo OMNIX_TERM_OK) e aperte Enter..."
                    disabled={isRunning}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!auxiliaryInput.trim() || isRunning}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Executar</span>
                      <CornerDownLeft className="w-3 h-3 opacity-70" />
                    </>
                  )}
                </button>
              </form>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-0.5 border-t border-gray-100 dark:border-zinc-800/60 font-mono">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    Status: {isRunning ? 'Executando comando...' : 'Pronto para entrada'}
                  </span>
                  <span>•</span>
                  <span>Total de execuções na sessão: {commandLogs.length}</span>
                </div>
                {lastExecutionStatus && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Último: {lastExecutionStatus.command} (Exit {lastExecutionStatus.exitCode})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="w-full h-full p-4 overflow-y-auto space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-zinc-800">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Histórico Detalhado de Execuções ({commandLogs.length})
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
              <div className="p-8 text-center space-y-3 text-gray-400">
                <p>Nenhum comando foi executado na sessão atual.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('terminal');
                      executeCommandInTerminal("printf 'OMNIX_TERMINAL_OK\\n'", 'user', false);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-sans font-semibold cursor-pointer"
                  >
                    Testar printf OMNIX_TERMINAL_OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('terminal');
                      executeCommandInTerminal("echo OMNIX_TERM_OK", 'user', false);
                    }}
                    className="px-3 py-1 bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded text-xs font-sans font-semibold cursor-pointer"
                  >
                    Testar echo OMNIX_TERM_OK
                  </button>
                </div>
              </div>
            ) : (
              commandLogs.slice().reverse().map((log, idx) => (
                <div key={log.id || idx} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2 shadow-xs">
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
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('terminal');
                          executeCommandInTerminal(log.command, 'user', false);
                        }}
                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded text-[11px] font-bold cursor-pointer transition-colors"
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
