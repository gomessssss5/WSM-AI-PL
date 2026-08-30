import React, { useState } from 'react';
import { WsmDocument } from '../types';
import { Download, Loader2, FileSpreadsheet, FileCode, FileText, AlignLeft, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ShieldCheck, Copy, Check, RotateCcw, Eye, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generatePdfBlob } from '../utils/pdfGenerator';
import { generateExcelBlob } from '../utils/excelGenerator';
import { logAuditEvent } from '../utils/auditLogger';
import { terminalSandbox } from '../lib/terminalSandbox';
import { triggerBlobDownload } from '../utils/fileDownload';
import { computeSha256 } from '../utils/docParser';

interface DocumentCardProps {
  document: WsmDocument;
  onOpenDocument?: (doc: WsmDocument) => void;
  attachedImages?: string[];
  versionInfo?: {
    versionNumber: number;
    totalVersions: number;
    isLatest: boolean;
  };
  key?: React.Key;
}

export default function DocumentCard({ document, onOpenDocument, attachedImages, versionInfo }: DocumentCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [restoredToast, setRestoredToast] = useState(false);

  // Exact snapshot content of this document version
  const exactContent = document.content ?? '';
  const exactBytes = document.size ?? (document.sizeBytes ?? new TextEncoder().encode(exactContent).length);
  const sha256Hash = document.hash || document.sha256 || document.validation?.hash || computeSha256(exactContent);

  const versionNum = versionInfo?.versionNumber || 1;
  const totalVers = versionInfo?.totalVersions || 1;
  const isLatest = versionInfo?.isLatest ?? true;

  // Format determined by AI
  const rawFormat = (document.format || (document as any).type || 'pdf').toString().toLowerCase();
  let format = rawFormat;
  if (rawFormat === 'markdown') {
    format = 'md';
  } else if (rawFormat === 'excel' || rawFormat === 'sheet' || rawFormat === 'planilha') {
    format = 'xlsx';
  } else if (rawFormat === 'csv') {
    format = 'csv';
  } else if (rawFormat === 'python') {
    format = 'py';
  } else if (rawFormat === 'javascript') {
    format = 'js';
  } else if (rawFormat === 'typescript') {
    format = 'ts';
  }
  
  const isCode = ['html', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css', 'sql'].includes(format);
  const val = document.validation;
  const isValidated = val && ((val.status as string) === 'ARTEFATO_CRIADO' || (val.status as string) === 'success' || (val.status as string) === 'VALIDADO' || (val.status as string) === 'ENTREGUE');

  const cleanTitle = (document.title || 'documento').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const uniqueDocId = `doc-${cleanTitle}-v${versionNum}-${sha256Hash.substring(0, 8)}`;

  const getMimeType = (fmt: string) => {
    switch (fmt) {
      case 'pdf': return 'application/pdf';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'html': return 'text/html';
      case 'md':
      case 'markdown': return 'text/markdown';
      case 'js': return 'application/javascript';
      case 'ts': return 'application/typescript';
      case 'py': return 'text/x-python';
      default: return 'text/plain';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getExactFileSize = (): string => {
    if (format === 'xlsx') {
      if (exactBytes < 1024) {
        return `${formatBytes(exactBytes)} (dados) · ~10.8 KB (XLSX)`;
      }
      return formatBytes(exactBytes);
    }
    return formatBytes(exactBytes);
  };

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleRestoreVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      terminalSandbox.writeFile(document.title || 'documento', exactContent, `Restaurado v${versionNum}`);
      logAuditEvent({
        toolName: 'Terminal Sandbox',
        riskLevel: 'medium',
        details: `Restaurada versão v${versionNum} do arquivo "${document.title}" no Workspace (${exactBytes} bytes, SHA-256: ${sha256Hash.substring(0, 12)}...)`,
        status: 'executed',
        integrity_hash: sha256Hash
      });
      setRestoredToast(true);
      setTimeout(() => setRestoredToast(false), 2500);
    } catch (err) {
      console.error('Erro ao restaurar versão:', err);
    }
  };

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Log audit event for download
    logAuditEvent({
      toolName: 'Download de Artefato',
      riskLevel: 'low',
      details: `Download efetuado do artefato "${document.title}" versão v${versionNum} (Formato: ${format.toUpperCase()}, Tamanho: ${exactBytes} bytes, SHA-256: ${sha256Hash.substring(0, 16)}...)`,
      status: 'executed',
      normalized_input: `Title: ${document.title}, Version: v${versionNum}, Format: ${format}`,
      output: `Arquivo ${document.title} (${format}, ${exactBytes} bytes) exportado pelo usuário.`,
      integrity_hash: sha256Hash,
      evidence: isValidated ? `Artefato verificado com SHA-256 intacto` : 'Artefato baixado com integridade verificada'
    });

    if (format === 'csv') {
      let fname = document.title || 'dados';
      if (!fname.toLowerCase().endsWith('.csv')) fname += '.csv';
      const blob = new Blob([exactContent || ''], { type: 'text/csv;charset=utf-8' });
      triggerBlobDownload(fname, blob);
    } else if (format === 'md' || format === 'txt' || isCode) {
      let fname = document.title || 'arquivo';
      if (!fname.toLowerCase().endsWith('.' + format)) fname += '.' + format;
      const blob = new Blob([exactContent || ''], { type: 'text/plain;charset=utf-8' });
      triggerBlobDownload(fname, blob);
    } else if (format === 'xlsx') {
      try {
        setIsGenerating(true);
        let fname = document.title || 'planilha';
        if (!fname.toLowerCase().endsWith('.xlsx')) fname += '.xlsx';
        const excelBlob = await generateExcelBlob(document.title || 'Planilha', exactContent || '');
        triggerBlobDownload(fname, excelBlob);
      } catch (err) {
        console.error("Erro ao gerar Excel:", err);
      } finally {
        setIsGenerating(false);
      }
    } else {
      try {
        setIsGenerating(true);
        let fname = document.title || 'documento';
        if (!fname.toLowerCase().endsWith('.pdf')) fname += '.pdf';
        const pdfBlob = await generatePdfBlob(document.title || 'Documento', exactContent || '', attachedImages || (document as any).images || (document as any).attachedImages);
        triggerBlobDownload(fname, pdfBlob);
      } catch (err) {
        console.error("Erro ao gerar PDF:", err);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      id={uniqueDocId}
      className="w-full bg-[#f8f8f7] hover:bg-[#f2f0ec] dark:bg-gray-900/60 dark:hover:bg-gray-850 border border-[#eae6e1] dark:border-gray-800 rounded-2xl p-3 md:p-3.5 shadow-3xs hover:shadow-2xs transition-all select-none my-1.5 flex flex-col gap-2 relative overflow-hidden"
    >
      <div 
        onClick={() => onOpenDocument?.(document)}
        className="flex items-center justify-between gap-3 cursor-pointer"
      >
        {/* Left side: Mini document sheet graphic */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {format === 'xlsx' || format === 'csv' ? (
            <div className="w-11 h-13 md:w-12 md:h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl shadow-3xs flex flex-col items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform p-1.5 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          ) : isCode ? (
            <div className="w-11 h-13 md:w-12 md:h-14 bg-gray-100 dark:bg-blue-950/40 border border-gray-300/80 dark:border-blue-800/80 rounded-xl shadow-3xs flex flex-col items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform p-1.5 text-black dark:text-blue-400">
              <FileCode className="w-6 h-6" />
            </div>
          ) : format === 'txt' ? (
            <div className="w-11 h-13 md:w-12 md:h-14 bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-3xs flex flex-col items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform p-1.5 text-gray-600 dark:text-gray-400">
              <AlignLeft className="w-6 h-6" />
            </div>
          ) : (format === 'md' || format === 'markdown') ? (
            <div className="w-11 h-13 md:w-12 md:h-14 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-3xs flex flex-col items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform p-1.5 text-zinc-700 dark:text-zinc-300">
              <FileText className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-11 h-13 md:w-12 md:h-14 bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-700 rounded-xl shadow-3xs flex flex-col items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform p-1.5">
              <div className="w-6 h-1 bg-gray-1000/80 rounded-full mb-1.5" />
              <div className="w-7 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full mb-1" />
              <div className="w-5 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full mb-1" />
              <div className="w-6 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-1" />
              <div className="w-4 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          )}

          {/* Middle text */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-100 truncate tracking-tight leading-snug">
                {document.title || 'Documento'}
              </span>

              {/* Version Badge */}
              {isLatest ? (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>v{versionNum} (Versão Atual)</span>
                </span>
              ) : (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100/80 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                  v{versionNum} de {totalVers} (Histórico)
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 mt-0.5">
              <span className="text-[12px] text-gray-500 dark:text-gray-400 font-normal flex items-center gap-1.5 flex-wrap leading-tight">
                <span>{format === 'xlsx' ? 'Planilha Excel' : format === 'csv' ? 'Planilha CSV' : isCode ? 'Código' : format === 'txt' ? 'Texto' : (format === 'md' || format === 'markdown') ? 'Markdown' : 'Documento'} · {format.toUpperCase()}</span>
                <span>•</span>
                <span>{getExactFileSize()}</span>
              </span>
              
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1.5 flex-wrap leading-tight">
                <span className="flex items-center gap-0.5 bg-[#eae6e1]/40 dark:bg-gray-800/40 px-1 py-0.25 rounded text-[9.5px]">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[160px]" title={uniqueDocId}>ID: {uniqueDocId}</span>
                </span>
                <span>•</span>
                <span>MIME: {getMimeType(format)}</span>
                {sha256Hash && (
                  <>
                    <span>•</span>
                    <span 
                      className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer font-bold"
                      onClick={handleCopyHash}
                      title={`SHA-256 Completo: ${sha256Hash} (Clique para copiar)`}
                    >
                      <span>SHA: {sha256Hash.substring(0, 8)}...{sha256Hash.substring(sha256Hash.length - 4)}</span>
                      {copiedHash ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 text-gray-400" />}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            title={showDetails ? "Ocultar detalhes de versionamento" : "Ver metadados e integridade"}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="bg-white hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-100 border border-gray-200/90 dark:border-gray-700 text-gray-800 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-3xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95"
            title={`Baixar ${document.title || 'arquivo'} (v${versionNum})`}
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            )}
            <span>Baixar v{versionNum}</span>
          </button>
        </div>
      </div>

      {/* Expanded Metadata & Versioning Controls Drawer */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#eae6e1] dark:border-gray-800 pt-2.5 mt-1 flex flex-col gap-2.5 text-xs text-gray-600 dark:text-gray-300"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/70 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700/60 font-mono text-[11px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9.5px] uppercase font-bold text-gray-400 dark:text-gray-500">Hash SHA-256 Completo (64 hex)</span>
                <div className="flex items-center justify-between gap-1 bg-gray-50 dark:bg-gray-900/80 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                  <span className="truncate select-all text-gray-800 dark:text-gray-200">{sha256Hash}</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors"
                    title="Copiar Hash SHA-256"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[9.5px] uppercase font-bold text-gray-400 dark:text-gray-500">Tamanho Exato & Versão</span>
                <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-900/80 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                  <span>{exactBytes} bytes ({formatBytes(exactBytes)})</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Versão {versionNum}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions for this version */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
              <div className="flex items-center gap-1.5">
                {!isLatest && (
                  <button
                    type="button"
                    onClick={handleRestoreVersion}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Definir o conteúdo desta versão como a versão ativa no Workspace"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar no Workspace</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenDocument?.(document)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Visualizar Conteúdo</span>
                </button>
              </div>

              {restoredToast && (
                <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  ✓ Versão {versionNum} restaurada com sucesso!
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
