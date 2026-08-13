import { ArtifactRecord, ExecutionTask, ExecutionTaskState, ExecutionStepRecord } from '../types';

const DRAFTS_KEY = 'wsm_artifact_drafts_v1';
const GRAPH_TASKS_KEY = 'wsm_execution_graph_v1';

/**
 * Service for the Execution Runtime with verifiable artifact persistence and 
 * execution task graph lifecycle management.
 */

export async function persistArtifactToBackend(params: {
  filename: string;
  title?: string;
  content: string;
  format?: string;
  conversationId: string;
  taskId?: string;
  stepId?: string;
  draftContent?: string;
  forceFail?: boolean;
}): Promise<{ success: boolean; artifact?: ArtifactRecord; error?: string; draftContent?: string }> {
  try {
    const res = await fetch('/api/artifacts/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (res.ok && data.success && data.artifact) {
      // Remove any previously stored draft for this filename since it's now confirmed
      removeLocalDraft(params.conversationId, params.filename);
      return { success: true, artifact: data.artifact };
    } else {
      const errorMsg = data.error || 'O backend recusou a gravação do artefato.';
      saveLocalDraft({
        conversationId: params.conversationId,
        filename: params.filename,
        title: params.title || params.filename,
        content: params.content,
        error: errorMsg,
        timestamp: new Date().toISOString()
      });
      return { 
        success: false, 
        error: errorMsg, 
        draftContent: params.content || params.draftContent 
      };
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Falha de conexão com o armazenamento do backend.';
    saveLocalDraft({
      conversationId: params.conversationId,
      filename: params.filename,
      title: params.title || params.filename,
      content: params.content,
      error: errorMsg,
      timestamp: new Date().toISOString()
    });
    return { 
      success: false, 
      error: errorMsg, 
      draftContent: params.content || params.draftContent 
    };
  }
}

// Local Draft Recovery Storage
export interface LocalArtifactDraft {
  conversationId: string;
  filename: string;
  title: string;
  content: string;
  error: string;
  timestamp: string;
}

export function saveLocalDraft(draft: LocalArtifactDraft): void {
  try {
    const existing = getLocalDrafts();
    const filtered = existing.filter(d => !(d.conversationId === draft.conversationId && d.filename === draft.filename));
    filtered.push(draft);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to store draft in localStorage', e);
  }
}

export function getLocalDrafts(): LocalArtifactDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function removeLocalDraft(conversationId: string, filename: string): void {
  try {
    const existing = getLocalDrafts();
    const filtered = existing.filter(d => !(d.conversationId === conversationId && d.filename === filename));
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove draft from localStorage', e);
  }
}

// Execution Task Graph Sync
export async function syncTaskToRuntimeGraph(task: ExecutionTask): Promise<boolean> {
  // Save locally first
  saveTaskLocally(task);
  try {
    const res = await fetch('/api/runtime/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Failed to sync runtime graph task with backend', e);
    return false;
  }
}

export function saveTaskLocally(task: ExecutionTask): void {
  try {
    const raw = localStorage.getItem(GRAPH_TASKS_KEY);
    const tasks: ExecutionTask[] = raw ? JSON.parse(raw) : [];
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem(GRAPH_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to store task graph locally', e);
  }
}

export function getLocalTaskGraph(sessionId?: string): ExecutionTask[] {
  try {
    const raw = localStorage.getItem(GRAPH_TASKS_KEY);
    const tasks: ExecutionTask[] = raw ? JSON.parse(raw) : [];
    if (sessionId) {
      return tasks.filter(t => t.sessionId === sessionId);
    }
    return tasks;
  } catch (e) {
    return [];
  }
}

/**
 * Creates a structured execution task with mandatory lifecycle states:
 * 'planned' | 'awaiting_confirmation' | 'running' | 'blocked' | 'succeeded' | 'failed' | 'cancelled'
 */
export function createExecutionTask(params: {
  runId: string;
  sessionId: string;
  title: string;
  description: string;
  parentTaskId?: string;
  dependencies?: string[];
}): ExecutionTask {
  const now = new Date().toISOString();
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    runId: params.runId,
    sessionId: params.sessionId,
    title: params.title,
    description: params.description,
    status: 'planned',
    parentTaskId: params.parentTaskId,
    dependencies: params.dependencies || [],
    steps: [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Appends a step to an execution task recording tool, arguments, times, cost, permissions, and artifacts.
 */
export function addStepToTask(
  task: ExecutionTask,
  stepParams: {
    tool: string;
    arguments: Record<string, any>;
    estimatedCost?: number;
    permissionsUsed?: string[];
    artifactsProduced?: string[];
  }
): { updatedTask: ExecutionTask; step: ExecutionStepRecord } {
  const now = new Date().toISOString();
  const stepNumber = task.steps.length + 1;
  const step: ExecutionStepRecord = {
    id: `step_${Date.now()}_${stepNumber}`,
    stepNumber,
    tool: stepParams.tool,
    arguments: stepParams.arguments,
    startTime: now,
    status: 'running',
    estimatedCost: stepParams.estimatedCost ?? 0.0001,
    permissionsUsed: stepParams.permissionsUsed || ['workspace.write'],
    artifactsProduced: stepParams.artifactsProduced || []
  };

  const updatedTask: ExecutionTask = {
    ...task,
    status: 'running',
    steps: [...task.steps, step],
    updatedAt: now
  };

  return { updatedTask, step };
}

/**
 * Finalizes a step with output, error, and status.
 */
export function completeTaskStep(
  task: ExecutionTask,
  stepId: string,
  result: {
    output?: any;
    error?: string;
    artifactsProduced?: string[];
    status: 'succeeded' | 'failed' | 'cancelled';
  }
): ExecutionTask {
  const now = new Date().toISOString();
  const steps = task.steps.map(s => {
    if (s.id === stepId) {
      return {
        ...s,
        endTime: now,
        output: result.output,
        error: result.error,
        artifactsProduced: result.artifactsProduced || s.artifactsProduced,
        status: result.status
      };
    }
    return s;
  });

  const hasFailed = steps.some(s => s.status === 'failed');
  const allCompleted = steps.every(s => s.status === 'succeeded' || s.status === 'failed' || s.status === 'cancelled');

  let taskStatus: ExecutionTaskState = task.status;
  if (hasFailed) taskStatus = 'failed';
  else if (allCompleted) taskStatus = 'succeeded';

  const updatedTask: ExecutionTask = {
    ...task,
    steps,
    status: taskStatus,
    updatedAt: now,
    completedAt: allCompleted ? now : undefined,
    error: result.error || task.error
  };

  syncTaskToRuntimeGraph(updatedTask);
  return updatedTask;
}
