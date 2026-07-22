import React, { useState } from 'react';
import { WsmDocument } from '../types';
import { FileText, Download, Maximize2, X } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentCardProps {
  document: WsmDocument;
  key?: React.Key;
}

export default function DocumentCard({ document }: DocumentCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDownloadMarkdown = () => {
    const blob = new Blob([document.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleDownloadDOCX = () => {
    const element = window.document.getElementById('pdf-content-wrapper');
    if (element) {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
      const footer = "</body></html>";
      const html = header + element.innerHTML + footer;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.title}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full border border-[#eae6e1] rounded-xl bg-white shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
        onClick={() => setIsFullscreen(true)}
      >
        <div className="flex items-center justify-between p-3 border-b border-[#eae6e1] bg-[#fcfbfa]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-semibold text-[13px] text-gray-800 line-clamp-1">{document.title}</span>
          </div>
          <button 
            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 bg-white max-h-[200px] overflow-hidden relative">
           <div className="prose text-[12px] text-gray-500 line-clamp-6 opacity-70 pointer-events-none">
             <MarkdownRenderer content={document.content} />
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>
      </motion.div>

      <AnimatePresence>
      {isFullscreen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-white">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <FileText className="w-5 h-5" />
                 </div>
                 <div>
                    <h2 className="text-[15px] font-bold text-gray-900">{document.title}</h2>
                    <span className="text-[11px] text-gray-500">Documento Gerado</span>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors border border-transparent hover:border-gray-200"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-150 rounded-xl shadow-xl z-50 py-1">
                      <button 
                        onClick={handleDownloadMarkdown}
                        className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                      >
                        Baixar como Markdown (.md)
                      </button>
                      <button 
                        onClick={handleDownloadDOCX}
                        className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 rounded-b-xl"
                      >
                        Baixar como Word (.doc)
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-[#fcfbfa]">
              <div className="max-w-3xl mx-auto bg-white border border-gray-150 shadow-sm rounded-xl p-8 md:p-12 min-h-full">
                <div id="pdf-content-wrapper" className="prose max-w-none text-gray-800">
                  <MarkdownRenderer content={document.content} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
