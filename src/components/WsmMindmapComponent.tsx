import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { Maximize2, Minimize2, Copy, Check, RefreshCw, ZoomIn, ZoomOut, X } from 'lucide-react';

interface WsmMindmapComponentProps {
  title?: string;
  markdown: string;
}

const transformer = new Transformer();

export default function WsmMindmapComponent({ title, markdown }: WsmMindmapComponentProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fullscreenSvgRef = useRef<SVGSVGElement | null>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const fullscreenMarkmapRef = useRef<Markmap | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize/update standard view
  useEffect(() => {
    if (!svgRef.current || !markdown) return;

    try {
      const { root } = transformer.transform(markdown);
      if (markmapRef.current) {
        markmapRef.current.setData(root);
        markmapRef.current.fit();
      } else {
        markmapRef.current = Markmap.create(svgRef.current, {
          autoFit: true,
          duration: 300,
        }, root);
      }
    } catch (err) {
      console.error('Erro ao renderizar o mapa mental:', err);
    }
  }, [markdown]);

  // Initialize/update fullscreen view when opened
  useEffect(() => {
    if (!isFullscreen || !fullscreenSvgRef.current || !markdown) return;

    try {
      const { root } = transformer.transform(markdown);
      if (fullscreenMarkmapRef.current) {
        fullscreenMarkmapRef.current.setData(root);
        fullscreenMarkmapRef.current.fit();
      } else {
        fullscreenMarkmapRef.current = Markmap.create(fullscreenSvgRef.current, {
          autoFit: true,
          duration: 300,
        }, root);
        setTimeout(() => {
          fullscreenMarkmapRef.current?.fit();
        }, 150);
      }
    } catch (err) {
      console.error('Erro ao renderizar o mapa mental em tela cheia:', err);
    }
  }, [isFullscreen, markdown]);

  const handleFit = () => {
    if (isFullscreen && fullscreenMarkmapRef.current) {
      fullscreenMarkmapRef.current.fit();
    } else if (markmapRef.current) {
      markmapRef.current.fit();
    }
  };

  const handleZoomIn = () => {
    if (isFullscreen && fullscreenMarkmapRef.current) {
      fullscreenMarkmapRef.current.rescale(1.25);
    } else if (markmapRef.current) {
      markmapRef.current.rescale(1.25);
    }
  };

  const handleZoomOut = () => {
    if (isFullscreen && fullscreenMarkmapRef.current) {
      fullscreenMarkmapRef.current.rescale(0.8);
    } else if (markmapRef.current) {
      markmapRef.current.rescale(0.8);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (isModal: boolean) => (
    <div className={`flex flex-col bg-white dark:bg-neutral-900 overflow-hidden ${
      isModal 
        ? 'w-full h-full rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl' 
        : 'relative w-full max-w-full my-5 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/90 dark:bg-neutral-800/80 flex items-center justify-between gap-2 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <h4 className="font-semibold text-sm text-gray-800 dark:text-neutral-200 truncate">
            {title || 'Mapa Mental Interativo'}
          </h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleZoomIn}
            title="Aumentar Zoom"
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-gray-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Diminuir Zoom"
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-gray-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFit}
            title="Centralizar Visualização"
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-gray-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Centralizar</span>
          </button>
          <button
            onClick={handleCopyMarkdown}
            title="Copiar Markdown"
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-gray-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isModal ? 'Fechar Tela Cheia' : 'Abrir Tela Cheia'}
            className="p-1.5 text-gray-700 hover:text-black dark:text-neutral-300 dark:hover:text-white bg-gray-200/80 hover:bg-gray-300 dark:bg-neutral-700/80 dark:hover:bg-neutral-600 rounded-lg transition-colors ml-1"
          >
            {isModal ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className={`relative w-full ${isModal ? 'flex-1 h-full' : 'h-[380px] sm:h-[430px]'} bg-white dark:bg-neutral-900 overflow-hidden`}>
        <svg 
          ref={isModal ? fullscreenSvgRef : svgRef} 
          className="w-full h-full text-gray-900 dark:text-neutral-100" 
        />
      </div>
    </div>
  );

  return (
    <>
      {renderContent(false)}

      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200">
            {renderContent(true)}
          </div>,
          document.body
        )}
    </>
  );
}

