import React, { useState } from 'react';
import { ChevronDown, ArrowLeft, Scale, AlertTriangle, Target } from 'lucide-react';

interface BenchmarkCategory {
  title: string;
  image1: string;
  image2: string | null;
  image3?: string | null;
}

function ComparisonArrow({ 
  leftText, 
  rightText, 
  centerText, 
  color = 'green', 
  bubblePosition = 'right',
  tag
}: { 
  leftText: string; 
  rightText: string; 
  centerText?: string; 
  color?: 'green' | 'red' | 'gray'; 
  bubblePosition?: 'left' | 'right' | 'center' | 'none'; 
  tag?: string;
}) {
  const isGreen = color === 'green';
  const isRed = color === 'red';
  const isGray = color === 'gray';

  let barFillClass = 'bg-green-500';
  if (isRed) barFillClass = 'bg-red-500';
  if (isGray) barFillClass = 'bg-gray-400';

  let textLeftClass = 'text-gray-700 font-medium';
  let textRightClass = 'text-gray-700 font-medium';

  if (isGray) {
    textLeftClass = 'text-gray-500 font-semibold';
    textRightClass = 'text-gray-500 font-semibold';
  } else {
    if (bubblePosition === 'left') {
      textLeftClass = isGreen ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
    } else if (bubblePosition === 'right') {
      textRightClass = isGreen ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
    }
  }
  
  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-1.5 my-3 px-4">
      {tag && (
        <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400 bg-gray-100/80 px-2.5 py-0.5 rounded-full mb-0.5">
          {tag}
        </span>
      )}
      {centerText && (
        <span className={`text-[13px] font-bold ${
          isGreen ? 'text-green-600' : isRed ? 'text-red-500' : 'text-gray-500'
        } bg-white px-2 py-0.5 rounded-md shadow-xs border border-gray-100`}>
          {centerText}
        </span>
      )}
      <div className="w-full flex items-center justify-between gap-4">
        <span className={`text-[15px] md:text-lg ${textLeftClass} min-w-[90px] text-right`}>{leftText}</span>
        
        {/* The Arrow line */}
        <div className="flex-1 h-3 bg-gray-200/70 rounded-full relative flex items-center">
          <div className={`absolute inset-0 ${barFillClass} opacity-20 rounded-full`}></div>
          <div className={`absolute h-1.5 ${barFillClass} rounded-full left-2 right-2`}></div>
          
          {/* Arrowhead or bubble */}
          {bubblePosition !== 'none' && (
            <div className={`absolute ${
              bubblePosition === 'right' 
                ? 'right-0 translate-x-1/2' 
                : bubblePosition === 'left'
                  ? 'left-0 -translate-x-1/2'
                  : 'left-1/2 -translate-x-1/2'
            } flex items-center justify-center`}>
              <div className={`w-6 h-6 ${barFillClass} rounded-full flex items-center justify-center shadow-md border-2 border-white ${isGray ? '' : 'animate-pulse'}`}>
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>
            </div>
          )}
        </div>
        
        <span className={`text-[15px] md:text-lg ${textRightClass} min-w-[90px] text-left`}>{rightText}</span>
      </div>
    </div>
  );
}

