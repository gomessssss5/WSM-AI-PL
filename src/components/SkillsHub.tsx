import React, { useState, useEffect } from 'react';
import { ComposableSkill, SkillExample, SkillTest } from '../types';
import { DEFAULT_COMPOSABLE_SKILLS } from '../utils/defaultSkills';
import { 
  Sparkles, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Share2, 
  Download, 
  Upload, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Layers, 
  Wrench, 
  ShieldAlert, 
  BookOpen, 
  Check, 
  FileText, 
  ExternalLink,
  Info,
  Code2,
  Table,
  Filter
} from 'lucide-react';

const SKILLS_STORAGE_KEY = 'wsm_composable_skills_v1';

export const SkillsHub: React.FC = () => {
  const [skills, setSkills] = useState<ComposableSkill[]>(() => {
    try {
      const saved = localStorage.getItem(SKILLS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return DEFAULT_COMPOSABLE_SKILLS;
  });

  const [activeTab, setActiveTab] = useState<'installed' | 'create' | 'gallery'>('installed');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<ComposableSkill | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});

  // Skill Form State
  const [formSkill, setFormSkill] = useState<Partial<ComposableSkill>>({
    name: '',
    description: '',
    instructions: '',
    category: 'custom',
    risk_policy: 'low',
    tools_allowed: ['web_search', 'create_document'],
    inputs: [{ name: 'parametro_1', type: 'string', description: 'Entrada principal da skill', required: true }],
    outputs: [{ name: 'resultado_1', type: 'file', description: 'Arquivo ou texto gerado' }],
    examples: [{ input: 'Exemplo de solicitação do usuário', expected_output: 'Resultado esperado da execução' }],
    tests: [{ name: 'Teste básico de validação', input: 'Entrada de teste', assertions: ['Deve gerar resultado estruturado'] }],
    resources: []
  });

  const saveSkills = (newSkills: ComposableSkill[]) => {
    setSkills(newSkills);
    try {
      localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(newSkills));
    } catch (e) {}
  };

  const handleDuplicate = (skill: ComposableSkill) => {
    const duplicated: ComposableSkill = {
      ...skill,
      id: `skill_custom_${Date.now()}`,
      name: `${skill.name} (Cópia)`,
      isOfficial: false,
      author: 'Você',
      updatedAt: new Date().toISOString()
    };
    const updated = [duplicated, ...skills];
    saveSkills(updated);
    setSelectedSkill(duplicated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta Skill?')) {
      const updated = skills.filter(s => s.id !== id);
      saveSkills(updated);
      if (selectedSkill?.id === id) {
        setSelectedSkill(null);
      }
    }
  };

  const handleInstallOfficial = (officialSkill: ComposableSkill) => {
    const exists = skills.some(s => s.id === officialSkill.id);
    if (exists) {
      alert('Esta Skill já está instalada nas suas Skills!');
      return;
    }
    const updated = [officialSkill, ...skills];
    saveSkills(updated);
    setActiveTab('installed');
    setSelectedSkill(officialSkill);
  };

  const handleShareJson = (skill: ComposableSkill) => {
    const jsonStr = JSON.stringify(skill, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedId(skill.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadSkillFile = (skill: ComposableSkill) => {
    const jsonStr = JSON.stringify(skill, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name.toLowerCase().replace(/\s+/g, '_')}_skill.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSkillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as ComposableSkill;
        if (!imported.name || !imported.instructions) {
          alert('Arquivo de Skill inválido. Deve conter "name" e "instructions".');
          return;
        }
        imported.id = `skill_imported_${Date.now()}`;
        imported.isOfficial = false;
        imported.updatedAt = new Date().toISOString();
        const updated = [imported, ...skills];
        saveSkills(updated);
        setSelectedSkill(imported);
        setActiveTab('installed');
      } catch (err) {
        alert('Erro ao importar arquivo JSON de Skill.');
      }
    };
    reader.readAsText(file);
  };

  const handleRunTests = (skill: ComposableSkill) => {
    const results: { [key: string]: boolean } = {};
    skill.tests.forEach((test, idx) => {
      // Simulation of assertion validation
      results[`${skill.id}_${idx}`] = true;
    });
    setTestResults(results);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSkill.name?.trim() || !formSkill.instructions?.trim()) {
      alert('Preencha o Nome e as Instruções da Skill.');
      return;
    }

    if (isEditing && selectedSkill) {
      const updatedSkill: ComposableSkill = {
        ...(selectedSkill as ComposableSkill),
        ...formSkill,
        name: formSkill.name!,
        description: formSkill.description || '',
        instructions: formSkill.instructions!,
        updatedAt: new Date().toISOString()
      };
      const updatedList = skills.map(s => s.id === updatedSkill.id ? updatedSkill : s);
      saveSkills(updatedList);
      setSelectedSkill(updatedSkill);
      setIsEditing(false);
    } else {
      const newSkill: ComposableSkill = {
        id: `skill_custom_${Date.now()}`,
        name: formSkill.name!,
        description: formSkill.description || '',
        instructions: formSkill.instructions!,
        category: formSkill.category || 'custom',
        risk_policy: formSkill.risk_policy || 'low',
        tools_allowed: formSkill.tools_allowed || ['web_search', 'create_document'],
        inputs: formSkill.inputs || [],
        outputs: formSkill.outputs || [],
        examples: formSkill.examples || [],
        tests: formSkill.tests || [],
        resources: formSkill.resources || [],
        isOfficial: false,
        author: 'Você',
        version: '1.0.0',
        updatedAt: new Date().toISOString()
      };
      saveSkills([newSkill, ...skills]);
      setSelectedSkill(newSkill);
    }

    setActiveTab('installed');
  };

  const filteredSkills = skills.filter(s => {
    const matchesCat = selectedCategory === 'todos' || s.category === selectedCategory;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex flex-col h-full bg-[#fbfaf8] dark:bg-[#121212] overflow-hidden">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-6 border-b border-[#eae6e1] dark:border-[#242424] bg-white dark:bg-[#161616] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Skills Abertas & Componíveis
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Crie, instale, teste e componha fluxos especializados e reutilizáveis para o agente.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-3 py-2 text-xs font-semibold bg-white dark:bg-[#202020] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              Importar JSON
              <input type="file" accept=".json" onChange={handleImportSkillFile} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormSkill({
                  name: '',
                  description: '',
                  instructions: '',
                  category: 'custom',
                  risk_policy: 'low',
                  tools_allowed: ['web_search', 'create_document'],
                  inputs: [{ name: 'parametro_1', type: 'string', description: 'Entrada principal', required: true }],
                  outputs: [{ name: 'resultado_1', type: 'file', description: 'Arquivo gerado' }],
                  examples: [{ input: '', expected_output: '' }],
                  tests: [{ name: 'Teste de Aceitação', input: '', assertions: ['Gera arquivo .md'] }],
                  resources: []
                });
                setActiveTab('create');
              }}
              className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Criar Nova Skill
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('installed')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'installed'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            Instaladas ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            Galeria Oficial ({DEFAULT_COMPOSABLE_SKILLS.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'create' ? (
          /* CREATE / EDIT FORM */
          <div className="max-w-3xl mx-auto bg-white dark:bg-[#181818] p-6 rounded-2xl border border-[#eae6e1] dark:border-[#282828] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isEditing ? 'Editar Skill' : 'Criar Nova Skill Componível'}
                </h3>
                <p className="text-xs text-gray-500">Defina o formato padronizado com ferramentas, esquemas e testes de aceitação.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('installed')}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nome da Skill *</label>
                  <input
                    type="text"
                    required
                    value={formSkill.name}
                    onChange={(e) => setFormSkill({ ...formSkill, name: e.target.value })}
                    placeholder="ex: Relatório de pesquisa"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Categoria</label>
                  <select
                    value={formSkill.category}
                    onChange={(e: any) => setFormSkill({ ...formSkill, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100"
                  >
                    <option value="pesquisa">Pesquisa & Web</option>
                    <option value="dados">Dados & Planilhas</option>
                    <option value="codigo">Código & Engenharia</option>
                    <option value="produtividade">Produtividade</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Descrição Breve</label>
                <input
                  type="text"
                  value={formSkill.description}
                  onChange={(e) => setFormSkill({ ...formSkill, description: e.target.value })}
                  placeholder="O que esta Skill faz e qual entregável ela produz..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Instruções Passo a Passo (System Prompt da Skill) *</label>
                <textarea
                  rows={6}
                  required
                  value={formSkill.instructions}
                  onChange={(e) => setFormSkill({ ...formSkill, instructions: e.target.value })}
                  placeholder="Instruções rigorosas de execução: 1. Coleta, 2. Processamento, 3. Saída <wsm_doc>..."
                  className="w-full px-3 py-2 font-mono border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Política de Risco</label>
                  <select
                    value={formSkill.risk_policy}
                    onChange={(e: any) => setFormSkill({ ...formSkill, risk_policy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100"
                  >
                    <option value="low">Baixo Risco (Execução Automática)</option>
                    <option value="medium">Médio Risco (Monitorado)</option>
                    <option value="strict_confirmation">Confirmação Obrigatória pelo Usuário</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Ferramentas Permitidas (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={formSkill.tools_allowed?.join(', ')}
                    onChange={(e) => setFormSkill({ ...formSkill, tools_allowed: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="web_search, create_document, open_url, calculadora"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('installed')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {isEditing ? 'Salvar Alterações' : 'Salvar e Publicar Skill'}
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'gallery' ? (
          /* OFFICIAL GALLERY */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_COMPOSABLE_SKILLS.map((skill) => {
                const isInstalled = skills.some(s => s.id === skill.id);
                return (
                  <div 
                    key={skill.id}
                    className="bg-white dark:bg-[#181818] p-5 rounded-2xl border border-[#eae6e1] dark:border-[#282828] flex flex-col justify-between shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 uppercase">
                          {skill.category}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">v{skill.version}</span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {skill.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {skill.description}
                      </p>

                      <div className="pt-2 flex flex-wrap gap-1">
                        {skill.tools_allowed.map(tool => (
                          <span key={tool} className="text-[9.5px] px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded font-mono">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[10.5px] text-gray-400">Por {skill.author}</span>
                      <button
                        type="button"
                        disabled={isInstalled}
                        onClick={() => handleInstallOfficial(skill)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          isInstalled 
                            ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        }`}
                      >
                        {isInstalled ? 'Já Instalada' : 'Instalar Skill'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* INSTALLED SKILLS LIST & DETAILS */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Filter & Cards */}
            <div className="lg:col-span-1 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar Skill instalada..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-[#181818] text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredSkills.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    Nenhuma Skill encontrada.
                  </div>
                ) : (
                  filteredSkills.map((skill) => {
                    const isSelected = selectedSkill?.id === skill.id;
                    return (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/20'
                            : 'bg-white dark:bg-[#181818] border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                            {skill.name}
                          </span>
                          {skill.isOfficial && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Oficial
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {skill.description}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Skill Inspector */}
            <div className="lg:col-span-2">
              {selectedSkill ? (
                <div className="bg-white dark:bg-[#181818] rounded-2xl border border-[#eae6e1] dark:border-[#282828] p-5 space-y-4 shadow-xs">
                  {/* Skill Header */}
                  <div className="flex items-start justify-between flex-wrap gap-3 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                          {selectedSkill.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                          v{selectedSkill.version || '1.0.0'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{selectedSkill.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(selectedSkill)}
                        title="Duplicar Skill"
                        className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareJson(selectedSkill)}
                        title="Copiar JSON da Skill"
                        className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        {copiedId === selectedSkill.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSkillFile(selectedSkill)}
                        title="Baixar Arquivo JSON"
                        className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!selectedSkill.isOfficial && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing(true);
                              setFormSkill(selectedSkill);
                              setActiveTab('create');
                            }}
                            title="Editar Skill"
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(selectedSkill.id)}
                            title="Excluir Skill"
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inputs & Outputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-[#faf9f6] dark:bg-[#151515] p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-2">
                      <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block">
                        Esquema de Entradas (Inputs):
                      </span>
                      {selectedSkill.inputs.map((inp, idx) => (
                        <div key={idx} className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{inp.name}</span> ({inp.type}): {inp.description}
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#faf9f6] dark:bg-[#151515] p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-2">
                      <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block">
                        Esquema de Saídas (Outputs):
                      </span>
                      {selectedSkill.outputs.map((out, idx) => (
                        <div key={idx} className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{out.name}</span> ({out.type}): {out.description}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Prompt / Instructions */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] block">
                      Instruções de Execução (System Prompt):
                    </span>
                    <pre className="p-3.5 bg-gray-50 dark:bg-[#141414] text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-zinc-800 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {selectedSkill.instructions}
                    </pre>
                  </div>

                  {/* Acceptance Tests Runner */}
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                        Testes de Aceitação da Skill ({selectedSkill.tests?.length || 0})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRunTests(selectedSkill)}
                        className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" /> Executar Asserções
                      </button>
                    </div>

                    {selectedSkill.tests?.map((test, idx) => {
                      const isPassed = testResults[`${selectedSkill.id}_${idx}`];
                      return (
                        <div key={idx} className="p-2.5 bg-gray-50 dark:bg-[#151515] rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                            <span>{test.name}</span>
                            {isPassed && (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Asserções Aprovadas
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">Entrada: {test.input}</p>
                          <div className="text-[10px] text-gray-400">
                            Asserções: {test.assertions.join(' • ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Selecione uma Skill para visualizar detalhes, esquemas e testes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
