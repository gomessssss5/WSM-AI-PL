import { AgentAuditLog } from '../components/AgenticSecurityModal';

export const AUDIT_LOG_EVENT = 'wsm_audit_log_updated';

export function logAuditEvent(params: {
  toolName: string;
  riskLevel?: 'low' | 'medium' | 'high';
  details: string;
  status?: 'allowed' | 'blocked' | 'requires_approval' | 'executed' | 'demonstracao';
  tenant_id?: string;
  user_id?: string;
  run_id?: string;
  task_id?: string;
  tool_call_id?: string;
  normalized_input?: string;
  output?: string;
  permissions_used?: string[];
  evidence?: string;
  integrity_hash?: string;
}): AgentAuditLog {
  const now = new Date();
  const utcString = now.toISOString();
  const localString = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

  // Generate a random 16-character hexadecimal hash if not provided
  const hash = params.integrity_hash || Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const newLog: AgentAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tenant_id: params.tenant_id || 'tenant_main_01',
    user_id: params.user_id || 'usr_wsm_prod',
    run_id: params.run_id || `run_${Date.now()}`,
    task_id: params.task_id || `task_${Math.floor(Math.random() * 10000)}`,
    tool_call_id: params.tool_call_id || `tc_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: now,
    timestamp_local: localString,
    normalized_input: params.normalized_input || params.details,
    output: params.output || `Execução da ferramenta ${params.toolName} concluída com êxito.`,
    status: params.status || 'executed',
    permissions_used: params.permissions_used || ['read_workspace', 'execute_tool'],
    evidence: params.evidence || `Sandbox Sandbox Execution Log: ${utcString}`,
    integrity_hash: hash,
    toolName: params.toolName,
    riskLevel: params.riskLevel || 'low',
    details: params.details
  };

  try {
    const existingRaw = localStorage.getItem('wsm_agent_audit_logs');
    let existing: any[] = [];
    if (existingRaw) {
      existing = JSON.parse(existingRaw);
    }
    const updated = [newLog, ...existing].slice(0, 200);
    localStorage.setItem('wsm_agent_audit_logs', JSON.stringify(updated));
    
    window.dispatchEvent(new CustomEvent(AUDIT_LOG_EVENT, { detail: newLog }));
  } catch (e) {
    console.error('Erro ao registrar log de auditoria:', e);
  }

  return newLog;
}