const categories: BenchmarkCategory[] = [
  {
    title: 'Classificação geral das IAs',
    image1: 'https://i.ibb.co/fGNKXQBn/Screenshot-2026-07-18-11-46-19.png',
    image2: 'https://i.ibb.co/TqhWf7vF/a2b7964e-a1f4-4110-89d1-47505a389e0a.png',
    image3: 'https://i.ibb.co/tpgVY10r/b387809f-6c03-4b39-9949-e1bda4d7781d.png'
  },
  {
    title: 'Raciocínio geral',
    image1: 'https://i.ibb.co/zVCxncVT/Screenshot-2026-07-18-11-48-33.png',
    image2: 'https://i.ibb.co/JjN99QmQ/c77b1e07-418d-4144-acfa-410121c9d745.png',
    image3: 'https://i.ibb.co/0RQJxy2c/18de38e9-1e7a-4beb-84a9-caef3ca70a88.png'
  },
  {
    title: 'Matemática avançada',
    image1: 'https://i.ibb.co/4gDh0JdQ/Screenshot-2026-07-18-11-53-32.png',
    image2: 'https://i.ibb.co/hxNgLcvR/c33f1f46-3bd4-40c0-aa75-b7958d76f9cd.png',
    image3: 'https://i.ibb.co/s9CPTDnM/0bbbd29f-7ed7-48aa-b019-e943ea7c0883.png'
  },
  {
    title: 'Geração de código',
    image1: 'https://i.ibb.co/yBX6M4P8/Screenshot-2026-07-18-11-54-13.png',
    image2: 'https://i.ibb.co/VW2Kf1SQ/e47bd258-b181-4502-bd01-7758898f1b63.png',
    image3: 'https://i.ibb.co/bRvt6YLG/b1c939fb-4b51-4e40-81d0-3c75f8acdcb6.png'
  },
  {
    title: 'Conhecimento Geral',
    image1: 'https://i.ibb.co/YF9bzd7P/Screenshot-2026-07-18-11-54-50.png',
    image2: 'https://i.ibb.co/p6G4wkYy/d37e85d2-0746-447e-8ca9-1f8327adc735.png',
    image3: 'https://i.ibb.co/mCxm2Nvg/4cbd1eb2-3c92-4a75-8753-efbef692785a.png'
  },
  {
    title: 'Escrita Criativa',
    image1: 'https://i.ibb.co/7djTdcBc/Screenshot-2026-07-18-11-55-30.png',
    image2: 'https://i.ibb.co/C3QSyYdC/e7b27df6-e6cc-4d9b-b4e7-63a061f884e4.png',
    image3: 'https://i.ibb.co/MD27F9VQ/84633c36-3c60-4a54-8c3d-22fb2e522f56.png'
  },
  {
    title: 'Tradução Multi-idioma',
    image1: 'https://i.ibb.co/LXZzdGyt/Screenshot-2026-07-18-11-58-04.png',
    image2: 'https://i.ibb.co/DPF72vnK/25bdc481-8241-4c98-9998-128399666afc.png',
    image3: 'https://i.ibb.co/DHgWMK1N/95d3e0c7-b670-491e-961c-2581615069a7.png'
  },
  {
    title: 'Segurança e Privacidade',
    image1: 'https://i.ibb.co/F4PqW2HD/Screenshot-2026-07-18-11-58-42.png',
    image2: 'https://i.ibb.co/dwmjz6ZZ/03fa9960-8ce9-43b6-8851-dce3c9ae9e80.png',
    image3: 'https://i.ibb.co/7tj8SD5X/98976e04-01d6-479b-94d4-4ba99c17740e.png'
  },
  {
    title: 'Seguir Instruções',
    image1: 'https://i.ibb.co/9mCGkp8h/Screenshot-2026-07-18-11-59-20.png',
    image2: 'https://i.ibb.co/Qjd5RZyG/ca78162e-cc6f-4cc0-a6f9-fdc2336ed808.png',
    image3: 'https://i.ibb.co/99Q5P95L/0c10aac5-9c73-494b-bcce-3a7384f89345.png'
  },
  {
    title: 'Contexto longo',
    image1: 'https://i.ibb.co/1fC4NR0M/Screenshot-2026-07-18-12-12-01.png',
    image2: 'https://i.ibb.co/0yRKRXgq/f1fac9b4-258d-436c-af3b-f44c04cba9e7.png',
    image3: 'https://i.ibb.co/yFcMdLs6/4bb9c356-fc6d-4d7f-b104-eaa8da853f3d.png'
  },
  {
    title: 'Memória multi turno',
    image1: 'https://i.ibb.co/sd0TL369/Screenshot-2026-07-18-12-12-43.png',
    image2: 'https://i.ibb.co/N6gTrxMZ/77efdf9b-0281-4eab-9b6e-17498088fc4f.png',
    image3: 'https://i.ibb.co/r2TqFG8v/921b5f1c-9e72-4a12-88db-8abeb22eac18.png'
  },
  {
    title: 'Lógica',
    image1: 'https://i.ibb.co/PZC2347z/Screenshot-2026-07-18-12-13-17.png',
    image2: 'https://i.ibb.co/HTzK8fWN/a94ea978-7bdc-46a2-9a84-69967e589d10.png',
    image3: 'https://i.ibb.co/C538Cwys/4dea1601-ba2b-43b4-a018-66c608492367.png'
  },
  {
    title: 'Ética',
    image1: 'https://i.ibb.co/CsT5JwqT/Screenshot-2026-07-18-12-13-49.png',
    image2: 'https://i.ibb.co/nNXCCnLN/6cfec9a7-e258-4e4a-98b3-d89cbf8f3e46.png',
    image3: 'https://i.ibb.co/XrzTMpw3/41a8cc3a-5bc4-479e-8142-6322b752314d.png'
  }
];

