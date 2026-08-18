import React, { useState, useRef, useEffect } from 'react';
import { 
  FileCode2, 
  Layers, 
  Zap, 
  Clock, 
  CreditCard, 
  Terminal, 
  Lock, 
  CheckCircle2, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  PackageCheck,
  ArrowRight,
  Info,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Skill } from '../lib/skills';

interface DeclarativeSkillComposerProps {
  activeSkills: Skill[];
  setActiveSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  skillMode: 'uma_skill' | 'pipeline';
  setSkillMode: (mode: 'uma_skill' | 'pipeline') => void;
  availableSkills: Skill[];
  onOpenCatalog?: () => void;
}

export function DeclarativeSkillComposer({
  activeSkills,
  setActiveSkills,
  skillMode,
  setSkillMode,
  availableSkills,
  onOpenCatalog
}: DeclarativeSkillComposerProps) {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [showContentPreview, setShowContentPreview] = useState<Record<string, boolean>>({});
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'center'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Dynamically calculate optimal placement based on viewport space
  useEffect(() => {
    if (!isInspectorOpen) return;

    const checkPosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const cardHeight = popoverRef.current ? popoverRef.current.offsetHeight : 400;
      const margin = 16;

      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      // Smart decision:
      // 1. If space above is enough without clipping, place on top
      // 2. Else if space below is enough without clipping, place on bottom
      // 3. Else (if neither has enough room, e.g. center of screen or small viewport), place centered on screen
      if (spaceAbove >= cardHeight + margin) {
        setPlacement('top');
      } else if (spaceBelow >= cardHeight + margin) {
        setPlacement('bottom');
      } else {
        setPlacement('center');
      }
    };

    checkPosition();
    const timeout = setTimeout(checkPosition, 20);
    window.addEventListener('resize', checkPosition);
    window.addEventListener('scroll', checkPosition, true);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('scroll', checkPosition, true);
    };
  }, [isInspectorOpen, skillMode, activeSkills.length, showContentPreview]);

  // Close inspector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsInspectorOpen(false);
        setIsAddStepOpen(false);
      }
    }
    if (isInspectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isInspectorOpen]);

  if (activeSkills.length === 0) return null;

  const currentSkill = activeSkills[0];

  const handleSelectSingleSkill = (skill: Skill) => {
    setActiveSkills([skill]);
    setIsAddStepOpen(false);
  };

  const handleAddStepToPipeline = (skill: Skill) => {
    setActiveSkills(prev => [...prev, skill]);
    setIsAddStepOpen(false);
  };

  const handleRemoveStep = (index: number) => {
    const updated = activeSkills.filter((_, i) => i !== index);
    setActiveSkills(updated);
    if (updated.length === 0) {
      setIsInspectorOpen(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setActiveSkills(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === activeSkills.length - 1) return;
    setActiveSkills(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleSwitchMode = (mode: 'uma_skill' | 'pipeline') => {
    setSkillMode(mode);
    if (mode === 'uma_skill' && activeSkills.length > 1) {
      setActiveSkills([activeSkills[0]]);
    }
  };

  const toggleContentPreview = (id: string) => {
    setShowContentPreview(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Metrics calculation
  const totalCost = skillMode === 'pipeline'
    ? activeSkills.reduce((acc, s) => {
        const val = parseFloat((s.estimated_cost || '0').replace(/[^0.0-9]/g, '')) || 0.002;
        return acc + val;
      }, 0).toFixed(3) + ' cr.'
    : currentSkill?.estimated_cost || '0.002 cr.';

  const totalTime = skillMode === 'pipeline'
    ? `< ${activeSkills.length * 10}s`
    : currentSkill?.estimated_time || '< 10s';

  return (
    <div ref={containerRef} className="relative mb-2 px-1">
      {/* ─── Compact Tag / Chip Row ─── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs select-none">
        {skillMode === 'uma_skill' && currentSkill && (
          <div className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-gray-900 dark:text-gray-100 px-2.5 py-1 rounded-full border border-gray-200/90 dark:border-gray-700/90 shadow-2xs transition-all group">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <button
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className="font-mono font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>/{currentSkill.name}</span>
              {currentSkill.version && (
                <span className="text-[10px] opacity-70 font-sans font-normal">v{currentSkill.version}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className="p-0.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded transition-colors cursor-pointer"
              title="Inspecionar parâmetros e diretrizes da skill"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => setActiveSkills([])}
              className="p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors cursor-pointer ml-0.5"
              title="Remover skill"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {skillMode === 'pipeline' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeSkills.map((sk, idx) => (
              <React.Fragment key={`${sk.id}-${idx}`}>
                <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 px-2.5 py-1 rounded-full border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs transition-all">
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                    className="font-mono font-bold hover:underline cursor-pointer"
                  >
                    /{sk.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-0.5 text-indigo-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors cursor-pointer"
                    title="Remover passo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {idx < activeSkills.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                )}
              </React.Fragment>
            ))}

            <button
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-[11px] border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
              title="Gerenciar pipeline de skills"
            >
              <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
              <span>Configurar Pipeline ({activeSkills.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Centered Modal Backdrop (when placed in center) ─── */}
      {isInspectorOpen && placement === 'center' && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998] animate-in fade-in duration-150"
          onClick={() => {
            setIsInspectorOpen(false);
            setIsAddStepOpen(false);
          }}
        />
      )}

      {/* ─── Floating Inspector & Composer Popover Card ─── */}
      {isInspectorOpen && (
        <div 
          ref={popoverRef}
          className={`${
            placement === 'center'
              ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[calc(100vw-32px)] max-w-lg max-h-[min(580px,85vh)] overflow-y-auto'
              : placement === 'bottom'
              ? 'absolute top-full mt-2 left-0 z-50 w-full max-w-lg max-h-[min(520px,calc(100vh-140px))] overflow-y-auto'
              : 'absolute bottom-full mb-2 left-0 z-50 w-full max-w-lg max-h-[min(520px,calc(100vh-140px))] overflow-y-auto'
          } bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 text-xs text-gray-900 dark:text-gray-100 space-y-3 animate-in fade-in duration-150`}
        >
          {/* Header & Mode Switcher */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl font-medium">
              <button
                type="button"
                onClick={() => handleSwitchMode('uma_skill')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  skillMode === 'uma_skill'
                    ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-3xs font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Uma Skill</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('pipeline')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  skillMode === 'pipeline'
                    ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-3xs font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>Pipeline</span>
                {activeSkills.length > 1 && (
                  <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1 rounded-full">
                    {activeSkills.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
              <span className="flex items-center gap-1" title="Tempo estimado">
                <Clock className="w-3 h-3 text-blue-500" />
                {totalTime}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1" title="Custo aproximado">
                <CreditCard className="w-3 h-3 text-emerald-500" />
                {totalCost}
              </span>
              <button
                type="button"
                onClick={() => setIsInspectorOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode 1: Single Skill Inspector */}
          {skillMode === 'uma_skill' && currentSkill && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm">/{currentSkill.name}</span>
                    {currentSkill.version && (
                      <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.2 rounded border border-gray-200 dark:border-gray-700 font-bold">
                        v{currentSkill.version}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.2 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                      {currentSkill.approval_policy || 'Aprovação Automática'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {currentSkill.description}
                  </p>
                </div>

                {/* Quick Switch Button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddStepOpen(!isAddStepOpen)}
                    className="px-2 py-1 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Trocar</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isAddStepOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 max-h-52 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-900 z-10">
                        Selecionar Skill
                      </div>
                      {availableSkills.map(sk => (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => handleSelectSingleSkill(sk)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer ${
                            sk.id === currentSkill.id
                              ? 'bg-black text-white font-bold'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="font-mono font-bold">/{sk.name}</span>
                          <span className="text-[10px] opacity-70">v{sk.version || '1.0'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grid of Spec Attributes */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1">
                    <Terminal className="w-3 h-3 text-blue-500" />
                    <span>Ferramentas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentSkill.allowed_tools?.map((tool, idx) => (
                      <span key={idx} className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[9px] px-1 py-0.2 rounded border border-blue-200/40">
                        {tool}
                      </span>
                    )) || <span className="text-gray-400 text-[10px]">Padrão</span>}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1">
                    <PackageCheck className="w-3 h-3 text-indigo-500" />
                    <span>Schemas</span>
                  </div>
                  <div className="text-[9px] font-mono text-gray-600 dark:text-gray-400 truncate">
                    <div><strong>In:</strong> {currentSkill.input_schema || '{}'}</div>
                    <div><strong>Out:</strong> {currentSkill.output_schema || '{}'}</div>
                  </div>
                </div>
              </div>

              {/* Accordion to view full content */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleContentPreview(currentSkill.id)}
                  className="text-[11px] text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <span>{showContentPreview[currentSkill.id] ? 'Ocultar Manifesto' : 'Ver Manifesto Declarativo Completo'}</span>
                  {showContentPreview[currentSkill.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showContentPreview[currentSkill.id] && (
                  <div className="mt-1.5 p-2.5 bg-gray-900 text-gray-100 rounded-xl font-mono text-[10px] max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {currentSkill.content}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Pipeline Inspector */}
          {skillMode === 'pipeline' && (
            <div className="space-y-2.5">
              <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/80 rounded-xl p-2 flex items-start gap-2 text-[11px] text-indigo-900 dark:text-indigo-200">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>Esteira sequencial: Cada passo N fornece seu resultado para o passo N+1.</span>
              </div>

              {/* Steps List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activeSkills.map((sk, idx) => (
                  <div 
                    key={`${sk.id}-${idx}`}
                    className="p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-bold font-mono">/{sk.name}</div>
                        <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                          {idx === 0 ? 'Passo Primário' : `Consome Passo ${idx}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 rounded text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === activeSkills.length - 1}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 rounded text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 rounded transition-colors cursor-pointer"
                        title="Remover do pipeline"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Step Control */}
              <div className="relative pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddStepOpen(!isAddStepOpen)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                >
                  <Plus className="w-3 h-3 text-indigo-600" />
                  <span>Adicionar Passo ao Pipeline</span>
                </button>

                {onOpenCatalog && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsInspectorOpen(false);
                      onOpenCatalog();
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                  >
                    Explorar Catálogo →
                  </button>
                )}

                {isAddStepOpen && (
                  <div className="absolute left-0 bottom-full mb-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-900 z-10">
                      Adicionar Skill
                    </div>
                    {availableSkills.map(sk => (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => handleAddStepToPipeline(sk)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="font-mono font-bold text-[11px]">/{sk.name}</div>
                        <span className="text-[10px] text-indigo-600 font-bold">+ Passo</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
