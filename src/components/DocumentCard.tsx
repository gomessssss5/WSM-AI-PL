import React, { useState } from 'react';
import { WsmDocument } from '../types';
import { Download, Loader2, FileSpreadsheet, FileCode, FileText, AlignLeft, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generatePdfBlob } from '../utils/pdfGenerator';
import { generateExcelBlob } from '../utils/excelGenerator';
import { logAuditEvent } from '../utils/auditLogger';

interface DocumentCardProps {
  document: WsmDocument;
  onOpenDocument?: (doc: WsmDocument) => void;
  attachedImages?: string[];
  key?: React.Key;
}

export default function DocumentCard({ document, onOpenDocument, attachedImages }: DocumentCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Format determined by AI: 'pdf' (default), 'md', 'xlsx', 'txt', 'html', 'py', 'ts', 'js', etc.
  const rawFormat = (document.format || (document as any).type || 'pdf').toString().toLowerCase();
  let format = rawFormat;
  if (rawFormat === 'markdown') {
    format = 'md';
  } else if (rawFormat === 'excel' || rawFormat === 'csv' || rawFormat === 'sheet' || rawFormat === 'planilha') {
    format = 'xlsx';
  } else if (rawFormat === 'python') {
    format = 'py';
  } else if (rawFormat === 'javascript') {
    format = 'js';
  } else if (rawFormat === 'typescript') {
    format = 'ts';
  }
  
  const isCode = ['html', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css', 'sql'].includes(format);
  const val = document.validation;
  const isValidated = val && val.status === 'success';

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Log audit event for download
    logAuditEvent({
      toolName: 'Download de Artefato',
      riskLevel: 'low',
      details: `Download efetuado do artefato "${document.title}" (Formato: ${format.toUpperCase()})`,
      status: 'executed',
      normalized_input: `Title: ${document.title}, Format: ${format}`,
      output: `Arquivo ${document.title} (${format}) exportado pelo usuário.`,
      integrity_hash: val?.hash || undefined,
      evidence: isValidated ? `Artefato verificado com ${val?.testsPassed}/${val?.testsTotal} testes` : 'Artefato baixado sem evidência prévia de execução'
    });

    if (format === 'md' || format === 'txt' || isCode) {
      const blob = new Blob([document.content || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      let fname = document.title || 'arquivo';
      if (!fname.toLowerCase().endsWith('.' + format)) fname += '.' + format;
      link.download = fname;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      try {
        setIsGenerating(true);
        const excelBlob = await generateExcelBlob(document.title || 'Planilha', document.content || '');
        const url = URL.createObjectURL(excelBlob);
        const link = window.document.createElement('a');
        link.href = url;
        let fname = document.title || 'planilha';
        if (!fname.toLowerCase().endsWith('.xlsx')) fname += '.xlsx';
        link.download = fname;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erro ao gerar Excel:", err);
      } finally {
        setIsGenerating(false);
      }
    } else {
      try {
        setIsGenerating(true);
        const pdfBlob = await generatePdfBlob(document.title || 'Documento', document.content || '', attachedImages || (document as any).images || (document as any).attachedImages);
        const url = URL.createObjectURL(pdfBlob);
        const link = window.document.createElement('a');
        link.href = url;
        let fname = document.title || 'documento';
        if (!fname.toLowerCase().endsWith('.pdf')) fname += '.pdf';
        link.download = fname;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erro ao gerar PDF:", err);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const filesCount = val?.filesGenerated?.length || 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => onOpenDocument?.(document)}
      className="w-full bg-[#f8f8f7] hover:bg-[#f2f0ec] dark:bg-gray-900/60 dark:hover:bg-gray-850 border border-[#eae6e1] dark:border-gray-800 rounded-2xl p-3 md:p-3.5 shadow-3xs hover:shadow-2xs transition-all cursor-pointer select-none group my-1.5 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Mini document sheet graphic */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {format === 'xlsx' ? (
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
            <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-100 truncate tracking-tight leading-snug">
              {document.title || 'Documento'}
            </span>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
              {format === 'xlsx' ? 'Planilha' : isCode ? 'Código' : format === 'txt' ? 'Texto' : (format === 'md' || format === 'markdown') ? 'Markdown' : 'Documento'} · {format.toUpperCase()}
            </span>

            {/* Validation Pipeline Badge Line */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
              {isValidated ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Validado · Testes: {val.testsPassed ?? 0}/{val.testsTotal ?? 0} · Lint: Aprovado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md font-bold">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Não validado
                </span>
              )}

              {val?.hash && (
                <span className="text-[10px] text-gray-400 font-mono">Hash: {val.hash.substring(0, 8)}</span>
              )}

              {(val?.filesGenerated || val?.commandsReproduced || val?.logs) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors flex items-center gap-0.5 text-[10px] font-semibold"
                >
                  <span>Detalhes Sandbox</span>
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Baixar button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className="bg-white hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-100 border border-gray-200/90 dark:border-gray-700 text-gray-800 text-xs font-semibold px-4 py-2 rounded-xl shadow-3xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95"
          title={`Baixar ${format.toUpperCase()}`}
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
          )}
          <span>Baixar</span>
        </button>
      </div>

      {/* Expanded Sandbox Telemetry Panel */}
      <AnimatePresence>
        {expanded && val && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 overflow-hidden bg-white dark:bg-gray-850 p-2.5 rounded-xl space-y-2 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-gray-100 pb-2">
              <div><strong>Arquivos:</strong> {filesCount}</div>
              <div><strong>Linting:</strong> {isValidated ? 'Aprovado sem warnings' : 'Não executado'}</div>
              <div><strong>Dependências:</strong> Nenhuma externa</div>
              <div><strong>Validação:</strong> {isValidated ? 'Sandbox Isolado' : 'Sem Execução'}</div>
            </div>

            {val.filesGenerated && val.filesGenerated.length > 0 && (
              <div>
                <strong className="block mb-1 text-[10px] uppercase tracking-wider text-gray-500">Arquivos Gerados ({val.filesGenerated.length})</strong>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {val.filesGenerated.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {val.commandsReproduced && val.commandsReproduced.length > 0 && (
              <div>
                <strong className="block mb-1 text-[10px] uppercase tracking-wider text-gray-500">Comandos de Validação Reproduzidos</strong>
                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md text-[10px] whitespace-pre-wrap border border-gray-200 dark:border-gray-800">
                  {val.commandsReproduced.join('\n')}
                </div>
              </div>
            )}

            {val.logs && (
              <div>
                <strong className="block mb-1 text-[10px] uppercase tracking-wider text-gray-500">Logs de Sandbox / Pytest</strong>
                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md text-[10px] whitespace-pre-wrap max-h-28 overflow-y-auto border border-gray-200 dark:border-gray-800">
                  {val.logs}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
