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

  // Refresh files & resources
  const refreshSandboxState = () => {
    setFiles(sandboxEngine.listFiles('/workspace'));
    setCommandLogs(sandboxEngine.getHistory());
    setResourceUsage(sandboxEngine.getResourceUsage());
  };

  const writePrompt = () => {
    if (xtermInstance.current) {
      xtermInstance.current.write('\r\n\x1b[1;32mubuntu@sandbox:~\x1b[0m$ ');
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
              term.write('\r\x1b[K\x1b[1;32mubuntu@sandbox:~\x1b[0m$ ' + prevCmd);
              promptBuffer.current = prevCmd;
            }
            return;
          }

          // Arrow Down (History Next)
          if (data === '\x1b[B') {
            if (historyIndex.current < localCommandHistory.current.length - 1) {
              historyIndex.current++;
              const nextCmd = localCommandHistory.current[historyIndex.current];
              term.write('\r\x1b[K\x1b[1;32mubuntu@sandbox:~\x1b[0m$ ' + nextCmd);
              promptBuffer.current = nextCmd;
            } else {
              historyIndex.current = localCommandHistory.current.length;
              term.write('\r\x1b[K\x1b[1;32mubuntu@sandbox:~\x1b[0m$ ');
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
        xtermInstance.current.write(`\x1b[31m✕ Falha na execução: ${err?.message || String(err)}\x1b[0m\r\n\x1b[1;32mubuntu@sandbox:~\x1b[0m$ `);
      }
    } finally {
      setIsRunning(false);
      setCurrentProcessInfo(null);
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
              ubuntu@sandbox:~
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Executando em tempo real...
              </span>
            )}
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-1 text-gray-500">
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

      {/* Main Terminal Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#f6f6f7] dark:bg-zinc-950 flex flex-col">
        <div className="w-full h-full p-3 overflow-hidden flex flex-col">
          <div 
            ref={terminalRef} 
            className="w-full h-full flex-1 overflow-hidden" 
          />
        </div>
      </div>
    </aside>
  );
};

export default TerminalSandboxPane;
