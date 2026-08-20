import { Message, ToolEvent } from '../types';
import { safeToISOString } from './dateUtils';

/**
 * Extracts and maps all workspace, search, code, and scheduling actions into a 
 * structured list of typed ToolEvent objects. This establishes a clear, deterministic 
 * contract between the agent, backend tools, and interface.
 */
export function extractStructuredEvents(message: Message): ToolEvent[] {
  const events: ToolEvent[] = [];
  const timestampStr = safeToISOString(message.timestamp);
  const baseRunId = `run_${message.id.replace('msg-', '')}`;

  // 1. Process Web Search Steps (isSearchMessage / searchSteps)
  if (message.isSearchMessage && message.searchSteps && message.searchSteps.length > 0) {
    message.searchSteps.forEach((step, idx) => {
      const isCompleted = step.isCompleted !== undefined ? step.isCompleted : (step.sources && step.sources.length > 0);
      events.push({
        runId: `${baseRunId}_search_${idx}`,
        event: 'web.search',
        tool: 'web.search_query',
        status: isCompleted ? 'success' : 'pending',
        timestamp: timestampStr,
        details: `Pesquisou na web por: "${step.tag}"`,
        filename: undefined,
        artifactId: undefined
      });
    });
  } else if (message.isSearchMessage && message.isSimulatingSearch) {
    events.push({
      runId: `${baseRunId}_search_init`,
      event: 'web.search',
      tool: 'web.search_query',
      status: 'pending',
      timestamp: timestampStr,
      details: 'Iniciando estratégia estruturada de pesquisa...',
    });
  }

  // 2. Process Workspace Actions (<wsm_workspace_action /> tags in text)
  const text = message.text || '';
  const actionRegex = /<wsm_workspace_action\s+status="([^"]+)"\s+type="([^"]+)"\s+file="([^"]+)"\s*\/>/g;
  let match;
  let actionIdx = 0;
  while ((match = actionRegex.exec(text)) !== null) {
    const statusVal = match[1];
    const typeVal = match[2];
    const fileVal = match[3];

    let eventType = 'artifact.modified';
    let toolType = 'workspace.edit_file';

    if (typeVal === 'create') {
      eventType = 'artifact.created';
      toolType = 'workspace.create_file';
    } else if (typeVal === 'delete') {
      eventType = 'artifact.deleted';
      toolType = 'workspace.delete_file';
    } else if (typeVal === 'read') {
      eventType = 'artifact.read';
      toolType = 'workspace.read_file';
    } else if (typeVal === 'list') {
      eventType = 'workspace.listed';
      toolType = 'workspace.list_directory';
    }

    events.push({
      runId: `${baseRunId}_action_${actionIdx++}`,
      event: eventType,
      tool: toolType,
      status: statusVal === 'working' ? 'pending' : 'success',
      artifactId: `file_${fileVal.replace(/[^a-zA-Z0-9]/g, '_')}`,
      filename: fileVal,
      timestamp: timestampStr,
      details: getActionLabelPortuguese(typeVal, fileVal)
    });
  }

  // 3. Process Generated Documents (<doc> or <wsm_document> tags)
  const docRegex = /<(doc|wsm_document)\s+title=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(doc|wsm_document)>/gi;
  let docMatch;
  let docIdx = 0;
  while ((docMatch = docRegex.exec(text)) !== null) {
    const docTitle = docMatch[2];
    const alreadyLogged = events.some(e => e.filename === docTitle && (e.event === 'artifact.created' || e.event === 'artifact.modified'));
    if (!alreadyLogged) {
      events.push({
        runId: `${baseRunId}_doc_${docIdx++}`,
        event: 'artifact.created',
        tool: 'workspace.create_file',
        status: 'success',
        artifactId: `file_${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}`,
        filename: docTitle,
        timestamp: timestampStr,
        details: `Criou o documento "${docTitle}" no Workspace`
      });
    }
  }

  // 4. Process Code Blocks in Text (Simulated code.executed)
  if (message.codeBlock) {
    events.push({
      runId: `${baseRunId}_code_block`,
      event: 'code.executed',
      tool: 'code.execute',
      status: 'success',
      timestamp: timestampStr,
      details: `Executou script estruturado em ${message.codeBlock.language}`
    });
  }

  // 5. Process Scheduler / Task Updates in Text
  if (text.includes('<task>') || text.includes('retryPolicy') || text.includes('timezone')) {
    events.push({
      runId: `${baseRunId}_scheduler`,
      event: 'task.updated',
      tool: 'scheduler.update',
      status: 'success',
      timestamp: timestampStr,
      details: 'Sincronizou regras do agendador automático'
    });
  }

  // If no specific tools are mapped but it is an AI message, create a general reasoning event
  if (events.length === 0 && message.sender === 'ai' && text.length > 0) {
    events.push({
      runId: `${baseRunId}_general`,
      event: 'reasoning.completed',
      tool: 'brain.reasoning',
      status: 'success',
      timestamp: timestampStr,
      details: 'Concluiu o processamento e síntese de resposta'
    });
  }

  return events;
}

function getActionLabelPortuguese(type: string, file: string): string {
  switch (type) {
    case 'create': return `Criou o arquivo "${file}" no Workspace`;
    case 'read': return `Leu o arquivo "${file}" no Workspace`;
    case 'edit': return `Editou o arquivo "${file}" no Workspace`;
    case 'delete': return `Excluiu o arquivo "${file}" do Workspace`;
    case 'list': return `Listou a estrutura de arquivos do Workspace`;
    default: return `Acessou "${file}" no Workspace`;
  }
}
