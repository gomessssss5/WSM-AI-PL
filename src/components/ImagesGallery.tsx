import React, { useState } from 'react';
import { Download, Sparkles, Image as ImageIcon, Eye, ArrowLeft } from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  prompt: string;
  category: string;
  primaryColor: string;
}

const mockImages: GalleryImage[] = [
  {
    id: 'img1',
    title: 'Metrópole Cibernética',
    prompt: 'Cidade futurista cyberpunk com arranha-céus flutuantes e luzes neon roxas',
    category: 'Cyberpunk',
    primaryColor: 'from-[#1e113a] to-[#3a1a68]',
  },
  {
    id: 'img2',
    title: 'Vale de Neon',
    prompt: 'Deserto alienígena com cristais luminescentes e céu estrelado de galáxia espiral',
    category: 'Ficção Científica',
    primaryColor: 'from-[#0e1d3e] to-[#124b6e]',
  },
  {
    id: 'img3',
    title: 'Santuário Flutuante',
    prompt: 'Templo zen minimalista flutuando entre nuvens douradas no pôr do sol',
    category: 'Surrealismo',
    primaryColor: 'from-[#422006] to-[#713f12]',
  },
  {
    id: 'img4',
    title: 'Arranha-céus de Vidro',
    prompt: 'Conceito arquitetônico moderno de vidro integrado à natureza com cascatas artificiais',
    category: 'Arquitetura',
    primaryColor: 'from-[#11242e] to-[#24434b]',
  },
  {
    id: 'img5',
    title: 'Cosmos Abstrato',
    prompt: 'Nebulosa multicolorida com partículas de poeira cósmica flutuando em 3D',
    category: 'Abstrato',
    primaryColor: 'from-[#310a31] to-[#6b0f6b]',
  },
  {
    id: 'img6',
    title: 'Robô Explorador',
    prompt: 'Robô humanoide explorando o fundo de um recife de coral alienígena bio-luminescente',
    category: 'Robótica',
    primaryColor: 'from-[#062024] to-[#115e59]',
  }
];

interface ImagesGalleryProps {
  onBackToHome: () => void;
}

export default function ImagesGallery({ onBackToHome }: ImagesGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfbfa] select-none dot-grid overflow-y-auto">
      
      {/* Top Header */}
      <header className="px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-[#eae6e1] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToHome}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#5c53e5]" />
              Galeria de Imagens WSM AI
            </span>
            <span className="text-[9px] text-gray-400 font-semibold block">Imagens geradas recentemente pelo modelo</span>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="text-[10px] font-bold text-[#5c53e5] bg-[#5c53e5]/5 hover:bg-[#5c53e5]/10 border border-[#5c53e5]/15 px-3 py-1 rounded-full transition-all cursor-pointer"
        >
          Nova conversa
        </button>
      </header>

      {/* Content */}
      <div className="p-5 max-w-4xl mx-auto w-full space-y-4">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center justify-center md:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-[#5c53e5] fill-[#5c53e5]/10" />
            Suas criações visuais
          </h2>
          <p className="text-xs text-gray-400">
            Explore as imagens conceituais projetadas pela inteligência artificial WSM 1.6.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockImages.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-2xs hover:shadow-md hover:border-gray-300 transition-all duration-200 group cursor-pointer flex flex-col"
              onClick={() => setSelectedImage(image)}
            >
              {/* Image Canvas Container */}
              <div className={`h-36 bg-gradient-to-tr ${image.primaryColor} relative overflow-hidden flex items-center justify-center`}>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:8px_8px]" />
                
                {/* Simulated complex vector illustration representation */}
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xxs group-hover:scale-105 transition-transform duration-200">
                  <ImageIcon className="w-4 h-4 text-white/60" />
                </div>

                {/* Badge Category */}
                <span className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md text-[8px] text-white font-bold px-1.5 py-0.5 rounded-full border border-white/5">
                  {image.category}
                </span>

                {/* Overlay Interaction elements */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                  <button className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/15 active:scale-95 cursor-pointer">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 bg-[#5c53e5] hover:bg-[#4b42cc] text-white rounded-full transition-all active:scale-95 cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text Info */}
              <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 tracking-tight group-hover:text-[#5c53e5] transition-colors">
                    {image.title}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                    "{image.prompt}"
                  </p>
                </div>
                <div className="text-[8px] font-mono text-gray-400 pt-1.5 border-t border-gray-50 flex justify-between items-center">
                  <span>Modelo: WSM 1.6</span>
                  <span>1K Resolution</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xxs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full border border-gray-100 shadow-2xl flex flex-col">
            <div className={`h-48 bg-gradient-to-tr ${selectedImage.primaryColor} relative flex items-center justify-center`}>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
              <ImageIcon className="w-12 h-12 text-white/25 animate-pulse" />
              
              <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[9px] text-white font-bold px-2 py-0.5 rounded-full">
                {selectedImage.category}
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">{selectedImage.title}</h3>
                <div className="mt-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">PROMPT DE GERAÇÃO</div>
                  <p className="text-[10px] text-gray-500 font-mono leading-relaxed">"{selectedImage.prompt}"</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="flex-1 py-1.5 bg-[#5c53e5] hover:bg-[#4b42cc] text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG (1K)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
