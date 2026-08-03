import React, { useState, useEffect } from 'react';
import { WsmDocument } from '../types';
import { 
  X, 
  Download, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  Loader2, 
  FileText,
  FileSpreadsheet,
  FileCode,
  AlignLeft,
  Code,
  Eye,
  ExternalLink
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import InteractiveSpreadsheetViewer from './InteractiveSpreadsheetViewer';
import PdfJsViewer from './PdfJsViewer';
import { generatePdfBlob } from '../utils/pdfGenerator';
import { generateExcelBlob } from '../utils/excelGenerator';
import { inferFormatFromTitle } from '../utils/docParser';
import { motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocumentViewerPaneProps {
  document: WsmDocument;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export default function DocumentViewerPane({
  document,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}: DocumentViewerPaneProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [docContent, setDocContent] = useState<string>(document.content || '');
  const [htmlPreviewMode, setHtmlPreviewMode] = useState<boolean>(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);

  useEffect(() => {
    setDocContent(document.content || '');
  }, [document]);

  const inferredFromTitle = inferFormatFromTitle(document.title || '', '');
  let rawFormat = (document.format || (document as any).type || inferredFromTitle || 'pdf').toString().toLowerCase();

  if (!rawFormat || rawFormat === 'pdf' || rawFormat === 'documento') {
    if (inferredFromTitle) {
      rawFormat = inferredFromTitle;
    } else {
      const trimmed = (docContent || '').trim().toLowerCase();
      if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || (trimmed.includes('<head>') && trimmed.includes('</body>'))) {
        rawFormat = 'html';
      }
    }
  }

  let format = rawFormat;
  if (rawFormat === 'markdown') {
    format = 'md';
  } else if (rawFormat === 'excel' || rawFormat === 'csv' || rawFormat === 'sheet' || rawFormat === 'planilha') {
    format = 'xlsx';
  }

  const isCode = ['html', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css'].includes(format);

  useEffect(() => {
    let isMounted = true;
    let urlToRevoke: string | null = null;
    
    if (format === 'pdf') {
      setIsPdfLoading(true);
      generatePdfBlob(document.title || 'Documento', docContent)
        .then(blob => {
          if (isMounted) {
            setPdfBlob(blob);
            const url = URL.createObjectURL(blob);
            urlToRevoke = url;
            setPdfBlobUrl(url);
            setIsPdfLoading(false);
          }
        })
        .catch(err => {
          console.error("Erro ao gerar preview do PDF:", err);
          if (isMounted) setIsPdfLoading(false);
        });
    } else {
      setPdfBlobUrl(null);
      setPdfBlob(null);
    }

    return () => {
      isMounted = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [format, docContent, document.title]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 180));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoom(100);

  const handleDownload = async () => {
    if (format === 'md' || format === 'txt' || isCode) {
      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.title || 'arquivo'}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      try {
        setIsGenerating(true);
        const excelBlob = await generateExcelBlob(document.title || 'Planilha', docContent);
        const url = URL.createObjectURL(excelBlob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.title || 'planilha'}.xlsx`;
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
        const pdfBlob = await generatePdfBlob(document.title || 'Documento', docContent);
        const url = URL.createObjectURL(pdfBlob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.title || 'documento'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erro ao gerar PDF:", err);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`h-full bg-[#f4f3f1] dark:bg-gray-950 flex flex-col overflow-hidden relative border-l border-[#eae6e1] dark:border-gray-800 min-w-0 max-w-full ${
        isFullscreen ? 'w-full flex-1' : 'w-full md:w-1/2 flex-1'
      }`}
    >
      {/* Top Header Controls Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-[#eae6e1] dark:border-gray-800 px-3 md:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0 z-20 shadow-3xs select-none">
        
        {/* Document Info */}
                {/* Eye/Code toggle for HTML */}
        {format === 'html' && (
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 mr-2 shrink-0">
            <button
              onClick={() => setHtmlPreviewMode(true)}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${htmlPreviewMode ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              title="Visualizar HTML"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHtmlPreviewMode(false)}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${!htmlPreviewMode ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              title="Código HTML"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
        )}
<div className="flex items-center gap-2.5 min-w-0 flex-1">
          {format === 'xlsx' ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          ) : isCode ? (
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
          ) : format === 'txt' ? (
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/80 flex items-center justify-center text-gray-600 dark:text-gray-400 shrink-0">
              <AlignLeft className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex flex-col">
            <span className="font-bold text-[13.5px] text-gray-900 dark:text-gray-100 truncate leading-snug">
              {document.title || 'Documento'}
            </span>
            <span className="text-[10.5px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {format === 'xlsx' ? 'Planilha' : isCode ? 'Código' : format === 'txt' ? 'Texto' : 'Documento'} · {format.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          
          {/* Zoom controls (Only for PDF/MD paper view) */}
          {format !== 'xlsx' && (
            <div className="hidden sm:flex items-center gap-1 bg-[#f4f3f1] dark:bg-gray-800/80 border border-[#eae6e1] dark:border-gray-700/80 rounded-xl p-1 text-xs">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 60}
                className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-all cursor-pointer"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors cursor-pointer"
                title="Resetar zoom para 100%"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 180}
                className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-all cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            onClick={onToggleFullscreen}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f4f3f1] hover:bg-[#eae8e5] dark:bg-gray-800 dark:hover:bg-gray-700 border border-[#eae6e1] dark:border-gray-700 rounded-xl text-[12px] font-semibold text-gray-700 dark:text-gray-200 transition-all cursor-pointer active:scale-95"
            title={isFullscreen ? "Restaurar visão dividida" : "Expandir para tela cheia"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                <span>Dividir tela</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                <span>Tela cheia</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-1.5 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
              format === 'xlsx'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title={`Baixar ${format.toUpperCase()}`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Gerando...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </>
            )}
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors cursor-pointer"
            title="Fechar documento"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Reader / Interactive Spreadsheet Area */}
      <div className={`flex-1 overflow-y-auto scrollbar-thin ${format === 'xlsx' || isCode ? 'flex flex-col' : 'flex justify-center items-start p-3 sm:p-6 md:p-8'}`}>
        {format === 'xlsx' ? (
            <InteractiveSpreadsheetViewer
              title={document.title}
              content={docContent}
              onContentChange={(updated) => setDocContent(updated)}
            />
        ) : isCode ? (
          <div className="flex-1 flex flex-col w-full h-full bg-white dark:bg-[#1e1e1e]">
            <div className="flex-1 overflow-auto relative">
              {format === 'html' && htmlPreviewMode ? (
                <iframe
                  srcDoc={docContent}
                  title="HTML Preview"
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-modals"
                />
              ) : (
                <SyntaxHighlighter 
                  language={format === 'html' ? 'markup' : format === 'js' ? 'javascript' : format === 'ts' ? 'typescript' : format === 'py' ? 'python' : format} 
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1rem', minHeight: '100%', fontSize: '13.5px', background: 'transparent' }}
                  showLineNumbers={true}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {docContent}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
        ) : format === 'txt' ? (
          <div 
            className="w-full bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-xl rounded-sm p-6 sm:p-10 md:p-12 my-2 md:my-4 transition-all duration-200 origin-top"
            style={{ 
              maxWidth: '820px',
              transform: zoom !== 100 ? `scale(${zoom / 100})` : 'none',
              transformOrigin: 'top center'
            }}
          >
            <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 text-[14px] md:text-[15px] leading-relaxed">
              {docContent}
            </pre>
          </div>
        ) : format === 'pdf' ? (
          <div className="w-full flex justify-center py-2">
            <PdfJsViewer
              blob={pdfBlob}
              blobUrl={pdfBlobUrl}
              title={document.title}
              zoom={zoom}
              onZoomChange={setZoom}
              downloadFilename={`${document.title || 'documento'}.pdf`}
            />
          </div>
        ) : (
          <div 
            className="w-full bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-xl rounded-sm p-6 sm:p-10 md:p-16 my-2 md:my-4 transition-all duration-200 origin-top"
            style={{ 
              maxWidth: '820px',
              transform: zoom !== 100 ? `scale(${zoom / 100})` : 'none',
              transformOrigin: 'top center'
            }}
          >
            {/* Main Document Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1d3557] dark:text-blue-400 text-center tracking-tight mb-8 md:mb-10 leading-tight">
              {document.title}
            </h1>

            {/* Document Markdown Content */}
            <div className="prose max-w-none text-gray-800 dark:text-gray-200 text-justify leading-relaxed font-sans text-[14px] md:text-[15px] space-y-4">
              <MarkdownRenderer content={docContent} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
