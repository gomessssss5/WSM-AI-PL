import React, { useState, useEffect } from 'react';
import { ArtifactRecord } from '../types';
import { persistArtifactToBackend, getLocalDrafts } from '../utils/executionRuntime';
import { 
  FileCheck2, 
  AlertTriangle, 
  Database, 
  HardDrive, 
  RefreshCw, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Info,
  Hash,
  Layers,
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface ArtifactPersistenceCardProps {
  filename: string;
  title?: string;
  content: string;
  format?: string;
  conversationId: string;
  taskId?: string;
  stepId?: string;
  onPersisted?: (artifact: ArtifactRecord) => void;
}

export const ArtifactPersistenceCard: React.FC<ArtifactPersistenceCardProps> = ({
  filename,
  title,
  content,
  format,
  conversationId,
  taskId,
  stepId,
  onPersisted
}) => {
  const [artifact, setArtifact] = useState<ArtifactRecord | null>(null);
  const [status, setStatus] = useState<'persisting' | 'persisted' | 'failed'>('persisting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);

  const displayTitle = title || filename;

  // Persist artifact into backend store on mount
  useEffect(() => {
    let isMounted = true;

    async function doPersist() {
      setStatus('persisting');
      setErrorMsg(null);

      const result = await persistArtifactToBackend({
        filename,
        title: displayTitle,
        content,
        format,
        conversationId,
        taskId: taskId || 'task_root',
        stepId: stepId || 'step_1'
      });

      if (!isMounted) return;

      if (result.success && result.artifact) {
        setArtifact(result.artifact);
        setStatus('persisted');
        if (onPersisted) onPersisted(result.artifact);
      } else {
        setStatus('failed');
        setErrorMsg(result.error || 'A gravação falhou no armazenamento persistente.');
      }
    }

    doPersist();

    return () => {
      isMounted = false;
    };
  }, [filename, content, conversationId]);

  const handleRetry = async () => {
    setStatus('persisting');
    setErrorMsg(null);
    const result = await persistArtifactToBackend({
      filename,
      title: displayTitle,
      content,
      format,
      conversationId,
      taskId: taskId || 'task_root',
      stepId: stepId || 'step_1'
    });

    if (result.success && result.artifact) {
      setArtifact(result.artifact);
      setStatus('persisted');
      if (onPersisted) onPersisted(result.artifact);
    } else {
      setStatus('failed');
      setErrorMsg(result.error || 'A gravação falhou no armazenamento persistente.');
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDraft = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.includes('.') ? filename : `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full my-3 border border-[#eae6e1] dark:border-[#2e2e2e] rounded-2xl bg-white dark:bg-[#151515] overflow-hidden shadow-xs transition-all">
      {/* Top Header Status Bar */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        status === 'persisted' 
          ? 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30' 
          : status === 'failed'
          ? 'bg-rose-50/70 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30'
          : 'bg-amber-50/70 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {status === 'persisted' ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
          ) : status === 'failed' ? (
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-spin" />
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100 truncate">
              {displayTitle}
            </span>
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-gray-400">
              {status === 'persisted' 
                ? 'Gravação confirmada no backend' 
                : status === 'failed'
                ? 'Erro de persitência no armazenamento'
                : 'Gravando no armazenamento persistente...'}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'persisted' && artifact && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3" />
              Verificado (v{artifact.version})
            </span>
          )}
          {status === 'failed' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Falha de Gravação
            </span>
          )}
          {status === 'persisting' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
              Persistindo...
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-3">
        {status === 'persisted' && artifact && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] bg-[#faf9f6] dark:bg-[#1a1a1a] p-3 rounded-xl border border-[#eae6e1] dark:border-[#282828]">
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3 text-gray-400" /> Hash SHA-256
              </span>
              <span className="font-mono text-gray-800 dark:text-gray-200 truncate font-bold" title={artifact.hash}>
                {artifact.hash.substring(0, 10)}...{artifact.hash.substring(artifact.hash.length - 6)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <FileCode className="w-3 h-3 text-gray-400" /> MIME Type
              </span>
              <span className="font-mono text-gray-800 dark:text-gray-200 truncate font-semibold">
                {artifact.mimeType}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-gray-400" /> Tamanho
              </span>
              <span className="text-gray-800 dark:text-gray-200 font-bold">
                {artifact.size.toLocaleString('pt-BR')} bytes
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-gray-400" /> Versão
              </span>
              <span className="text-gray-800 dark:text-gray-200 font-bold">
                Versão {artifact.version}
              </span>
            </div>
          </div>
        )}

        {/* Failed State Handling */}
        {status === 'failed' && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-start gap-2 text-[12.5px] text-rose-800 dark:text-rose-300 font-medium">
              <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">O backend não confirmou a criação do arquivo.</p>
                <p className="text-[11.5px] text-rose-700 dark:text-rose-400 mt-0.5">
                  {errorMsg || 'Não foi possível gravar no armazenamento. O conteúdo foi salvo localmente como RASCUNHO recuperável para evitar perda de dados.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tentar Gravar Novamente
              </button>

              <button
                type="button"
                onClick={() => setShowDraftModal(!showDraftModal)}
                className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#202020] hover:bg-gray-50 dark:hover:bg-[#282828] text-gray-800 dark:text-gray-200 border border-rose-300 dark:border-rose-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> 
                {showDraftModal ? 'Ocultar Rascunho' : 'Recuperar Conteúdo do Rascunho'}
              </button>

              <button
                type="button"
                onClick={handleDownloadDraft}
                className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#202020] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Rascunho
              </button>
            </div>

            {showDraftModal && (
              <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Conteúdo Salvo no Rascunho Local:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyContent}
                    className="text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado!' : 'Copiar Texto'}
                  </button>
                </div>
                <pre className="text-[11.5px] font-mono leading-relaxed bg-white dark:bg-[#101010] p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 max-h-48 overflow-y-auto text-gray-800 dark:text-gray-200">
                  {content}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Metadata Footer */}
        {artifact && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {isDetailsOpen ? 'Ocultar detalhes de procedência' : 'Ver detalhes de procedência do artefato'}
            </button>

            {isDetailsOpen && (
              <div className="mt-2 text-[11px] space-y-1.5 font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#181818] p-3 rounded-xl border border-gray-200 dark:border-zinc-800">
                <div><span className="font-bold text-gray-800 dark:text-gray-200">ID Artefato:</span> {artifact.id}</div>
                <div><span className="font-bold text-gray-800 dark:text-gray-200">Conversa de Origem:</span> {artifact.conversationId}</div>
                <div><span className="font-bold text-gray-800 dark:text-gray-200">Tarefa / Passo:</span> {artifact.taskId} / {artifact.stepId}</div>
                <div><span className="font-bold text-gray-800 dark:text-gray-200">Timestamp Confirmação:</span> {artifact.persistedAt}</div>
                <div><span className="font-bold text-gray-800 dark:text-gray-200">Hash SHA-256 Completo:</span> <span className="break-all">{artifact.hash}</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
