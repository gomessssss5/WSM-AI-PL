import React, { useState, useEffect } from 'react';
import { ArtifactRecord } from '../types';
import { persistArtifactToBackend, getLocalDrafts } from '../utils/executionRuntime';
import { verifyArtifactSpecification, SpecificationValidationResult } from '../utils/artifactSpecification';
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
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ArtifactPersistenceCardProps {
  filename: string;
  title?: string;
  content: string;
  format?: string;
  conversationId: string;
  taskId?: string;
  stepId?: string;
  expectedMinRows?: number;
  expectedKeyValues?: (string | number)[];
  requiredFormulas?: string[];
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
  expectedMinRows,
  expectedKeyValues,
  requiredFormulas,
  onPersisted
}) => {
  const [artifact, setArtifact] = useState<ArtifactRecord | null>(null);
  const [status, setStatus] = useState<'persisting' | 'persisted' | 'failed'>('persisting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [validationResult, setValidationResult] = useState<SpecificationValidationResult | null>(null);

  const displayTitle = title || filename;

  // Persist artifact into backend store on mount
  useEffect(() => {
    let isMounted = true;

    async function doPersist() {
      setStatus('persisting');
      setErrorMsg(null);

      // Extract extension
      const dotIdx = filename.lastIndexOf('.');
      const ext = dotIdx !== -1 ? filename.substring(dotIdx) : '.txt';

      // Perform specification audit
      const specResult = verifyArtifactSpecification(content, {
        filename,
        expectedExtension: ext,
        expectedMinRows: expectedMinRows || 2,
        expectedKeyValues: expectedKeyValues || [],
        requiredFormulas: requiredFormulas || []
      });

      setValidationResult(specResult);

      const result = await persistArtifactToBackend({
        filename,
        title: displayTitle,
        content: specResult.sanitizedContent,
        format: format || ext.replace('.', ''),
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

  const isMockArtifact = Boolean(
    (artifact as any)?.isMock ||
    (artifact as any)?.status === 'simulated' ||
    filename.toLowerCase().includes('mock') ||
    filename.toLowerCase().includes('simula')
  );

  const isHtml = format === 'html' || filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm');

  let stateLabel = "DESCONHECIDO";
  let stateColor = "text-gray-500 bg-gray-100 border-gray-200";
  let Icon = Database;

  if (status === 'persisting') { stateLabel = "EXECUTANDO"; stateColor = "text-blue-600 bg-blue-50 border-blue-200"; Icon = Loader2; }
  else if (status === 'failed') { stateLabel = "FALHOU"; stateColor = "text-rose-700 bg-rose-50 border-rose-200"; Icon = AlertTriangle; }
  else if (isMockArtifact) { stateLabel = "SIMULADO"; stateColor = "text-amber-800 bg-amber-100 border-amber-300"; Icon = FileCode; }
  else if (status === 'persisted') { stateLabel = "SUCESSO"; stateColor = "text-emerald-700 bg-emerald-50 border-emerald-200"; Icon = CheckCircle2; }

  return (
    <div className="w-full my-3 border border-[#eae6e1] dark:border-[#2e2e2e] rounded-xl bg-[#faf9f6] dark:bg-[#151515] overflow-hidden shadow-xs transition-all">
      {/* Top Header Status Bar */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-[#eae6e1] dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border shrink-0 ${stateColor}`}>
            <Icon className={`w-3.5 h-3.5 ${status === 'persisting' ? 'animate-spin' : ''}`} />
            {stateLabel}
          </span>

          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-mono font-bold text-gray-800 dark:text-gray-100 truncate flex items-center gap-2">
              {displayTitle}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'persisted' && !isMockArtifact && validationResult && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              validationResult.isDone
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}>
              {validationResult.isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}
              {validationResult.statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-[#1a1a1a] p-2 rounded-lg border border-[#eae6e1] dark:border-[#2e2e2e]">
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Run ID</span>
            <span className="truncate text-gray-800 dark:text-gray-200">{taskId || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Origem</span>
            <span className="truncate text-gray-800 dark:text-gray-200">Gerador de Artefatos</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Caminho / ID</span>
            <span className="truncate text-gray-800 dark:text-gray-200" title={filename}>{filename}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[9px] mb-0.5">Hash SHA-256</span>
            <span className="truncate text-gray-800 dark:text-gray-200" title={artifact?.hash || 'N/A'}>{artifact?.hash || 'N/A'}</span>
          </div>
        </div>

        {isHtml && status === 'persisted' && !isMockArtifact && (
          <div className="w-full bg-white rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-inner h-[400px]">
            <iframe
              srcDoc={content}
              title={displayTitle}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}

        {status === 'persisted' && artifact && !isHtml && (
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

        {/* Specification Quality Verification Checklist */}
        {validationResult && (
          <div className="bg-[#fcfbf9] dark:bg-[#181818] rounded-xl p-3 border border-[#eae6e1] dark:border-zinc-800 space-y-2 text-[11.5px]">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-1.5">
              <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Auditoria de Qualidade e Especificação Verificável
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                validationResult.isDone
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {validationResult.metRequirements.length} / {validationResult.metRequirements.length + validationResult.unmetRequirements.length} Aprovados
              </span>
            </div>

            <div className="space-y-1">
              {validationResult.metRequirements.map((req, idx) => (
                <div key={`met-${idx}`} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{req}</span>
                </div>
              ))}

              {validationResult.unmetRequirements.map((req, idx) => (
                <div key={`unmet-${idx}`} className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{req}</span>
                </div>
              ))}
            </div>

            {validationResult.diagnostics.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-800 text-[10.5px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg">
                <span className="font-bold block mb-0.5">Diagnóstico da Auditoria:</span>
                {validationResult.diagnostics.map((diag, dIdx) => (
                  <div key={`diag-${dIdx}`}>• {diag}</div>
                ))}
              </div>
            )}
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
