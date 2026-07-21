import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ZoomIn } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateModal({ isOpen, onClose }: UpdateModalProps) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  // Handle escape key to close modal or lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImage, onClose]);

  if (!isOpen) return null;

  const handleImageClick = (src: string, title: string) => {
    setLightboxImage({ src, title });
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      >
        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-[#eae6e1] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3efe9] shrink-0 bg-[#fdfcfb]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Atualização: WSM 1.6.1</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Description Card */}
            <div className="space-y-3">
              <h3 className="text-md font-bold text-gray-900">Bugs arrumados e melhora na geração de códigos</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A <strong>WSM 1.6 Pro</strong> está mais apta para geração de códigos. Agora, na criação de sites, ela analisa o próprio site que criou, encontra bugs, erros, e analisa se está de acordo com o que o usuário pediu de forma autônoma e iterativa.
              </p>

              <h3 className="text-md font-bold text-gray-900 pt-2">Melhora do conhecimento do WSM 1.6</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                WSM 1.6 agora tem conhecimento de até março de 2026, além de conseguir fazer buscas na web pra aprimorar seus conhecimentos.
              </p>
            </div>

            {/* Separator */}
            <div className="border-t border-[#f3efe9]"></div>

            {/* Examples Section - Stacked vertically for larger sizes */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider text-[11px]">
                Comparação de Versões
              </h4>

              <div className="flex flex-col gap-6">
                {/* Old version */}
                <div className="border border-[#eae6e1] bg-[#faf9f6] rounded-xl p-5 flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-600">WSM 1.6.0 (versão antiga)</span>
                  </div>
                  
                  {/* Image container */}
                  <div 
                    onClick={() => handleImageClick("https://i.ibb.co/d0NQ3Kzc/Screenshot-2026-07-21-15-02-29.png", "WSM 1.6.0 (versão antiga)")}
                    className="group relative bg-white rounded-lg border border-[#eae6e1] overflow-hidden cursor-pointer shadow-3xs w-full flex justify-center"
                  >
                    <img
                      src="https://i.ibb.co/d0NQ3Kzc/Screenshot-2026-07-21-15-02-29.png"
                      alt="WSM 1.6.0"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                      <ZoomIn className="w-5 h-5" />
                      <span>Clique para ver em tela cheia</span>
                    </div>
                  </div>
                </div>

                {/* New version */}
                <div className="border border-indigo-100 bg-indigo-50/10 rounded-xl p-5 flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-indigo-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> WSM 1.6.1 (atualização)
                    </span>
                  </div>
                  
                  {/* Image container */}
                  <div 
                    onClick={() => handleImageClick("https://i.ibb.co/gbkcyrBZ/Screenshot-2026-07-21-15-03-46.png", "WSM 1.6.1 (atualização)")}
                    className="group relative bg-white rounded-lg border border-indigo-100 overflow-hidden cursor-pointer shadow-3xs w-full flex justify-center"
                  >
                    <img
                      src="https://i.ibb.co/gbkcyrBZ/Screenshot-2026-07-21-15-03-46.png"
                      alt="WSM 1.6.1"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                      <ZoomIn className="w-5 h-5" />
                      <span>Clique para ver em tela cheia</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#fdfcfb] border-t border-[#f3efe9] flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-900 hover:bg-gray-800 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>

        {/* Fullscreen Lightbox Portal */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxImage(null)}
              className="fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center p-4 md:p-8"
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors cursor-pointer z-50 shadow-lg"
                title="Fechar visualização"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center space-y-4" onClick={(e) => e.stopPropagation()}>
                <h4 className="text-white text-base font-bold tracking-wide select-none shrink-0">{lightboxImage.title}</h4>
                
                <div className="relative flex-1 w-full max-h-[82vh] overflow-hidden bg-zinc-950/40 rounded-xl flex items-center justify-center">
                  <img
                    src={lightboxImage.src}
                    alt={lightboxImage.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[82vh] w-auto max-w-full object-contain rounded-lg select-none shadow-2xl"
                  />
                </div>

                <div className="shrink-0 pt-2">
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-95"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
