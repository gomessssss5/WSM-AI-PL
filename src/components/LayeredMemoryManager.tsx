import React, { useState, useEffect } from 'react';
import { MemoryLayerItem, MemoryLayerType, MemoryNatureType, LayeredMemoryStore } from '../types';
import { 
  getLayeredMemories, 
  saveLayeredMemories, 
  addMemoryItem, 
  updateMemoryItem, 
  deleteMemoryItem, 
  LAYER_METADATA,
  NATURE_METADATA
} from '../utils/layeredMemory';
import { 
  Brain, 
  MessageSquare, 
  Sliders, 
  CheckCircle2, 
  Briefcase, 
  FileText, 
  GitCommit, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  ShieldCheck, 
  Layers, 
  Tag, 
  Sparkles,
  Info,
  UserCheck,
  Bot,
  FileSearch,
  HelpCircle,
  Check
} from 'lucide-react';

export const LayeredMemoryManager: React.FC = () => {
  const [memoryStore, setMemoryStore] = useState<LayeredMemoryStore>(getLayeredMemories);
  const [selectedLayer, setSelectedLayer] = useState<MemoryLayerType | 'all'>('all');
  const [selectedNature, setSelectedNature] = useState<MemoryNatureType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<MemoryLayerItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Memory Form State
  const [newMemory, setNewMemory] = useState<Partial<MemoryLayerItem>>({
    layer: 'confirmed_facts',
    nature: 'declared',
    title: '',
    content: '',
    origin: 'Inserção Manual do Usuário',
    confidence: 'high',
    confidenceScore: 0.95,
    ttlDays: 30,
    tags: []
  });

  const refreshStore = () => {
    setMemoryStore(getLayeredMemories());
  };

  const handleDelete = (layer: MemoryLayerType, id: string) => {
    if (confirm('Tem certeza que deseja apagar esta memória registrada?')) {
      deleteMemoryItem(layer, id);
      refreshStore();
    }
  };

  const handlePromoteToDeclared = (item: MemoryLayerItem) => {
    const updated: MemoryLayerItem = {
      ...item,
      nature: 'declared',
      confidence: 'high',
      confidenceScore: 1.0,
      origin: `Promovido de inferência pelo usuário (${new Date().toLocaleDateString('pt-BR')})`
    };
    updateMemoryItem(updated);
    refreshStore();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim() || !editingItem.content.trim()) return;

    updateMemoryItem(editingItem);
    setEditingItem(null);
    refreshStore();
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.title?.trim() || !newMemory.content?.trim() || !newMemory.layer) {
      alert('Preencha o Título, Conteúdo e Camada da memória.');
      return;
    }

    addMemoryItem({
      layer: newMemory.layer as MemoryLayerType,
      nature: newMemory.nature as MemoryNatureType || 'declared',
      title: newMemory.title!,
      content: newMemory.content!,
      origin: newMemory.origin || 'Inserção Manual',
      confidence: newMemory.confidence || 'high',
      confidenceScore: newMemory.confidenceScore || 0.9,
      ttlDays: newMemory.ttlDays,
      tags: newMemory.tags || []
    });

    setIsAddingNew(false);
    setNewMemory({
      layer: 'confirmed_facts',
      nature: 'declared',
      title: '',
      content: '',
      origin: 'Inserção Manual do Usuário',
      confidence: 'high',
      confidenceScore: 0.95,
      ttlDays: 30,
      tags: []
    });
    refreshStore();
  };

  const getLayerIcon = (layer: MemoryLayerType) => {
    switch (layer) {
      case 'conversation_context': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'user_preferences': return <Sliders className="w-4 h-4 text-purple-500" />;
      case 'confirmed_facts': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'projects': return <Briefcase className="w-4 h-4 text-amber-500" />;
      case 'related_files': return <FileText className="w-4 h-4 text-cyan-500" />;
      case 'decision_history': return <GitCommit className="w-4 h-4 text-rose-500" />;
    }
  };

  const getNatureIcon = (nature?: MemoryNatureType) => {
    switch (nature) {
      case 'declared': return <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'inferred': return <Bot className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'retrieved': return <FileSearch className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      default: return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  // Extract all memories into flat array for filtering
  const allMemories: MemoryLayerItem[] = Object.keys(memoryStore).flatMap((key) => {
    return memoryStore[key as MemoryLayerType] || [];
  });

  const filteredMemories = allMemories.filter((mem) => {
    const matchesLayer = selectedLayer === 'all' || mem.layer === selectedLayer;
    const matchesNature = selectedNature === 'all' || (mem.nature || 'declared') === selectedNature;
    const matchesQuery = mem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mem.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mem.origin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLayer && matchesNature && matchesQuery;
  });

  return (
    <div className="flex flex-col h-full bg-[#fbfaf8] dark:bg-[#121212] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-6 border-b border-[#eae6e1] dark:border-[#242424] bg-white dark:bg-[#161616] shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Memória em Camadas & 3 Naturezas Epistêmicas
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Separação explícita entre memória <strong>Declarada</strong> (usuário), <strong>Inferida</strong> (agente com TTL) e <strong>Recuperada</strong> (arquivos).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Registrar Nova Memória
          </button>
        </div>

        {/* Nature Filters (3 Epistemic Natures) */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Natureza:</span>
          <button
            type="button"
            onClick={() => setSelectedNature('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedNature === 'all'
                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            Todas as Naturezas
          </button>
          {Object.entries(NATURE_METADATA).map(([natureKey, meta]) => {
            const isSelected = selectedNature === natureKey;
            const count = allMemories.filter(m => (m.nature || 'declared') === natureKey).length;
            return (
              <button
                key={natureKey}
                type="button"
                onClick={() => setSelectedNature(natureKey as MemoryNatureType)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                {getNatureIcon(natureKey as MemoryNatureType)}
                <span>{meta.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedLayer('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
              selectedLayer === 'all'
                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            Todas as Camadas ({allMemories.length})
          </button>

          {Object.entries(LAYER_METADATA).map(([layerKey, meta]) => {
            const count = memoryStore[layerKey as MemoryLayerType]?.length || 0;
            const isSelected = selectedLayer === layerKey;
            return (
              <button
                key={layerKey}
                type="button"
                onClick={() => setSelectedLayer(layerKey as MemoryLayerType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                {getLayerIcon(layerKey as MemoryLayerType)}
                <span>{meta.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Search Bar & Stats */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em todas as memórias..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#181818] text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Memória com retenção diferenciada e proveniência estrita</span>
          </div>
        </div>

        {/* Add New Memory Modal/Panel */}
        {isAddingNew && (
          <div className="bg-white dark:bg-[#181818] p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Registrar Nova Memória
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleAddNew} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Camada *</label>
                  <select
                    value={newMemory.layer}
                    onChange={(e: any) => setNewMemory({ ...newMemory, layer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100"
                  >
                    {Object.entries(LAYER_METADATA).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Natureza do Conhecimento *</label>
                  <select
                    value={newMemory.nature}
                    onChange={(e: any) => setNewMemory({ ...newMemory, nature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100"
                  >
                    <option value="declared">👤 Declarada pelo Usuário (Permanente)</option>
                    <option value="inferred">🤖 Inferida pelo Agente (TTL ativo)</option>
                    <option value="retrieved">📄 Recuperada de Arquivo (Sincronizada)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nível de Confiança</label>
                  <select
                    value={newMemory.confidence}
                    onChange={(e: any) => {
                      const conf = e.target.value;
                      const score = conf === 'high' ? 1.0 : conf === 'medium' ? 0.75 : 0.45;
                      setNewMemory({ ...newMemory, confidence: conf, confidenceScore: score });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100"
                  >
                    <option value="high">Alta (90-100%) - Fato Validado</option>
                    <option value="medium">Média (60-89%) - Premissa</option>
                    <option value="low">Baixa (&lt;60%) - Hipótese</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Título do Fato / Decisão *</label>
                <input
                  type="text"
                  required
                  value={newMemory.title}
                  onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                  placeholder="ex: Moeda padrão e formato contábil"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Conteúdo Detalhado *</label>
                <textarea
                  rows={3}
                  required
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  placeholder="Descreva o fato, preferência ou decisão que o agente deve manter..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Origem da Informação</label>
                <input
                  type="text"
                  value={newMemory.origin}
                  onChange={(e) => setNewMemory({ ...newMemory, origin: e.target.value })}
                  placeholder="ex: Inserção manual, Conversa #3, Arquivo /src/db.ts..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Salvar na Memória
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-[#181818] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-lg w-full space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Editar Memória ({LAYER_METADATA[editingItem.layer]?.name})
              </h3>

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Título</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Natureza</label>
                  <select
                    value={editingItem.nature || 'declared'}
                    onChange={(e: any) => setEditingItem({ ...editingItem, nature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100"
                  >
                    <option value="declared">👤 Declarada pelo Usuário</option>
                    <option value="inferred">🤖 Inferida pelo Agente</option>
                    <option value="retrieved">📄 Recuperada de Arquivo</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Conteúdo</label>
                  <textarea
                    rows={4}
                    required
                    value={editingItem.content}
                    onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Origem</label>
                  <input
                    type="text"
                    value={editingItem.origin}
                    onChange={(e) => setEditingItem({ ...editingItem, origin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Memories Grid / List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-gray-400">
              Nenhum registro de memória encontrado com os filtros atuais.
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const meta = LAYER_METADATA[mem.layer];
              const natureMeta = NATURE_METADATA[mem.nature || 'declared'];
              const dateStr = new Date(mem.updatedAt || mem.createdAt).toLocaleDateString('pt-BR');

              return (
                <div
                  key={mem.id}
                  className={`p-4 rounded-2xl border bg-white dark:bg-[#181818] space-y-3 shadow-xs hover:border-gray-300 transition-all ${
                    mem.isStale 
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20' 
                      : 'border-[#eae6e1] dark:border-[#282828]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getLayerIcon(mem.layer)}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {meta.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Nature Badge */}
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 ${
                        mem.nature === 'declared'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : mem.nature === 'inferred'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                      }`}>
                        {getNatureIcon(mem.nature)}
                        {natureMeta?.name || 'Declarada'}
                      </span>

                      {mem.isStale && (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Antigo (&gt;7d)
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                        mem.confidence === 'high' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : mem.confidence === 'medium'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400'
                      }`}>
                        {mem.confidence === 'high' ? 'Alta Confiança' : mem.confidence === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {mem.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">
                      {mem.content}
                    </p>
                  </div>

                  {/* Promote Hypothesis to Declared Button for Inferred Items */}
                  {mem.nature === 'inferred' && (
                    <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-[10.5px]">
                      <span className="text-amber-800 dark:text-amber-300">
                        Hipótese inferida pelo agente. Validar como fato irrevogável?
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePromoteToDeclared(mem)}
                        className="px-2 py-0.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Check className="w-3 h-3" /> Validar Fato
                      </button>
                    </div>
                  )}

                  {/* Metadata Footer */}
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[10.5px] text-gray-400 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span>Origem: <strong className="text-gray-600 dark:text-gray-300">{mem.origin}</strong></span>
                      <span>Data: {dateStr}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(mem)}
                        title="Editar Memória"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(mem.layer, mem.id)}
                        title="Apagar Memória"
                        className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