export default function BenchmarkPage() {
  const [selectedBenchmark, setSelectedBenchmark] = useState('Benchmark 03');
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
      <main className={`flex-1 w-full ${selectedBenchmark !== 'Benchmark 01' ? 'max-w-7xl xl:max-w-[1400px]' : 'max-w-4xl'} mx-auto px-5 py-10 md:py-16 flex flex-col items-center transition-all duration-300`}>
        <h2 className="text-[28px] md:text-4xl font-bold tracking-tight text-gray-900 text-center mb-8">
          Desempenho WSM 1.6 Pro
        </h2>

        {/* Benchmark Selector */}
        <div className="flex flex-col items-center gap-2.5 mb-12">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-5 py-3 bg-white border border-[#eae6e1] hover:border-gray-300 hover:shadow-md rounded-2xl text-[15px] font-semibold text-gray-800 shadow-sm transition-all duration-200 active:scale-[0.98]"
            >
              <span>{selectedBenchmark}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white border border-[#eae6e1] rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in slide-in-from-top-2 duration-200">
                  <button
                    className="w-full text-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-[#f8f7f5] font-semibold transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedBenchmark('Benchmark 01');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Benchmark 01
                  </button>
                  <button
                    className="w-full text-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-[#f8f7f5] font-semibold transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedBenchmark('Benchmark 02');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Benchmark 02
                  </button>
                  <button
                    className="w-full text-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-[#f8f7f5] font-semibold transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedBenchmark('Benchmark 03');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Benchmark 03
                  </button>
                </div>
              </>
            )}
          </div>
          <span className="text-[14px] text-gray-500 font-medium animate-in fade-in duration-300">
            {selectedBenchmark === 'Benchmark 01' 
              ? '18 de Julho de 2026' 
              : selectedBenchmark === 'Benchmark 02' 
                ? '19 de Julho de 2026' 
                : '20 de Julho de 2026'}
          </span>
        </div>

        {/* Benchmark Sections */}
        <div className="w-full flex flex-col gap-12">
          {categories.map((category, index) => {
            const isFirst = index === 0;

            if (selectedBenchmark === 'Benchmark 01') {
              return (
                <React.Fragment key={category.title}>
                  {!isFirst && <div className="w-full h-px bg-[#eae6e1] mx-auto max-w-3xl" />}
                  <section className="flex flex-col items-center animate-in fade-in duration-300">
                    <h3 className="text-[20px] md:text-[24px] font-bold text-gray-900 text-center mb-5">
                      {category.title}
                    </h3>
                    <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm bg-white">
                      <img 
                        src={category.image1} 
                        alt={category.title}
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </section>
                </React.Fragment>
              );
            }

            if (selectedBenchmark === 'Benchmark 02') {
              return (
                <React.Fragment key={category.title}>
                  {!isFirst && <div className="w-full h-px bg-[#eae6e1] mx-auto" />}
                  <section className="w-full flex flex-col items-center animate-in fade-in duration-300">
                    <h3 className="text-[20px] md:text-[24px] font-bold text-gray-900 text-center mb-6">
                      {category.title}
                    </h3>
                    
                    {/* Grid split layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                      {/* Left side: Benchmark 01 */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-xs font-bold text-gray-400 tracking-wider uppercase bg-gray-100 px-3 py-1 rounded-full">
                          Benchmark 01 (18/07)
                        </div>
                        <div className="w-full rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm bg-white hover:shadow-md transition-all">
                          <img 
                            src={category.image1} 
                            alt={`${category.title} - Benchmark 01`}
                            className="w-full h-auto object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      {/* Right side: Benchmark 02 */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 px-3 py-1 rounded-full">
                          Benchmark 02 (19/07)
                        </div>
                        {category.image2 ? (
                          <div className="w-full rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm bg-white hover:shadow-md transition-all">
                            <img 
                              src={category.image2} 
                              alt={`${category.title} - Benchmark 02`}
                              className="w-full h-auto object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-white border border-[#eae6e1] rounded-2xl shadow-inner text-gray-400 select-none">
                            <Scale className="w-8 h-8 text-gray-300 mb-3 animate-pulse" />
                            <span className="text-[14px] font-bold text-gray-700 mb-1">Sem Alterações</span>
                            <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                              O desempenho nesta categoria permanece consistente com os resultados de 18 de Julho.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {index === 0 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="85.5"
                          rightText="88.8"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                      </div>
                    )}

                    {index === 1 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="81"
                          rightText="88"
                          centerText="+ 8,64%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="7ª posição"
                          rightText="6ª posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 2 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="85"
                          rightText="89"
                          centerText="+ 4,71%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="7ª Posição"
                          rightText="6ª Posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 3 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="86"
                          rightText="90"
                          centerText="+ 4,65%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="6ª Posição"
                          rightText="8ª posição"
                          color="red"
                          bubblePosition="left"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 4 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="83"
                          rightText="87"
                          centerText="+ 4,82%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="8ª posição"
                          rightText="7ª posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 5 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="84"
                          rightText="88"
                          centerText="+ 4,76%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="5ª posição"
                          rightText="5ª posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 6 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="87"
                          rightText="87"
                          centerText="0,00%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="5ª posição"
                          rightText="7ª posição"
                          color="red"
                          bubblePosition="left"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 7 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="92"
                          rightText="93"
                          centerText="+ 1,09%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="4ª posição"
                          rightText="5ª posição"
                          color="red"
                          bubblePosition="left"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 8 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="88"
                          rightText="90"
                          centerText="+ 2,27%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="4ª posição"
                          rightText="5ª posição"
                          color="red"
                          bubblePosition="left"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 9 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="82"
                          rightText="85"
                          centerText="+ 3,66%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="7ª posição"
                          rightText="9ª posição"
                          color="red"
                          bubblePosition="left"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 10 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="89"
                          rightText="92"
                          centerText="+ 3,37%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="3ª posição"
                          rightText="2ª posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 11 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="84"
                          rightText="88"
                          centerText="+ 4,76%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="4ª posição"
                          rightText="4ª posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 12 && (
                      <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                        <ComparisonArrow
                          leftText="85"
                          rightText="89"
                          centerText="+ 4,71%"
                          color="green"
                          bubblePosition="right"
                          tag="Pontuação"
                        />
                        <ComparisonArrow
                          leftText="4ª posição"
                          rightText="4ª posição"
                          color="green"
                          bubblePosition="right"
                          tag="Posição"
                        />
                      </div>
                    )}

                    {index === 0 && (
                      <div className="mt-8 w-full max-w-4xl bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 flex gap-4 items-start text-left shadow-xs">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <h4 className="text-amber-900 font-bold text-[15px] md:text-[16px]">Atenção aos Resultados</h4>
                          <p className="text-amber-800 text-[13px] md:text-[14px] leading-relaxed font-medium">
                            Do benchmark 01 para o 02, foram retirados os modelos mais antigos e adicionado modelos mais novos e recentes. por isso, o gráfico de 9 modelos passou a ter 12 modelos. então, é normal que alguns modelos (incluindo o WSM 1.6 Pro) mudem de posição, não significa que o modelo de IA ficou "menos inteligente".
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                </React.Fragment>
              );
            }

            // Benchmark 03 Comparison Layout
            return (
              <React.Fragment key={category.title}>
                {!isFirst && <div className="w-full h-px bg-[#eae6e1] mx-auto" />}
                <section className="w-full flex flex-col items-center animate-in fade-in duration-300">
                  <h3 className="text-[20px] md:text-[24px] font-bold text-gray-900 text-center mb-6">
                    {category.title}
                  </h3>
                  
                  {/* Grid split layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    {/* Left side: Benchmark 02 */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-xs font-bold text-gray-400 tracking-wider uppercase bg-gray-100 px-3 py-1 rounded-full">
                        Benchmark 02 (19/07)
                      </div>
                      {category.image2 ? (
                        <div className="w-full rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm bg-white hover:shadow-md transition-all">
                          <img 
                            src={category.image2} 
                            alt={`${category.title} - Benchmark 02`}
                            className="w-full h-auto object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-white border border-[#eae6e1] rounded-2xl shadow-inner text-gray-400 select-none">
                          <Scale className="w-8 h-8 text-gray-300 mb-3 animate-pulse" />
                          <span className="text-[14px] font-bold text-gray-700 mb-1">Sem Alterações</span>
                          <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                            O desempenho nesta categoria permanece consistente com os resultados de 18 de Julho.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right side: Benchmark 03 */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 px-3 py-1 rounded-full">
                        Benchmark 03 (20/07)
                      </div>
                      {category.image3 ? (
                        <div className="w-full rounded-2xl overflow-hidden border border-[#eae6e1] shadow-sm bg-white hover:shadow-md transition-all">
                          <img 
                            src={category.image3} 
                            alt={`${category.title} - Benchmark 03`}
                            className="w-full h-auto object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-indigo-50/25 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl shadow-inner text-indigo-400 select-none">
                          <Scale className="w-8 h-8 text-indigo-300 mb-3 animate-pulse" />
                          <span className="text-[14px] font-bold text-indigo-700 mb-1">Desempenho Consolidado</span>
                          <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                            O desempenho nesta categoria permanece estável e consolidado com as otimizações do dia 19 de Julho.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {index === 0 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="88.8"
                        rightText="89.9"
                        centerText="+ 1,24%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação Geral"
                      />
                      <ComparisonArrow
                        leftText="5ª posição"
                        rightText="5ª posição"
                        color="gray"
                        bubblePosition="center"
                        tag="Posição Geral"
                      />
                    </div>
                  )}

                  {index === 1 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="88"
                        rightText="89"
                        centerText="+ 1,14%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="6ª posição"
                        rightText="6ª posição"
                        color="gray"
                        bubblePosition="center"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 2 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="89"
                        rightText="90"
                        centerText="+ 1,12%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="6ª Posição"
                        rightText="5ª Posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 3 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="90"
                        rightText="89"
                        centerText="- 1,11%"
                        color="red"
                        bubblePosition="left"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="8ª posição"
                        rightText="8ª posição"
                        color="gray"
                        bubblePosition="center"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 4 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="87"
                        rightText="88"
                        centerText="+ 1,15%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="7ª posição"
                        rightText="6ª posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 5 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="88"
                        rightText="89"
                        centerText="+ 1,14%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="5ª posição"
                        rightText="5ª posição"
                        color="gray"
                        bubblePosition="center"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 6 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="87"
                        rightText="90"
                        centerText="+ 3,45%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="7ª posição"
                        rightText="4ª posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 7 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="93"
                        rightText="94"
                        centerText="+ 1,08%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="5ª posição"
                        rightText="4ª posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 8 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="90"
                        rightText="90"
                        centerText="0,00%"
                        color="gray"
                        bubblePosition="center"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="5ª posição"
                        rightText="5ª posição"
                        color="gray"
                        bubblePosition="center"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 9 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="85"
                        rightText="87"
                        centerText="+ 2,35%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="9ª posição"
                        rightText="9ª posição"
                        color="gray"
                        bubblePosition="center"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 10 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="92"
                        rightText="93"
                        centerText="+ 1,09%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="2ª posição"
                        rightText="1ª posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 11 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="88"
                        rightText="89"
                        centerText="+ 1,14%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="4ª posição"
                        rightText="3ª posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 12 && (
                    <div className="mt-8 w-full max-w-4xl flex flex-col items-center gap-3">
                      <ComparisonArrow
                        leftText="89"
                        rightText="91"
                        centerText="+ 2,25%"
                        color="green"
                        bubblePosition="right"
                        tag="Pontuação"
                      />
                      <ComparisonArrow
                        leftText="4ª posição"
                        rightText="3ª posição"
                        color="green"
                        bubblePosition="right"
                        tag="Posição"
                      />
                    </div>
                  )}

                  {index === 0 && (
                    <div className="mt-8 w-full max-w-4xl bg-indigo-50/60 border border-indigo-150 rounded-2xl p-5 md:p-6 flex gap-4 items-start text-left shadow-xs">
                      <div className="p-2 bg-indigo-100 rounded-xl text-indigo-800 shrink-0 mt-0.5">
                        <Scale className="w-5 h-5 text-indigo-600 animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h4 className="text-indigo-900 font-bold text-[15px] md:text-[16px]">Estabilidade e Consolidação</h4>
                        <p className="text-indigo-800 text-[13px] md:text-[14px] leading-relaxed font-medium">
                          No Benchmark 03 (20 de Julho de 2026), observamos a consolidação dos ajustes introduzidos no dia anterior. Com um refinamento contínuo nas diretivas de raciocínio lógico (estilo o1) e alocação de memória, o WSM 1.6 Pro atinge novos picos de pontuação em raciocínio, lógica e matemática avançada, garantindo posições ainda mais elevadas no ranking global de IAs de alta performance.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </React.Fragment>
            );
          })}
        </div>
      </main>
    </div>
  );
}
