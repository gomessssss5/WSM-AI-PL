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

  const handleImageClick = (src: string, title: string) => {
    setLightboxImage({ src, title });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.08 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#eae6e1] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 relative"
          >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3efe9] shrink-0 bg-[#fdfcfb]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-[#2563eb] rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Atualização: Ominx 1.6.2</h2>
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
            {/* Ominx 1.6.2 Section */}
            <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#2563eb] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Versão 1.6.2 (Mais Recente)
                </span>
              </div>

              <h3 className="text-lg font-normal text-gray-900">
                Ominx 1.6 agora é <strong className="font-extrabold text-[#2563eb]">AGENTE</strong>
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                agora, Ominx 1.6 consegue mexer e navegar em sites, clicando em botões, escrevendo textos, como se fosse um usuário.
              </p>

              {/* Image */}
              <div 
                onClick={() => handleImageClick("https://i.ibb.co/xtVwXdHQ/tech-ad-poster-wsm.webp", "Ominx 1.6 agora é AGENTE")}
                className="group relative bg-gray-950 rounded-xl border border-gray-800 overflow-hidden cursor-pointer shadow-3xs w-full flex justify-center p-2"
              >
                <img
                  src="https://i.ibb.co/xtVwXdHQ/tech-ad-poster-wsm.webp"
                  alt="Ominx 1.6 agora é AGENTE"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[500px] object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                  <ZoomIn className="w-5 h-5" />
                  <span>Clique para ver em tela cheia</span>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-[#f3efe9]"></div>

            {/* Ominx 1.6.1 Section */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Histórico - Versão 1.6.1
              </span>

              <div className="space-y-3">
                <h3 className="text-md font-bold text-gray-900">Bugs arrumados e melhora na geração de códigos</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A <strong>Ominx 1.6</strong> está mais apta para geração de códigos. Agora, na criação de sites, ela analisa o próprio site que criou, encontra bugs, erros, e analisa se está de acordo com o que o usuário pediu de forma autônoma e iterativa.
                </p>

                <h3 className="text-md font-bold text-gray-900 pt-2">Melhora do conhecimento do Ominx 1.6</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ominx 1.6 agora tem conhecimento atualizado, além de conseguir fazer buscas na web pra aprimorar seus conhecimentos.
                </p>
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
        </div>
      )}
    </AnimatePresence>
  );
}
