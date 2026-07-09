import React from 'react';
import { BookOpen, ArrowRight, ChevronDown, Wrench } from 'lucide-react';

interface ToolsDashboardProps {
  onOpenWriterArea: () => void;
  onOpenMobileHistory?: () => void;
}

export default function ToolsDashboard({
  onOpenWriterArea,
  onOpenMobileHistory,
}: ToolsDashboardProps) {
  return (
    <div id="wsm-tools-dashboard" className="flex-1 bg-white flex flex-col font-sans overflow-y-auto">
      {/* Top Header / Action Bar - Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-transparent w-full relative z-40 border-b border-gray-100/50 shrink-0">
        <button onClick={onOpenMobileHistory} className="flex items-center gap-1.5 text-gray-800 text-[16px] font-normal active:opacity-70">
          <span className="text-[20px] font-light mr-1">‹</span>
          WSM Ferramentas <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
        </button>
      </div>

      <div className="flex flex-col items-center py-8 md:py-20 px- sm:px-8 max-w-5xl mx-auto w-full">
        <div className="w-full flex flex-col gap-8 px-4 sm:px-0">
          {/* Header section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#5c53e5] font-mono text-xs font-semibold uppercase tracking-wider">
              <Wrench size={16} />
              <span>Painel de Produtividade</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Ferramentas Disponíveis
            </h1>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed">
              Explore os módulos especializados de inteligência artificial integrados para expandir seus limites criativos e de produtividade.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 max-w-lg w-full gap-6 mt-2">
            
            {/* Tool Card: Área do Escritor */}
            <div 
              id="tool-card-writer"
              onClick={onOpenWriterArea}
              className="group relative flex flex-col justify-between bg-white hover:bg-zinc-50/50 border border-gray-200 hover:border-gray-300 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Subtle decorative background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-blue-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                {/* Icon Circle */}
                <div className="w-12 h-12 bg-indigo-50 text-[#5c53e5] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm border border-indigo-100/30">
                  <BookOpen size={24} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#5c53e5] transition-colors font-sans">
                    Área do Escritor
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Ideal para redações, e-mails, artigos ou livros completos. Escreva com apoio em tempo real de uma IA revisora que sugere melhorias estruturais e continua suas ideias com fluidez.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-[#5c53e5] group-hover:gap-2.5 transition-all relative z-10">
                <span>Acessar ferramenta</span>
                <ArrowRight size={16} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
