import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Loader2, 
  AlertCircle,
  Download
} from 'lucide-react';

// Set up pdf.js worker using standard cdnjs or jsdelivr matching exact pdfjsLib version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

interface PdfJsViewerProps {
  blob?: Blob | null;
  blobUrl?: string | null;
  title?: string;
  zoom?: number; // scale percentage e.g. 100
  onZoomChange?: (newZoom: number) => void;
  downloadFilename?: string;
}

export default function PdfJsViewer({
  blob,
  blobUrl,
  title = 'Documento PDF',
  zoom = 100,
  onZoomChange,
  downloadFilename = 'documento.pdf'
}: PdfJsViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Scale computation
  const userScale = (zoom || 100) / 100;

  // Track container width changes (e.g. side pane opening/resizing)
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current?.clientWidth) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();

    // Use ResizeObserver for smooth re-scaling when side drawer expands
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(containerRef.current);
    } else {
      window.addEventListener('resize', updateWidth);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener('resize', updateWidth);
      }
    };
  }, []);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setPdfDoc(null);

    async function loadPdf() {
      try {
        let loadingTask;

        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        } else if (blobUrl) {
          loadingTask = pdfjsLib.getDocument({ url: blobUrl });
        } else {
          if (isMounted) {
            setIsLoading(false);
            setErrorMessage('Nenhum dado de PDF fornecido.');
          }
          return;
        }

        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Erro ao carregar PDF no PDF.js:', err);
        if (isMounted) {
          setIsLoading(false);
          setErrorMessage(err?.message || 'Falha ao processar a estrutura do PDF.');
        }
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [blob, blobUrl]);

  // Render Page onto Canvas
  const renderPage = useCallback(async (pageNumber: number, canvasEl: HTMLCanvasElement) => {
    if (!pdfDoc || !canvasEl) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      
      // Compute standard viewport scale
      const currentWidth = containerWidth > 0 ? containerWidth : (containerRef.current?.clientWidth || 800);
      
      // Ensure 100% zoom fills the reader pane generously and crisply like Image 2
      const availableWidth = Math.max(320, currentWidth - 16);
      const targetWidth = currentWidth >= 600 ? Math.min(840, Math.max(740, availableWidth)) : availableWidth;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const fitScale = targetWidth / unscaledViewport.width;
      const finalScale = fitScale * userScale;

      const viewport = page.getViewport({ scale: finalScale });

      // High-DPI support
      const pixelRatio = window.devicePixelRatio || 1;
      canvasEl.width = Math.floor(viewport.width * pixelRatio);
      canvasEl.height = Math.floor(viewport.height * pixelRatio);

      canvasEl.style.width = `${Math.floor(viewport.width)}px`;
      canvasEl.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      ctx.scale(pixelRatio, pixelRatio);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.warn(`Erro ao renderizar página ${pageNumber} do PDF:`, err);
    }
  }, [pdfDoc, userScale, containerWidth]);

  // Trigger render when pdfDoc, userScale, containerWidth, or numPages change
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const canvasEl = pageRefs.current[pageNum - 1];
      if (canvasEl) {
        renderPage(pageNum, canvasEl);
      }
    }
  }, [pdfDoc, numPages, userScale, containerWidth, renderPage]);

  // Download PDF file
  const handleDownload = () => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="w-full flex flex-col items-center min-h-[500px]" ref={containerRef}>
      {/* Loading state */}
      {isLoading && (
        <div className="w-full max-w-[820px] h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 shadow-lg">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Renderizando PDF via PDF.js...
          </span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMessage && (
        <div className="w-full max-w-[820px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 my-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <h3 className="text-base font-bold text-red-800 dark:text-red-300">Não foi possível exibir a prévia do PDF</h3>
          <p className="text-xs text-red-600 dark:text-red-400 max-w-md">{errorMessage}</p>
          <button
            type="button"
            onClick={handleDownload}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Baixar arquivo PDF direto</span>
          </button>
        </div>
      )}

      {/* PDF Pages rendered on Canvas elements */}
      {!isLoading && !errorMessage && pdfDoc && (
        <div className="w-full flex flex-col items-center gap-6 py-2">
          {Array.from({ length: numPages }, (_, index) => {
            const pageNum = index + 1;
            return (
              <div
                key={`pdf-page-${pageNum}`}
                className="relative bg-white shadow-xl dark:shadow-2xl rounded-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-transform duration-150"
                style={{
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <canvas
                  ref={(el) => {
                    pageRefs.current[index] = el;
                  }}
                  className="block bg-white"
                />
                <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-mono select-none bg-white/80 dark:bg-gray-900/80 px-1.5 py-0.5 rounded backdrop-blur-xs">
                  {pageNum}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
