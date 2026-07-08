import React from 'react';
import { Plus, FileText, Trash2, ChevronDown } from 'lucide-react';
import { WriterDocument } from '../../lib/writerService';

interface WriterDashboardProps {
  documents: WriterDocument[];
  onNewDocument: () => void;
  onOpenDocument: (doc: WriterDocument) => void;
  onDeleteDocument: (docId: string, e: React.MouseEvent) => void;
  onOpenMobileHistory?: () => void;
}

export default function WriterDashboard({
  documents,
  onNewDocument,
  onOpenDocument,
  onDeleteDocument,
  onOpenMobileHistory
}: WriterDashboardProps) {
  return (
    <div className="flex-1 bg-white flex flex-col font-sans overflow-y-auto">
      {/* Top Header / Action Bar - Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-transparent w-full relative z-40 border-b border-gray-100/50 shrink-0">
        <button onClick={onOpenMobileHistory} className="flex items-center gap-1.5 text-gray-800 text-[16px] font-normal active:opacity-70">
          <span className="text-[20px] font-light mr-1">‹</span>
          WSM Writer <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
        </button>
      </div>

      <div className="flex flex-col items-center py-8 md:py-20 px-4 sm:px-8">
        <div className="w-full max-w-4xl flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Área do Escritor</h1>
              <p className="text-gray-500 mt-2 text-sm md:text-base">Crie textos, redações e livros com a ajuda da IA como seu revisor e assistente criativo.</p>
            </div>
            <button
              onClick={onNewDocument}
              className="flex items-center justify-center w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Novo Documento
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-800">Documentos recentes</h2>
          
          {documents.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 border border-gray-200 rounded-2xl border-dashed">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum documento criado ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Clique em "Novo Documento" para começar a escrever.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  className="group relative bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all flex flex-col h-40"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <button
                      onClick={(e) => onDeleteDocument(doc.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-900 truncate mt-2">{doc.title}</h3>
                  <div className="mt-auto text-xs text-gray-400 font-medium flex items-center justify-between">
                    <span>Modificado:</span>
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}