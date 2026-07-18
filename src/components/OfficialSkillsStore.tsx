import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, Minus, Download, Search } from 'lucide-react';
import { Skill, saveSkill, deleteSkillFromDb } from '../lib/skills';
import { OFFICIAL_SKILLS } from '../lib/officialSkills';
import { auth } from '../lib/firebase';

interface OfficialSkillsStoreProps {
  onClose: () => void;
  userSkills: Skill[];
}

export function OfficialSkillsStore({ onClose, userSkills }: OfficialSkillsStoreProps) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = auth.currentUser;

  const handleAddSkill = async (skill: Skill) => {
    if (!currentUser) return;
    await saveSkill(currentUser.uid, { ...skill, isOfficial: true });
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!currentUser) return;
    await deleteSkillFromDb(currentUser.uid, skillId);
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
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Biblioteca de Skills Originais</h1>
            <p className="text-gray-500">Adicione ou remova as skills oficiais da sua biblioteca pessoal.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map(skill => {
            const inLibrary = isSkillInLibrary(skill.id);
            const userSkill = userSkills.find(s => s.id === skill.id) || skill;

            return (
              <div key={skill.id} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all bg-white flex flex-col group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      /{skill.id}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">Oficial</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">WSM AI</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {inLibrary && (
                      <button 
                        onClick={() => {
                          setEditingSkill(userSkill);
                          setEditContent(userSkill.content);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-900 transition-colors"
                        title="Editar"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                    {inLibrary ? (
                      <button 
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                        title="Remover da biblioteca"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAddSkill(skill)}
                        className="p-1.5 hover:bg-brand-50 text-brand-600 rounded-md transition-colors"
                        title="Adicionar à biblioteca"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 mt-1">
                  {skill.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {editingSkill && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="font-semibold flex items-center gap-2 text-gray-900">
                <Settings className="w-5 h-5 text-gray-500" />
                Editar Skill: /{editingSkill.id}
              </h2>
              <button onClick={() => setEditingSkill(null)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 text-xs text-amber-600 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              Nota: as edições feitas aqui são salvas apenas para a sua conta e não alteram a skill oficial global.
            </div>
            <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono text-sm resize-none h-full focus:bg-white transition-all"
                placeholder="Insira o prompt ou as instruções da skill aqui..."
              />
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 flex-shrink-0">
              <button 
                onClick={() => setEditingSkill(null)}
                className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-150 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-5 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors cursor-pointer"
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
