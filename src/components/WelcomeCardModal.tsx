import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Sparkles, Bot, Code2 } from 'lucide-react';

interface WelcomeCardModalProps {
  onClose: () => void;
}

export const WelcomeCardModal: React.FC<WelcomeCardModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'1.6.2' | '1.6.1'>('1.6.2');
  const [imgSrc162, setImgSrc162] = useState<string>("https://i.ibb.co/xtVwXdHQ/tech-ad-poster-wsm.webp");

  const handleImageError162 = () => {
    if (imgSrc162 !== "https://ibb.co/TxzJYdL5") {
      setImgSrc162("https://ibb.co/TxzJYdL5");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.08 }}
          className="relative z-10 w-full max-w-md sm:max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#eae6e1] flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eae6e1] bg-[#fcfbfa] shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-[#2563eb] rounded-xl border border-blue-100">
                <Sparkles size={18} />
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                Atualização: Ominx 1.6.2
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all cursor-pointer hover:rotate-90 duration-200"
              title="Fechar"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center p-1.5 bg-[#f4f1ea] mx-4 mt-3 rounded-2xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('1.6.2')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === '1.6.2'
                  ? 'bg-white text-[#2563eb] shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot size={14} />
              <span>Ominx 1.6.2</span>
              <span className="bg-[#2563eb] text-white text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider ml-0.5">Novo</span>
            </button>
            <button
              onClick={() => setActiveTab('1.6.1')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === '1.6.1'
                  ? 'bg-white text-[#2563eb] shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code2 size={14} />
              <span>Ominx 1.6.1</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === '1.6.2' ? (
                <motion.div 
                  key="tab-1.6.2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3.5"
                >
                  <div className="bg-blue-50/50 border border-blue-100/80 rounded-2xl p-3.5 text-center">
                    <h3 className="text-base sm:text-lg font-normal text-gray-900">
                      Ominx 1.6 agora é <strong className="font-extrabold text-[#2563eb]">AGENTE</strong>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-1.5">
                      agora, Ominx 1.6 consegue mexer e navegar em sites, clicando em botões, escrevendo textos, como se fosse um usuário.
                    </p>
                  </div>

                  {/* Image Container */}
                  <div className="bg-gray-950 rounded-2xl p-2 border border-gray-800 flex items-center justify-center overflow-hidden">
                    <img
                      src={imgSrc162}
                      alt="Ominx 1.6 agora é AGENTE"
                      onError={handleImageError162}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[48vh] sm:max-h-[52vh] object-contain rounded-xl shadow-md transition-transform duration-300 hover:scale-[1.01]"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="tab-1.6.1"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3.5"
                >
                  <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 space-y-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      Bugs arrumados e melhora na geração de códigos
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      A <strong>Ominx 1.6</strong> está mais apta para geração de códigos. Agora, na criação de sites, ela analisa o próprio site que criou, encontra bugs, erros, e analisa se está de acordo com o que o usuário pediu de forma autônoma e iterativa.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 space-y-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      Melhora do conhecimento do Ominx 1.6
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Ominx 1.6 agora tem conhecimento atualizado, além de conseguir fazer buscas na web pra aprimorar seus conhecimentos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom action button bar */}
          <div className="p-3.5 sm:p-4 bg-white border-t border-[#eae6e1] flex items-center justify-center shrink-0">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-extrabold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeCardModal;
