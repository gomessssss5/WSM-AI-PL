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
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import InteractiveSpreadsheetViewer from './InteractiveSpreadsheetViewer';
import PdfJsViewer from './PdfJsViewer';
import { generatePdfBlob } from '../utils/pdfGenerator';
import { generateExcelBlob } from '../utils/excelGenerator';
import { triggerBlobDownload } from '../utils/fileDownload';
import { inferFormatFromTitle } from '../utils/docParser';
import { motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocumentViewerPaneProps {
  document: WsmDocument;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  attachedImages?: string[];
}

export default function DocumentViewerPane({
  document,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  attachedImages,
}: DocumentViewerPaneProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const sanitizeContent = (rawContent: string) => {
    let raw = rawContent || '';
    if (typeof raw === 'string' && raw.trim().startsWith('{') && raw.includes('"content"')) {
      try {
        const parsed = JSON.parse(raw.trim());
        if (parsed && typeof parsed === 'object' && parsed.content !== undefined) {
          raw = String(parsed.content);
        }
      } catch (e) {
        const contentMatch = raw.match(/"content"\s*:\s*"([\s\S]*)"/i);
        if (contentMatch) {
          let extracted = contentMatch[1];
          extracted = extracted.replace(/"\s*,\s*"format"[\s\S]*$/i, '')
                               .replace(/"\s*,\s*"title"[\s\S]*$/i, '')
                               .replace(/"\s*}\s*$/i, '');
          raw = extracted;
        }
      }
    }
    if (typeof raw === 'string' && (raw.includes('\\n') || raw.includes('\\"'))) {
      raw = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    }
    return raw;
  };

  const [docContent, setDocContent] = useState<string>(() => sanitizeContent(document.content || ''));
  
  useEffect(() => {
    setDocContent(sanitizeContent(document.content || ''));
  }, [document.content, document]);

  const [htmlPreviewMode, setHtmlPreviewMode] = useState<boolean>(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (docContent) {
      navigator.clipboard.writeText(docContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sanitizeHtmlContent = (contentStr: string) => {
    let clean = contentStr || '';
    clean = clean.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    return clean;
  };

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

  const cleanedHtmlDoc = format === 'html' ? sanitizeHtmlContent(docContent) : docContent;

  const isCode = ['html', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css'].includes(format);

  useEffect(() => {
    let isMounted = true;
    let urlToRevoke: string | null = null;
    
    if (format === 'pdf') {
      setIsPdfLoading(true);
      generatePdfBlob(document.title || 'Documento', docContent, attachedImages || (document as any).images || (document as any).attachedImages)
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
    if (format === 'html') {
      let fname = document.title || 'site.html';
      if (!fname.toLowerCase().endsWith('.html') && !fname.toLowerCase().endsWith('.htm')) fname += '.html';
      const blob = new Blob([cleanedHtmlDoc], { type: 'text/html;charset=utf-8' });
      triggerBlobDownload(fname, blob);
    } else if (format === 'md' || format === 'txt' || isCode) {
      let fname = document.title || 'arquivo';
      if (!fname.toLowerCase().endsWith('.' + format)) fname += '.' + format;
      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
      triggerBlobDownload(fname, blob);
    } else if (format === 'xlsx') {
      try {
        setIsGenerating(true);
        let fname = document.title || 'planilha';
        if (!fname.toLowerCase().endsWith('.xlsx')) fname += '.xlsx';
        const excelBlob = await generateExcelBlob(document.title || 'Planilha', docContent);
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
        const pdfBlob = await generatePdfBlob(document.title || 'Documento', docContent, attachedImages || (document as any).images || (document as any).attachedImages);
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex flex-col overflow-hidden relative min-w-0 max-w-full z-30 shrink-0 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center' 
          : 'w-full md:w-1/2 flex-1 h-full p-2 sm:p-3 max-md:fixed max-md:inset-0 max-md:z-50 max-md:p-2 bg-stone-100/50 dark:bg-stone-950/50'
      }`}
    >
      <div className={`flex flex-col h-full w-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-sm overflow-hidden relative ${
        isFullscreen ? 'max-w-6xl h-[90vh] shadow-2xl' : ''
      }`}>
        {/* Top Header Controls Bar */}
        <div className="bg-stone-50/80 dark:bg-stone-900/90 backdrop-blur-xs border-b border-stone-200/80 dark:border-stone-800 px-3 md:px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 z-20 select-none">
          
          {/* Document Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Eye/Code toggle for HTML */}
            {format === 'html' ? (
              <div className="flex items-center gap-0.5 bg-stone-200/60 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 shrink-0">
                <button
                  onClick={() => setHtmlPreviewMode(true)}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${htmlPreviewMode ? 'bg-white dark:bg-stone-700 shadow-3xs text-black dark:text-blue-400' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
                  title="Visualizar HTML"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setHtmlPreviewMode(false)}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${!htmlPreviewMode ? 'bg-white dark:bg-stone-700 shadow-3xs text-black dark:text-blue-400' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
                  title="Código HTML"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 shrink-0">
                <Eye className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Document Title & Format */}
            <div className="flex items-center gap-1.5 min-w-0 font-sans">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate" title={document.title}>
                {document.title}
              </span>
              <span className="text-stone-300 dark:text-stone-700 text-xs font-semibold">·</span>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider shrink-0">
                {format}
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Google Drive Logo Indicator */}
            <div 
              className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer text-stone-500"
              title="Salvo no Google Drive / Workspace"
            >
              <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2" fill="#00832d"/>
                <path d="m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-13.75-23.8c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8" fill="#ffba00"/>
                <path d="m73.4 76.8 1.2-2.1 12.55-21.7c.8-1.4 1.2-2.95 1.2-4.5h-28.5l-26.2 45.3h18.5c1.6 0 3.15-.45 4.5-1.2" fill="#2684fc"/>
              </svg>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-stone-200/80 dark:border-stone-700 cursor-pointer active:scale-95"
              title="Copiar conteúdo"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            {/* Zoom controls (Only for PDF/MD paper view) */}
            {format !== 'xlsx' && (
              <div className="hidden sm:flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-1 text-xs">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 60}
                  className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded-lg text-stone-600 dark:text-stone-300 disabled:opacity-30 transition-all cursor-pointer"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-1.5 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:text-black transition-colors cursor-pointer"
                  title="Resetar zoom para 100%"
                >
                  {zoom}%
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 180}
                  className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded-lg text-stone-600 dark:text-stone-300 disabled:opacity-30 transition-all cursor-pointer"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 hover:bg-stone-200/80 dark:hover:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-400 transition-colors cursor-pointer"
              title={isFullscreen ? "Restaurar visão dividida" : "Expandir para tela cheia"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                format === 'xlsx'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
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
              className="p-1.5 hover:bg-stone-200/80 dark:hover:bg-stone-800 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 transition-colors cursor-pointer"
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
          <div className="flex-1 flex flex-col w-full h-full min-h-[500px] bg-white dark:bg-[#1e1e1e] relative">
            <div className="flex-1 w-full h-full min-h-[500px] overflow-auto relative">
              {format === 'html' && htmlPreviewMode ? (
                <iframe
                  srcDoc={cleanedHtmlDoc}
                  title="HTML Preview"
                  className="w-full h-full min-h-[500px] border-none bg-white absolute inset-0"
                  sandbox="allow-scripts allow-modals allow-same-origin"
                />
              ) : (
                <SyntaxHighlighter 
                  language={format === 'html' ? 'markup' : format === 'js' ? 'javascript' : format === 'ts' ? 'typescript' : format === 'py' ? 'python' : format} 
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1rem', minHeight: '100%', fontSize: '13.5px', background: 'transparent' }}
                  showLineNumbers={true}
                  wrapLongLines={true}
                  codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }}
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
    </div>
  </motion.div>
);
}
