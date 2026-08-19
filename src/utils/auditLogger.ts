import { AgentAuditLog } from '../components/AgenticSecurityModal';

export const AUDIT_LOG_EVENT = 'wsm_audit_log_updated';

function computeVerifiableIntegrityHash(payload: string): string {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h0 = Math.imul(h0 ^ ch, 0xcc9e2d51);
    h0 = (h0 << 13) | (h0 >>> 19);
    h1 = Math.imul(h1 ^ ch, 0x1b873593);
    h1 = (h1 << 15) | (h1 >>> 17);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
    h2 = (h2 << 13) | (h2 >>> 19);
    h3 = Math.imul(h3 ^ ch, 0xc2b2ae35);
    h3 = (h3 << 16) | (h3 >>> 16);
  }
  return [h0, h1, h2, h3].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

export function logAuditEvent(params: {
  toolName: string;
  riskLevel?: 'low' | 'medium' | 'high';
  details: string;
  status?: 'allowed' | 'blocked' | 'requires_approval' | 'executed' | 'demonstracao' | 'failed' | 'succeeded' | 'partial' | 'cancelled';
  environment?: 'real' | 'mock' | 'dry_run' | 'demonstration';
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

  // Auto-detect environment if not explicitly set
  let env: 'real' | 'mock' | 'dry_run' | 'demonstration' = params.environment || 'real';
  if (!params.environment) {
    const textToCheck = `${params.toolName} ${params.details}`.toLowerCase();
    if (params.status === 'demonstracao') {
      env = 'demonstration';
    } else if (textToCheck.includes('mock') || textToCheck.includes('simula') || textToCheck.includes('dry_run') || textToCheck.includes('sandbox')) {
      env = 'mock';
    } else {
      env = 'real';
    }
  }

  const payloadToHash = `${utcString}:${params.toolName}:${params.details}:${params.user_id || 'usr'}:${params.riskLevel || 'low'}:${env}`;
  const hash = params.integrity_hash || computeVerifiableIntegrityHash(payloadToHash);

  const isFailure = params.status === 'failed' || params.status === 'blocked' || params.toolName.toLowerCase().includes('fail') || params.details.toLowerCase().includes('falha') || params.details.toLowerCase().includes('erro') || params.details.toLowerCase().includes('401');
  const defaultOutput = isFailure 
    ? (params.details.includes('401') || params.details.toLowerCase().includes('não autorizado') || params.details.toLowerCase().includes('unauthorized')
      ? `Erro de Autenticação (HTTP 401): Acesso não autorizado. Erro na resposta da API.`
      : `Falha na execução: ${params.details}`)
    : `Execução da ferramenta ${params.toolName} concluída com êxito.`;

  const newLog: AgentAuditLog = {
    id: `audit_${now.getTime()}_${hash.slice(0, 8)}`,
    tenant_id: params.tenant_id || 'tenant_main_01',
    user_id: params.user_id || 'usr_wsm_prod',
    run_id: params.run_id || `run_${now.getTime()}`,
    task_id: params.task_id || `task_${now.getTime().toString(36)}`,
    tool_call_id: params.tool_call_id || `tc_${hash.slice(8, 16)}`,
    timestamp: now,
    timestamp_local: localString,
    normalized_input: params.normalized_input || params.details,
    output: params.output || defaultOutput,
    status: params.status || 'executed',
    environment: env,
    permissions_used: params.permissions_used || ['read_workspace', 'execute_tool'],
    evidence: params.evidence || `Sandbox Execution Provenance Log [${env.toUpperCase()}]: ${utcString} | HASH:${hash}`,
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
