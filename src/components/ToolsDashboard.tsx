import React from 'react';
import { 
  Languages, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ToolsDashboardProps {
  onOpenTranslator: () => void;
}

export default function ToolsDashboard({
  onOpenTranslator
}: ToolsDashboardProps) {
  return (
    <div className="flex-1 bg-[#FAF9F6] p-6 overflow-y-auto custom-scrollbar font-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-8 py-4">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel de Ferramentas</h1>
          <p className="text-sm text-gray-500 font-medium">
            Explore as ferramentas e utilitários inteligentes disponíveis em sua área de trabalho.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Translator Card */}
          <div 
            onClick={onOpenTranslator}
            className="group relative bg-white border border-gray-200 hover:border-indigo-200/80 rounded-2xl p-6 flex flex-col gap-5 cursor-pointer transition-all hover:shadow-md duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5c53e5] group-hover:scale-105 transition-transform">
                <Languages size={24} />
              </div>
              <span className="text-[10px] bg-indigo-50 text-[#5c53e5] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Inteligência Artificial
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-bold text-gray-900 group-hover:text-[#5c53e5] transition-colors flex items-center gap-1.5">
                <span>Tradutor Universal</span>
                <ArrowRight size={15} className="text-gray-400 group-hover:text-[#5c53e5] group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Traduza instantaneamente textos entre os 50 idiomas mais importantes do mundo usando modelos de IA avançados. Adapte o tom da tradução (formal, informal, profissional) e ouça as traduções pronunciadas nativamente.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-3.5 mt-auto flex items-center gap-2">
              <Sparkles size={12} className="text-[#5c53e5]" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                50 idiomas • Leitura por voz • Tom de escrita
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
