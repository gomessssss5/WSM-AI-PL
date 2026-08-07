import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCw, 
  Maximize2, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export interface ScreenshotItem {
  screenshot: string;
  url?: string;
  title?: string;
  stepName?: string;
  timestamp?: number;
}

interface BrowserPreviewPaneProps {
  screenshots: ScreenshotItem[];
  activeTaskText?: string;
  isThinking?: boolean;
  onClose: () => void;
  tasks?: string[];
  activeIndex?: number;
}

export default function BrowserPreviewPane({
  screenshots,
  activeTaskText,
  isThinking,
  onClose,
  tasks,
  activeIndex
}: BrowserPreviewPaneProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(() => Math.max(0, screenshots.length - 1));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Auto update to latest screenshot when new ones arrive
  useEffect(() => {
    if (isPlaying && screenshots.length > 0) {
      setCurrentIndex(screenshots.length - 1);
    }
  }, [screenshots.length, isPlaying]);

  const currentScreenshot = screenshots[currentIndex] || screenshots[screenshots.length - 1];

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.min(screenshots.length - 1, prev + 1));
  };

  const currentUrl = currentScreenshot?.url || 'https://wsm-chat.vercel.app';
  const currentTitle = currentScreenshot?.title || currentScreenshot?.stepName || activeTaskText || 'Navegador Omnix AI';

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f5f4f0] border-l border-gray-200/80 overflow-hidden relative font-sans select-none">
      {/* Top Browser Bar */}
      <div className="bg-white px-3 py-2 border-b border-gray-200/80 flex items-center justify-between gap-2 shadow-2xs z-20 shrink-0">
        {/* Left window buttons / title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 block" />
          </div>

          {/* Address input box */}
          <div className="flex items-center gap-2 bg-[#f4f3f1] hover:bg-[#eae8e5] transition-colors rounded-xl px-3 py-1 flex-1 max-w-xl border border-gray-200/60 min-w-0">
            <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="text-xs font-mono text-gray-700 truncate min-w-0">
              {currentUrl}
            </span>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Abrir URL em nova aba"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200/70 rounded-lg transition-colors cursor-pointer"
            title="Fechar visualização dividida"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Screenshot Viewport */}
      <div className="flex-1 relative bg-neutral-900/90 flex items-center justify-center p-2 md:p-4 overflow-hidden">
        {currentScreenshot ? (
          <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden bg-black/40 shadow-xl border border-white/10">
            <img
              src={currentScreenshot.screenshot}
              alt={currentTitle}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300"
            />

            {/* Subtle live indicator badge over viewport */}
            {isThinking && (
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Navegando ao vivo</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
            <Globe className="w-10 h-10 text-gray-500 animate-pulse" />
            <span className="text-sm font-medium">Aguardando capturas da navegação...</span>
          </div>
        )}
      </div>

      {/* Bottom Player Controls Bar (Matching Image 3) */}
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2.5 flex flex-col gap-2 shrink-0 z-20 shadow-lg">
        {/* Row 1: Player controls & slider */}
        <div className="flex items-center justify-between gap-3">
          {/* Skip Back / Play / Skip Forward */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-600 transition-colors cursor-pointer"
              title="Passo anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 text-gray-800 hover:text-black transition-colors cursor-pointer"
              title={isPlaying ? "Pausar reprodução" : "Reproduzir ao vivo"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= screenshots.length - 1}
              className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-600 transition-colors cursor-pointer"
              title="Próximo passo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Timeline slider bar */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(0, screenshots.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentIndex(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
            />
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-gray-600">
            <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-gray-1000 animate-pulse' : 'bg-gray-400'}`} />
            <span>Ao vivo</span>
          </div>
        </div>

        {/* Row 2: Step title display e.g. "Acessar o site wsm-chat.vercel.app 1/4" */}
        <div className="flex items-center justify-between text-xs font-medium text-gray-700 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-gray-150">
          <div className="flex items-center gap-2 truncate pr-2">
            <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="truncate font-semibold text-gray-800">
              {currentScreenshot?.stepName || activeTaskText || (tasks && tasks[currentIndex]) || 'Navegação Playwright'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-full shrink-0">
            {screenshots.length > 0 ? `${currentIndex + 1} / ${screenshots.length}` : '0 / 0'}
          </span>
        </div>
      </div>
    </div>
  );
}
