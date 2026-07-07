import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code, Play, Copy, Check, Maximize2, X, FileCode } from 'lucide-react';

interface HtmlCodeBlockProps {
  code: string;
}

export default function HtmlCodeBlock({ code }: HtmlCodeBlockProps) {
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 bg-white dark:bg-gray-950 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-full">
      {/* Header of the Card */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 select-none shadow-3xs">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="font-sans text-[13px] text-gray-700 dark:text-gray-300 font-bold tracking-wide uppercase">
            HTML
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('code')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'code'
                ? 'text-[#5c53e5] bg-[#5c53e5]/10 font-bold shadow-3xs'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-850'
            }`}
            title="Ver Código"
          >
            <Code className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'preview'
                ? 'text-[#5c53e5] bg-[#5c53e5]/10 font-bold shadow-3xs'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-850'
            }`}
            title="Visualizar HTML"
          >
            <Play className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

          {viewMode === 'code' ? (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-850 transition-all flex items-center justify-center"
              title="Copiar Código"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsMaximized(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-850 transition-all flex items-center justify-center"
              title="Tela Cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[100px] w-full bg-[#f9f9fb] dark:bg-gray-950">
        <AnimatePresence mode="wait">
          {viewMode === 'code' ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <pre className="p-4 overflow-x-auto text-[13px] text-gray-800 dark:text-gray-200 font-mono leading-relaxed bg-[#f9f9fb] dark:bg-gray-950 select-text max-h-[500px]">
                <code>{code}</code>
              </pre>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <iframe
                srcDoc={code}
                title="HTML Preview"
                sandbox="allow-scripts"
                className="w-full min-h-[350px] border-none bg-white rounded-b-2xl shadow-3xs"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen Overlay Modal */}
      <AnimatePresence>
        {isMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col w-full h-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
            >
              {/* Modal Header */}
              <div className="bg-gray-50 dark:bg-gray-950 px-5 py-3 flex items-center justify-between border-b border-gray-150 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#5c53e5]" />
                  <span className="font-sans text-sm font-bold text-gray-800 dark:text-gray-200">
                    Visualização em Tela Cheia
                  </span>
                </div>
                <button
                  onClick={() => setIsMaximized(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-gray-850 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Iframe Container */}
              <div className="flex-1 w-full bg-white relative">
                <iframe
                  srcDoc={code}
                  title="Fullscreen HTML Preview"
                  sandbox="allow-scripts"
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
