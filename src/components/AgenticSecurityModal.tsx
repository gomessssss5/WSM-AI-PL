import React, { useState, useEffect } from 'react';
import { safeToISOString, formatDateTimeSafely } from '../utils/dateUtils';
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
  status: 'allowed' | 'blocked' | 'requires_approval' | 'executed' | 'demonstracao' | 'failed' | 'succeeded' | 'partial' | 'cancelled';
  environment?: 'real' | 'mock' | 'dry_run' | 'demonstration';
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
    return [];
  });

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'real' | 'mock' | 'demo'>('all');
  const [showAdminMetadata, setShowAdminMetadata] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'failed':
        return {
          label: 'Falha',
          bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
          icon: <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
        };
      case 'blocked':
        return {
          label: 'Bloqueado',
          bg: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:border-zinc-800',
          icon: <Lock className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          bg: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/60 dark:text-gray-300 dark:border-gray-800',
          icon: <AlertTriangle className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        };
      case 'partial':
        return {
          label: 'Parcial',
          bg: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          icon: <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        };
      case 'requires_approval':
        return {
          label: 'Aprovação Pendente',
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          icon: <AlertTriangle className="w-3 h-3 text-amber-500" />
        };
      case 'demonstracao':
        return {
          label: 'Demonstração',
          bg: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
          icon: <CheckCircle2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
        };
      case 'succeeded':
      case 'executed':
      case 'allowed':
      default:
        return {
          label: 'Sucesso',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        };
    }
  };

  const isMockLog = (log: AgentAuditLog) => {
    return log.environment === 'mock' || log.environment === 'dry_run' || log.toolName.includes('MOCK') || (log.details.includes('MOCK') && !log.details.toLowerCase().includes('sandbox')) || (log.details.toLowerCase().includes('simula') && !log.details.toLowerCase().includes('sandbox'));
  };

  const isDemoLog = (log: AgentAuditLog) => {
    return log.environment === 'demonstration' || log.status === 'demonstracao';
  };

  const isRealLog = (log: AgentAuditLog) => {
    return (log.environment === 'real' || (!log.environment && !isMockLog(log) && !isDemoLog(log)));
  };

  const realLogsCount = auditLogs.filter(isRealLog).length;
  const mockLogsCount = auditLogs.filter(isMockLog).length;
  const demoLogsCount = auditLogs.filter(isDemoLog).length;

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('wsm_agent_audit_logs');
        if (saved) {
          const parsed = JSON.parse(saved);
          setAuditLogs(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
        }
      } catch (e) {}
    };

    window.addEventListener('wsm_audit_log_updated', handleUpdate);
    return () => window.removeEventListener('wsm_audit_log_updated', handleUpdate);
  }, []);

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
                        <p className="text-[11px] text-gray-500">Leitura/Escrita no Workspace de arquivos</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
                <div>
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Histórico de Ações Agênticas e Telemetria</span>
                  <span className="text-[11px] text-gray-500 mt-0.5 block">Fonte de verdade imutável para eventos em tempo real</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${filterType === 'all' ? 'bg-white text-black shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      Todos ({auditLogs.length})
                    </button>
                    <button 
                      onClick={() => setFilterType('real')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${filterType === 'real' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      Execuções Reais ({realLogsCount})
                    </button>
                    <button 
                      onClick={() => setFilterType('mock')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${filterType === 'mock' ? 'bg-white text-amber-800 shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      Simulação / Mock ({mockLogsCount})
                    </button>
                    <button 
                      onClick={() => setFilterType('demo')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${filterType === 'demo' ? 'bg-white text-purple-800 shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      Demonstração ({demoLogsCount})
                    </button>
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-gray-950 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showAdminMetadata}
                      onChange={(e) => setShowAdminMetadata(e.target.checked)}
                      className="w-3.5 h-3.5 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                    />
                    Visualização Admin
                  </label>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <ListFilter className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">Nenhum evento registrado ainda nesta sessão.</p>
                  <p className="text-[11px] text-gray-500 mt-1">Execute buscas na web, gere documentos, acione automações ou baixe artefatos para popular o registro de auditoria.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-[#eae6e1] rounded-xl overflow-hidden bg-white shadow-3xs">
                  {auditLogs
                    .filter(log => {
                      if (filterType === 'real') return isRealLog(log);
                      if (filterType === 'mock') return isMockLog(log);
                      if (filterType === 'demo') return isDemoLog(log);
                      return true;
                    })
                    .map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const isMock = isMockLog(log);
                      const isDemo = isDemoLog(log);
                      const isFailure = log.status === 'failed' || log.status === 'blocked' || log.toolName.toLowerCase().includes('failed') || log.details.toLowerCase().includes('falha') || log.details.toLowerCase().includes('erro') || log.details.toLowerCase().includes('401');
                      
                      return (
                        <div key={log.id} className="p-3.5 hover:bg-gray-50/80 transition-colors">
                          <div className="flex items-start justify-between gap-3 text-xs cursor-pointer" onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900">{log.toolName}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isMock ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  isDemo ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {isMock ? 'MOCK / SIMULAÇÃO' : isDemo ? 'DEMO' : 'EXECUÇÃO REAL'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                                  log.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  Risco: {log.riskLevel.toUpperCase()}
                                </span>
                                {showAdminMetadata && (
                                  <span className="font-mono text-[10px] text-gray-400">
                                    run: {log.run_id?.substring(0, 10)}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 leading-normal font-medium">{log.details}</p>
                              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                <span>UTC: {safeToISOString(log.timestamp)}</span>
                                <span>•</span>
                                <span>Local: {log.timestamp_local || formatDateTimeSafely(log.timestamp, undefined, 'Data indisponível')}</span>
                              </div>
                            </div>
 
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              {/* Autorização Gate Badge */}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                                log.status === 'blocked' 
                                  ? 'bg-red-50 text-red-700 border-red-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                Aut: {log.status === 'blocked' ? 'Bloqueado' : 'Permitido'}
                              </span>

                              {/* Execução Result Badge */}
                              {(() => {
                                const badge = getStatusBadge(isFailure ? 'failed' : (isDemo ? 'demonstracao' : 'succeeded'));
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                                    {badge.icon}
                                    Exec: {badge.label}
                                  </span>
                                );
                              })()}
                              
                              <button className="text-gray-400 hover:text-black p-1 text-xs font-mono">
                                {isExpanded ? '[-]' : '[+]'}
                              </button>
                            </div>
                          </div>
 
                          {/* Expanded Telemetry Panel */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-gray-150 text-[11px] font-mono bg-gray-50 p-3 rounded-lg space-y-2 text-gray-700">
                              {showAdminMetadata ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-gray-200 pb-2 mb-2">
                                  <div><strong className="text-gray-900">Tenant ID:</strong> {log.tenant_id}</div>
                                  <div><strong className="text-gray-900">User ID:</strong> {log.user_id}</div>
                                  <div><strong className="text-gray-900">Task ID:</strong> {log.task_id}</div>
                                  <div><strong className="text-gray-900">Tool Call ID:</strong> {log.tool_call_id}</div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-500 flex items-center justify-between bg-gray-100 p-1.5 rounded mb-1">
                                  <span>ℹ️ Metadados de sistema e identificadores operacionais (Tenant, User, Task, Tool IDs) ocultados por segurança.</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowAdminMetadata(true);
                                    }} 
                                    className="text-xs font-bold text-black underline hover:text-neutral-700 cursor-pointer"
                                  >
                                    Exibir Visão Admin
                                  </button>
                                </div>
                              )}

                              <div>
                                <strong className="text-gray-900 block mb-0.5">Entrada Normalizada:</strong>
                                <div className="bg-white p-2 rounded border border-gray-200 text-gray-800 whitespace-pre-wrap">{log.normalized_input}</div>
                              </div>
                              <div>
                                <strong className="text-gray-900 block mb-0.5">Saída:</strong>
                                <div className="bg-white p-2 rounded border border-gray-200 text-gray-800 whitespace-pre-wrap">
                                  {isFailure && log.output?.includes('concluída com êxito')
                                    ? `Erro de Autenticação (HTTP 401): Acesso não autorizado. Erro na resposta da API.`
                                    : log.output}
                                </div>
                              </div>

                              {showAdminMetadata ? (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200 mt-2">
                                    <div><strong className="text-gray-900">Permissões Utilizadas:</strong> {log.permissions_used?.join(', ')}</div>
                                    <div><strong className="text-gray-900">Hash de Integridade:</strong> <span className="bg-gray-200 px-1 py-0.5 rounded">{log.integrity_hash}</span></div>
                                  </div>
                                  {log.evidence && (
                                    <div className="text-gray-500 italic text-[10px] mt-1 pt-1 border-t border-gray-100">
                                      Evidência: {log.evidence}
                                    </div>
                                  )}
                                </>
                              ) : null}

                              {/* Corrective Action guidelines for failures */}
                              {isFailure && (
                                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-900 space-y-2 mt-2 font-sans">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                                    <strong className="text-xs font-bold text-red-950">Ação Corretiva Recomendada (Próximos Passos):</strong>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-red-800">
                                    {log.details.includes('401') || log.details.toLowerCase().includes('autentic') || log.details.toLowerCase().includes('não autorizado')
                                      ? "O disparo automático falhou devido a credenciais expiradas (HTTP 401). Recarregue as chaves de acesso na seção de configurações."
                                      : "Falha na execução da tarefa agendada. Verifique os parâmetros informados e tente novamente."}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert("Renovando sessão e reautenticando credenciais do Agente de segundo plano...");
                                      }}
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                    >
                                      Reautenticar Conta
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert("Iniciando novo disparo imediato da tarefa...");
                                      }}
                                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold transition-all"
                                    >
                                      Tentar Novamente
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert("Navegando para o painel de edição de tarefas agendadas...");
                                      }}
                                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold transition-all"
                                    >
                                      Editar Tarefa
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
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
