import React, { useState } from 'react';
import { X, Settings, Plus, Minus, Search, ShieldCheck, Cpu, Terminal, CheckCircle2, Lock, Eye } from 'lucide-react';
import { Skill, saveSkill, deleteSkillFromDb } from '../lib/skills';
import { OFFICIAL_SKILLS } from '../lib/officialSkills';
import { auth } from '../lib/firebase';
import { logAuditEvent } from '../utils/auditLogger';

interface OfficialSkillsStoreProps {
  onClose: () => void;
  userSkills: Skill[];
}

export function OfficialSkillsStore({ onClose, userSkills }: OfficialSkillsStoreProps) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [inspectSkill, setInspectSkill] = useState<Skill | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = auth.currentUser;

  const handleAddSkill = async (skill: Skill) => {
    if (!currentUser) return;
    await saveSkill(currentUser.uid, { ...skill, isOfficial: true });
    logAuditEvent({
      toolName: 'Habilitação de Skill Governada',
      riskLevel: 'medium',
      details: `Skill /${skill.id} (v${skill.version || '1.0'}) adicionada à biblioteca do usuário com permissões: ${skill.permissions?.join(', ')}`,
      status: 'executed',
      normalized_input: `Skill ID: ${skill.id}, Scope: ${skill.scope}`,
      output: `Skill /${skill.id} habilitada com sucesso.`,
      permissions_used: skill.permissions || ['read_workspace']
    });
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!currentUser) return;
    await deleteSkillFromDb(currentUser.uid, skillId);
    logAuditEvent({
      toolName: 'Desativação de Skill Governada',
      riskLevel: 'low',
      details: `Skill /${skillId} removida da biblioteca do usuário.`,
      status: 'executed'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSkill || !currentUser) return;
    await saveSkill(currentUser.uid, {
      ...editingSkill,
      content: editContent
    });
    setEditingSkill(null);
  };

  const isSkillInLibrary = (skillId: string) => {
    return userSkills.some(s => s.id === skillId);
  };

  const filteredSkills = OFFICIAL_SKILLS.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.scope && s.scope.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventário de Módulos & Skills Governadas</h1>
            <p className="text-gray-500">Módulos com schema tipado, declaração de permissões, política de aprovação e testes de aceitação.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar por nome, escopo ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Todas as Skills são isoladas em Sandbox com validação estática.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map(skill => {
            const inLibrary = isSkillInLibrary(skill.id);
            const userSkill = userSkills.find(s => s.id === skill.id) || skill;

            return (
              <div key={skill.id} className="border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-all bg-white flex flex-col justify-between group relative overflow-hidden shadow-3xs hover:shadow-2xs">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        /{skill.id}
                        {skill.version && (
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                            v{skill.version}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200/60">
                          {skill.approval_policy || 'Oficial'}
                        </span>
                        <span>•</span>
                        <span>{skill.scope || 'Módulo Agêntico'}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => setInspectSkill(skill)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-black transition-colors cursor-pointer"
                        title="Inspecionar Governança & Schemas"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {inLibrary && (
                        <button 
                          onClick={() => {
                            setEditingSkill(userSkill);
                            setEditContent(userSkill.content);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-black transition-colors cursor-pointer"
                          title="Editar Instruções Pessoais"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}

                      {inLibrary ? (
                        <button 
                          onClick={() => handleRemoveSkill(skill.id)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors cursor-pointer"
                          title="Remover da biblioteca"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddSkill(skill)}
                          className="p-1.5 hover:bg-black text-white rounded-md transition-colors bg-gray-900 cursor-pointer"
                          title="Habilitar Skill"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {skill.description}
                  </p>

                  {/* Governance summary pills */}
                  <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="truncate">{skill.permissions?.length || 0} permissões</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Terminal className="w-3.5 h-3.5 text-blue-600" />
                      <span className="truncate">{skill.allowed_tools?.length || 0} ferramentas</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between">
                  <button 
                    onClick={() => setInspectSkill(skill)}
                    className="text-xs font-semibold text-gray-700 hover:text-black flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Requisitos & Schemas</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </button>

                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    inLibrary ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {inLibrary ? 'Habilitada' : 'Disponível'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspect Governance Modal */}
      {inspectSkill && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">/{inspectSkill.id}</h2>
                  <span className="text-xs font-mono bg-gray-200 text-gray-800 px-2 py-0.5 rounded">v{inspectSkill.version || '1.0.0'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{inspectSkill.scope || 'Módulo Agêntico'}</p>
              </div>

              <button onClick={() => setInspectSkill(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">Política de Aprovação & Governança</h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    {inspectSkill.approval_policy} — Compatibilidade: {inspectSkill.compatibility || 'Geral'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
                    <Lock className="w-4 h-4 text-amber-600" /> Permissões Requeridas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectSkill.permissions?.map((p, i) => (
                      <span key={i} className="bg-amber-100 text-amber-900 font-mono text-[10px] px-2 py-1 rounded">
                        {p}
                      </span>
                    )) || <span className="text-gray-400">Nenhuma permissão especial</span>}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
                    <Terminal className="w-4 h-4 text-blue-600" /> Ferramentas Permitidas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectSkill.allowed_tools?.map((t, i) => (
                      <span key={i} className="bg-blue-100 text-blue-900 font-mono text-[10px] px-2 py-1 rounded">
                        {t}
                      </span>
                    )) || <span className="text-gray-400">Ferramentas padrão</span>}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">Input Schema (Entrada Tipada)</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                  {inspectSkill.input_schema || '{}'}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">Output Schema (Saída Tipada)</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                  {inspectSkill.output_schema || '{}'}
                </div>
              </div>

              {inspectSkill.acceptance_tests && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Testes de Aceitação do Módulo</h4>
                  <ul className="space-y-1.5">
                    {inspectSkill.acceptance_tests.map((test, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{test}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setInspectSkill(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editingSkill && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="font-semibold flex items-center gap-2 text-gray-900">
                <Settings className="w-5 h-5 text-gray-500" />
                Editar Instruções da Skill: /{editingSkill.id}
              </h2>
              <button onClick={() => setEditingSkill(null)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 text-xs text-amber-600 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              Nota: as edições feitas aqui são salvas apenas para a sua conta e não alteram a versão global do módulo.
            </div>
            <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none font-mono text-sm resize-none h-full focus:bg-white transition-all"
                placeholder="Insira as instruções ou o sistema da skill aqui..."
              />
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 flex-shrink-0">
              <button 
                onClick={() => setEditingSkill(null)}
                className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-5 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
