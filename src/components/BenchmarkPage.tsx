import React, { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';

export default function BenchmarkPage() {
  const [selectedDate, setSelectedDate] = useState('18 de Julho de 2026');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#faf9f6] text-gray-800 font-sans overflow-y-auto">
      {/* Header */}
      <header className="relative flex items-center justify-center py-4 border-b border-[#eae6e1] bg-white sticky top-0 z-50 shadow-xs px-4">
        {/* Back button on the left */}
        <button
          onClick={() => window.location.href = '/'}
          className="absolute left-4 md:left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 font-medium text-[13px] transition-all cursor-pointer active:scale-95"
          title="Voltar para a IA"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar para a IA</span>
        </button>

        <div className="flex items-center gap-2.5">
          <img 
            src="https://i.ibb.co/Q34b6rBW/37990-removebg-preview.png" 
            alt="WSM AI Logo" 
            className="w-7 h-7 object-contain"
          />
          <h1 className="font-bold text-[17px] tracking-tight text-gray-900">WSM AI 1.6</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-5 py-10 md:py-16 flex flex-col items-center">
        <h2 className="text-[28px] md:text-4xl font-bold tracking-tight text-gray-900 text-center mb-8">
          Desempenho WSM 1.6 Pro
        </h2>

        {/* Date Selector */}
        <div className="relative mb-12">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-5 py-3 bg-white border border-[#eae6e1] hover:border-gray-300 hover:shadow-md rounded-2xl text-[15px] font-medium text-gray-700 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <span>{selectedDate}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full mt-2 w-full bg-white border border-[#eae6e1] rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in slide-in-from-top-2 duration-200">
                <button
                  className="w-full text-left px-4 py-2.5 text-[14px] text-gray-700 hover:bg-[#f8f7f5] font-medium transition-colors"
                  onClick={() => {
                    setSelectedDate('18 de Julho de 2026');
                    setIsDropdownOpen(false);
                  }}
                >
                  18 de Julho de 2026
                </button>
              </div>
            </>
          )}
        </div>

        {/* Benchmark Sections */}
        <div className="w-full flex flex-col gap-12">
          {/* Section 1 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Classificação geral das IAs:
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/fGNKXQBn/Screenshot-2026-07-18-11-46-19.png" 
                alt="Classificação geral das IAs"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 2 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Raciocínio geral
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/zVCxncVT/Screenshot-2026-07-18-11-48-33.png" 
                alt="Raciocínio geral"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 3 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Matemática avançada
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/4gDh0JdQ/Screenshot-2026-07-18-11-53-32.png" 
                alt="Matemática avançada"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 4 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Geração de código
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/yBX6M4P8/Screenshot-2026-07-18-11-54-13.png" 
                alt="Geração de código"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 5 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Conhecimento Geral
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/YF9bzd7P/Screenshot-2026-07-18-11-54-50.png" 
                alt="Conhecimento Geral"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 6 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Escrita Criativa
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/7djTdcBc/Screenshot-2026-07-18-11-55-30.png" 
                alt="Escrita Criativa"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 7 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Tradução Multi-idioma
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/LXZzdGyt/Screenshot-2026-07-18-11-58-04.png" 
                alt="Tradução Multi-idioma"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 8 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Segurança e Privacidade
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/F4PqW2HD/Screenshot-2026-07-18-11-58-42.png" 
                alt="Segurança e Privacidade"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 9 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Seguir Instruções
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/9mCGkp8h/Screenshot-2026-07-18-11-59-20.png" 
                alt="Seguir Instruções"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 10 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Contexto longo
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/1fC4NR0M/Screenshot-2026-07-18-12-12-01.png" 
                alt="Contexto longo"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 11 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Memória multi turno
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/sd0TL369/Screenshot-2026-07-18-12-12-43.png" 
                alt="Memória multi turno"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 12 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Lógica
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/PZC2347z/Screenshot-2026-07-18-12-13-17.png" 
                alt="Lógica"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />

          {/* Section 13 */}
          <section className="flex flex-col items-center">
            <h3 className="text-[22px] md:text-[26px] font-bold text-gray-900 text-center mb-6">
              Ética
            </h3>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm">
              <img 
                src="https://i.ibb.co/CsT5JwqT/Screenshot-2026-07-18-12-13-49.png" 
                alt="Ética"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
