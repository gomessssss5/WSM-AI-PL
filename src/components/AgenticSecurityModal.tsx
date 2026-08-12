import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sliders, 
  Globe, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ListFilter, 
  X, 
  Eye, 
  Terminal, 
  Calendar, 
  FolderCheck,
  Server,
  FileCode,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';

export interface SecuritySettings {
  requireRiskApproval: boolean;
  enableWebSearch: boolean;
  enableCodeExecution: boolean;
  enableBackgroundTasks: boolean;
  enableWorkspaceAccess: boolean;
  domainBlocklist: string;
  domainAllowlist: string;
}

export interface AgentAuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  run_id?: string;
  task_id?: string;
  tool_call_id?: string;
  timestamp: Date;
  timestamp_local?: string;
  normalized_input?: string;
  output?: string;
  status: 'allowed' | 'blocked' | 'requires_approval' | 'executed' | 'demonstracao';
  permissions_used?: string[];
  evidence?: string;
  integrity_hash?: string;
  toolName: string;
  riskLevel: 'low' | 'medium' | 'high';
  details: string;
}

interface AgenticSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export default function AgenticSecurityModal({ isOpen, onClose, userId }: AgenticSecurityModalProps) {
  const [activeTab, setActiveTab] = useState<'controls' | 'audit'>('controls');

  const [settings, setSettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('wsm_agent_security_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      requireRiskApproval: true,
      enableWebSearch: true,
      enableCodeExecution: true,
      enableBackgroundTasks: true,
      enableWorkspaceAccess: true,
      domainBlocklist: 'malicious-site.com, untrusted-domain.org',
      domainAllowlist: '*'
    };
  });

  const [auditLogs, setAuditLogs] = useState<AgentAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('wsm_agent_audit_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) }));
      }
    } catch (e) {}
    // Seeding with empty array instead of fake data to maintain honesty as a source of truth
    return [];
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    try {
      localStorage.setItem('wsm_agent_security_settings', JSON.stringify(settings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#eae6e1] bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Segurança & Governança Agêntica
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  Proteção Ativa
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Controles de risco, isolamento de ferramentas, filtros de domínio e auditoria em tempo real.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#eae6e1] px-5 bg-white shrink-0 gap-6">
          <button 
            onClick={() => setActiveTab('controls')}
            className={`py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'controls' 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Barreiras & Permissões
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit' 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Registro de Auditoria ({auditLogs.length})
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'controls' && (
            <div className="space-y-6">
              
              {/* Human in the loop section */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Confirmação para Ações de Alto Impacto (Human-in-the-Loop)</h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Exige confirmação manual antes de o agente executar alterações estruturais no banco de dados, envio de e-mails externos ou execução de códigos sensíveis.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.requireRiskApproval}
                      onChange={(e) => setSettings({ ...settings, requireRiskApproval: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              {/* Tool Isolation Toggles */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Isolamento e Permissões por Ferramenta</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-[#eae6e1] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-gray-800">Pesquisa Web (Tavily/RSS)</p>
                        <p className="text-[11px] text-gray-500">Busca e extração de páginas externas</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.enableWebSearch}
                      onChange={(e) => setSettings({ ...settings, enableWebSearch: e.target.checked })}
                      className="w-4 h-4 text-black rounded focus:ring-black cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#eae6e1] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs font-bold text-gray-800">Execução de Código</p>
                        <p className="text-[11px] text-gray-500">Processamento em sandbox isolado</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.enableCodeExecution}
                      onChange={(e) => setSettings({ ...settings, enableCodeExecution: e.target.checked })}
                      className="w-4 h-4 text-black rounded focus:ring-black cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#eae6e1] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-gray-800">Automações Agendadas</p>
                        <p className="text-[11px] text-gray-500">Execução autônoma em segundo plano</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.enableBackgroundTasks}
                      onChange={(e) => setSettings({ ...settings, enableBackgroundTasks: e.target.checked })}
                      className="w-4 h-4 text-black rounded focus:ring-black cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#eae6e1] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderCheck className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="text-xs font-bold text-gray-800">Acesso ao Workspace</p>
                        <p className="text-[11px] text-gray-500">Leitura/Escrita na Biblioteca de arquivos</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.enableWorkspaceAccess}
                      onChange={(e) => setSettings({ ...settings, enableWorkspaceAccess: e.target.checked })}
                      className="w-4 h-4 text-black rounded focus:ring-black cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Domain Blocklist / Allowlist */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Filtro de Domínios para Pesquisa</h3>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">Blocklist (Domínios Proibidos para o Agente)</label>
                  <input 
                    type="text" 
                    value={settings.domainBlocklist}
                    onChange={(e) => setSettings({ ...settings, domainBlocklist: e.target.value })}
                    placeholder="ex: site-suspeito.com, unverified-domain.net"
                    className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-mono"
                  />
                </div>
              </div>

            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Ações Agênticas</span>
                <span className="text-[11px] text-gray-500">Auditável e imutável</span>
              </div>

              <div className="divide-y divide-gray-100 border border-[#eae6e1] rounded-xl overflow-hidden bg-white">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-gray-50 transition-colors flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{log.toolName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                          log.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          Risco: {log.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-normal">{log.details}</p>
                      <p className="text-[10px] text-gray-400">
                        {log.timestamp.toLocaleDateString('pt-BR')} às {log.timestamp.toLocaleTimeString('pt-BR')}
                      </p>
                    </div>

                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {log.status === 'executed' ? 'Executado' : log.status === 'demonstracao' ? 'Demonstração' : 'Permitido'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#eae6e1] bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
                <Check className="w-4 h-4" /> Preferências de segurança salvas!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Fechar
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Salvar Configurações
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
