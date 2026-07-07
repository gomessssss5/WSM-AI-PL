import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, ArrowLeft, X, AlertTriangle, Star, Flag } from 'lucide-react';

interface EvaluationData {
  msgId: string;
  rating: 'up' | 'down';
  conversation: any[];
  timestamp: string;
  isReport?: boolean;
  reportText?: string;
  stars?: number;
  feedbackText?: string;
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

  const upCount = data.filter(d => !d.isReport && d.stars === undefined && d.rating === 'up').length;
  const downCount = data.filter(d => !d.isReport && d.stars === undefined && d.rating === 'down').length;
  const reportCount = data.filter(d => d.isReport).length;
  const starsCount = data.filter(d => d.stars !== undefined).length;

  return (
    <div className="fixed inset-0 bg-[#fcfbfa] z-50 overflow-hidden flex flex-col font-sans select-none">
      <div className="border-b border-[#eae6e1] bg-white p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Dashboard de Interações</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 text-xs font-semibold">
            <ThumbsUp size={14} />
            <span>Positivos: {upCount}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200 text-xs font-semibold">
            <ThumbsDown size={14} />
            <span>Negativos: {downCount}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-100/70 text-red-800 px-3 py-1 rounded-full border border-red-300 text-xs font-semibold">
            <Flag size={14} className="fill-red-500/10" />
            <span>Denúncias: {reportCount}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 text-xs font-semibold">
            <Star size={14} className="fill-amber-400" />
            <span>Avaliações: {starsCount}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item) => {
            let badgeStyle = "bg-gray-50 text-gray-600 border-gray-200";
            let badgeLabel = "Feedback";
            let badgeIcon = <ThumbsUp size={14} />;
            let summaryText = "";

            if (item.isReport) {
              badgeStyle = "bg-red-50 text-red-700 border-red-100";
              badgeLabel = "Denúncia de Resposta";
              badgeIcon = <Flag size={14} className="fill-red-500/10 text-red-500" />;
              summaryText = item.reportText || "";
            } else if (item.stars !== undefined) {
              badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
              badgeLabel = `${item.stars} Estrelas`;
              badgeIcon = <Star size={14} className="fill-amber-400 text-amber-500" />;
              summaryText = item.feedbackText || "(Sem comentário)";
            } else {
              if (item.rating === 'up') {
                badgeStyle = "bg-green-50 text-green-700 border-green-100";
                badgeLabel = "Feedback Positivo";
                badgeIcon = <ThumbsUp size={14} />;
              } else {
                badgeStyle = "bg-red-50 text-red-700 border-red-100";
                badgeLabel = "Feedback Negativo";
                badgeIcon = <ThumbsDown size={14} />;
              }
              summaryText = item.conversation[item.conversation.length - 1]?.text || "(Sem texto)";
            }

            return (
              <div 
                key={item.msgId} 
                onClick={() => setSelectedEval(item)}
                className="bg-white border border-[#eae6e1] rounded-2xl p-4.5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">{new Date(item.timestamp).toLocaleString()}</span>
                  <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${badgeStyle}`}>
                    {badgeIcon}
                    <span>{badgeLabel}</span>
                  </div>
                </div>
                
                <p className="text-[13px] text-gray-700 line-clamp-3 leading-relaxed font-sans">
                  {summaryText}
                </p>
                
                <div className="mt-auto pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-bold tracking-wide uppercase flex items-center justify-between">
                  <span>Contexto:</span>
                  <span>{item.conversation.length} {item.conversation.length === 1 ? 'mensagem' : 'mensagens'}</span>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <div className="col-span-full text-center py-24 text-gray-400 bg-white border border-[#eae6e1] rounded-2xl">
              <p className="text-sm font-medium">Nenhuma interação, avaliação ou denúncia recebida ainda.</p>
            </div>
          )}
        </div>
      </div>

      {selectedEval && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[#eae6e1] bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                {selectedEval.isReport ? (
                  <>
                    <span className="bg-red-100 text-red-700 p-1.5 rounded-xl"><Flag size={14} className="fill-red-500/10" /></span>
                    <span>Visualizar Denúncia</span>
                  </>
                ) : selectedEval.stars !== undefined ? (
                  <>
                    <span className="bg-amber-100 text-amber-700 p-1.5 rounded-xl"><Star size={14} className="fill-amber-400 text-amber-500" /></span>
                    <span>Avaliação ({selectedEval.stars} Estrelas)</span>
                  </>
                ) : (
                  <>
                    <span className={`p-1.5 rounded-xl ${selectedEval.rating === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedEval.rating === 'up' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                    </span>
                    <span>Detalhes do Feedback</span>
                  </>
                )}
              </h2>
              <button onClick={() => setSelectedEval(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
              {/* Report Text Banner */}
              {selectedEval.isReport && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-[13.5px] text-red-900 leading-relaxed">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-red-700 mb-1">Motivo da Denúncia:</span>
                  <p className="italic">"{selectedEval.reportText}"</p>
                </div>
              )}

              {/* Star Evaluation Feedback Banner */}
              {selectedEval.stars !== undefined && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[13.5px] text-amber-900 leading-relaxed">
                  <div className="flex items-center gap-1 text-amber-500 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={16} fill={star <= (selectedEval.stars || 0) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-700 mb-1">Comentários:</span>
                  <p className="italic">"{selectedEval.feedbackText || "(Nenhum comentário adicionado)"}"</p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-gray-400 block px-1">Histórico do Chat:</span>
                {selectedEval.conversation.map((msg, i) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${isUser ? 'bg-[#f3f0ec] text-gray-800' : 'bg-white border border-[#eae6e1] text-gray-800 shadow-3xs'}`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
