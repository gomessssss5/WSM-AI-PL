import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, ArrowLeft, X } from 'lucide-react';

interface EvaluationData {
  msgId: string;
  rating: 'up' | 'down';
  conversation: any[];
  timestamp: string;
}

export default function EvaluationDashboard({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<EvaluationData[]>([]);
  const [selectedEval, setSelectedEval] = useState<EvaluationData | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      setData(stored.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch {}
  }, []);

  const upCount = data.filter(d => d.rating === 'up').length;
  const downCount = data.filter(d => d.rating === 'down').length;

  return (
    <div className="fixed inset-0 bg-[#fcfbfa] z-50 overflow-hidden flex flex-col font-sans">
      <div className="border-b border-[#eae6e1] bg-white p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Dashboard de Avaliações</h1>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
            <ThumbsUp size={16} />
            <span className="font-semibold">{upCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-200">
            <ThumbsDown size={16} />
            <span className="font-semibold">{downCount}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item) => (
            <div 
              key={item.msgId} 
              onClick={() => setSelectedEval(item)}
              className="bg-white border border-[#eae6e1] rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                {item.rating === 'up' ? (
                  <ThumbsUp size={18} className="text-green-500" />
                ) : (
                  <ThumbsDown size={18} className="text-red-500" />
                )}
              </div>
              <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                {item.conversation[item.conversation.length - 1]?.text || "(Sem texto)"}
              </p>
              <div className="mt-auto pt-3 border-t border-gray-100 text-xs text-gray-400 font-medium">
                {item.conversation.length} mensagens no contexto
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400">
              <p>Nenhuma avaliação recebida ainda.</p>
            </div>
          )}
        </div>
      </div>

      {selectedEval && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#eae6e1] bg-gray-50 rounded-t-2xl">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                Contexto da Avaliação
                {selectedEval.rating === 'up' ? (
                  <span className="bg-green-100 text-green-700 p-1 rounded"><ThumbsUp size={14} /></span>
                ) : (
                  <span className="bg-red-100 text-red-700 p-1 rounded"><ThumbsDown size={14} /></span>
                )}
              </h2>
              <button onClick={() => setSelectedEval(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedEval.conversation.map((msg, i) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-[13.5px] leading-relaxed ${isUser ? 'bg-[#f3f0ec] text-gray-800' : 'bg-white border border-[#eae6e1] text-gray-800'}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
