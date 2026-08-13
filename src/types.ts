export interface WsmFormQuestion {
  type: 'single_choice' | 'multiple_choice' | 'text';
  question: string;
  options?: string[];
  allow_other?: boolean;
}

export interface WsmForm {
  id?: string;
  questions: WsmFormQuestion[];
}

export type MemoryLayerType = 
  | 'conversation_context'
  | 'user_preferences'
  | 'confirmed_facts'
  | 'projects'
  | 'related_files'
  | 'decision_history';

export interface MemoryLayerItem {
  id: string;
  layer: MemoryLayerType;
  title: string;
  content: string;
  origin: string; // e.g. "Conversa #12", "Inserção manual", "Inferido pelo Agente"
  confidence: 'high' | 'medium' | 'low'; // Alta (90-100%), Média (60-89%), Baixa (<60%)
  confidenceScore: number; // 0 to 1
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  isStale?: boolean; // If older than threshold or flagged for verification
  tags?: string[];
}

export interface LayeredMemoryStore {
  conversation_context: MemoryLayerItem[];
  user_preferences: MemoryLayerItem[];
  confirmed_facts: MemoryLayerItem[];
  projects: MemoryLayerItem[];
  related_files: MemoryLayerItem[];
  decision_history: MemoryLayerItem[];
}

export interface SkillExample {
  input: string;
  expected_output: string;
}

export interface SkillTest {
  name: string;
  input: string;
  assertions: string[];
}

export interface ComposableSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tools_allowed: string[];
  inputs: { name: string; type: string; description: string; required?: boolean }[];
  outputs: { name: string; type: string; description: string }[];
  risk_policy: 'low' | 'medium' | 'high' | 'strict_confirmation';
  examples: SkillExample[];
  tests: SkillTest[];
  resources: { name: string; uri?: string; description?: string }[];
  category?: 'pesquisa' | 'dados' | 'codigo' | 'produtividade' | 'custom';
  isOfficial?: boolean;
  version?: string;
  author?: string;
  updatedAt?: string | Date;
}

export type ExecutionTaskState = 
  | 'planned' 
  | 'awaiting_confirmation' 
  | 'running' 
  | 'blocked' 
  | 'succeeded' 
  | 'failed' 
  | 'cancelled';

export interface ExecutionStepRecord {
  id: string;
  stepNumber: number;
  tool: string;
  arguments: Record<string, any>;
  startTime: string;
  endTime?: string;
  output?: any;
  error?: string;
  estimatedCost: number;
  permissionsUsed: string[];
  artifactsProduced: string[];
  status: 'planned' | 'running' | 'succeeded' | 'failed' | 'cancelled';
}

export interface ExecutionTask {
  id: string;
  runId: string;
  sessionId: string;
  title: string;
  description: string;
  status: ExecutionTaskState;
  parentTaskId?: string;
  dependencies: string[];
  steps: ExecutionStepRecord[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface ArtifactRecord {
  id: string;
  filename: string;
  title: string;
  hash: string;
  mimeType: string;
  size: number;
  version: number;
  conversationId: string;
  taskId?: string;
  stepId?: string;
  content: string;
  draftContent?: string;
  status: 'draft' | 'persisting' | 'persisted' | 'failed';
  errorDetails?: string;
  createdAt: string;
  updatedAt: string;
  persistedAt?: string;
}

export type ArtifactValidationStatus = 
  | 'PLANEJANDO'
  | 'EXECUTANDO'
  | 'ARTEFATO_CRIADO'
  | 'VALIDANDO'
  | 'VALIDADO'
  | 'VALIDAÇÃO_FALHOU'
  | 'ENTREGUE'
  | 'EXECUÇÃO_FALHOU'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'unvalidated';

export interface ValidationState {
  status: ArtifactValidationStatus;
  statusLabel?: string;
  testsPassed?: number;
  testsTotal?: number;
  version?: string;
  hash?: string;
  filesGenerated?: string[];
  commandsReproduced?: string[];
  logs?: string;
  metRequirements?: string[];
  unmetRequirements?: string[];
  diffSummary?: string;
}

export interface FileVersion {
  versionNumber: number;
  timestamp: Date;
  author: string;
  content: string;
  changeSummary: string;
  metRequirements?: string[];
  unmetRequirements?: string[];
  linesAdded?: number;
  linesRemoved?: number;
}

export interface WsmDocument {
  title: string;
  content: string;
  format?: 'pdf' | 'md' | string;
  validation?: ValidationState;
  versions?: FileVersion[];
  currentVersion?: number;
}

export interface SearchStep {
  tag: string;
  thinking: string;
  transition?: string;
  sources: {
    title: string;
    url: string;
    snippet?: string;
  }[];
  isCompleted?: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isHidden?: boolean;
  imageUrl?: string;
  codeBlock?: {
    language: string;
    code: string;
  };
  translationData?: {
    original: string;
    translated: string;
    sourceLang: string;
    targetLang: string;
  };
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  searchImages?: string[];
  searchSources?: {
    title: string;
    url: string;
    snippet?: string;
  }[];
  // Search Upgrade Fields
  isSearchMessage?: boolean;
  searchIntro?: string;
  searchSteps?: SearchStep[];
  finalSynthesis?: string;
  visibleStepsCount?: number;
  isSimulatingSearch?: boolean;
  browserScreenshots?: {
    screenshot: string;
    url?: string;
    title?: string;
    stepName?: string;
    timestamp?: number;
  }[];
  attachments?: {
    name: string;
    type: 'image' | 'video' | 'audio' | 'document';
    size: number;
    url: string;
    mimeType?: string;
    base64?: string;
  }[];
  model?: string;
  geminiModel?: string;
  toolEvents?: ToolEvent[];
}

export interface ToolEvent {
  runId: string;
  event: 'artifact.created' | 'artifact.modified' | 'web.search' | 'code.executed' | 'task.updated' | string;
  tool: 'workspace.create_file' | 'workspace.edit_file' | 'workspace.delete_file' | 'web.search_query' | 'code.execute' | string;
  status: 'success' | 'failed' | 'pending';
  artifactId?: string;
  filename?: string;
  timestamp: string;
  details?: string;
}

export interface ScheduledTaskRetryPolicy {
  maxRetries: number;
  backoffSeconds: number;
  attemptsMade?: number;
}

export interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string; // IANA timezone, e.g., 'America/Sao_Paulo'
  date?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  expirationDate?: string;
  isActive: boolean;
  isPaused?: boolean;
  status?: 'active' | 'paused' | 'canceled';
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt: Date;
  retryPolicy?: ScheduledTaskRetryPolicy;
  lastExecutionDurationMs?: number;
  lastExecutionStatus?: 'succeeded' | 'failed' | 'running';
  lastErrorDetails?: string;
}

export interface TaskExecution {
  id: string;
  runId: string; // Unique idempotent execution UUID
  taskId: string;
  taskTitle: string;
  executedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  triggerType?: 'manual' | 'scheduled' | 'retry' | 'event';
  sessionId: string;
  status: 'queued' | 'planning' | 'waiting_approval' | 'running' | 'waiting_user' | 'partial' | 'succeeded' | 'failed' | 'canceled' | 'expired';
  attempts?: number;
  maxRetries?: number;
  outputSummary?: string;
  generatedFiles?: string[];
  error?: string;
  errorDetails?: string;
  steps?: ExecutionStep[];
  logs?: string[];
}

export interface LibraryFile {
  id: string;
  title: string;
  type: 'document' | 'code' | 'table' | 'script';
  format: 'pdf' | 'excel' | 'doc' | 'ts' | 'js' | 'python' | 'html' | 'css' | 'json' | 'md' | string;
  updatedAt: Date;
  size: string;
  sessionTitle?: string;
  sessionId?: string;
  content: string;
  previewSnippet: string;
  downloadFilename: string;
  origin?: string;
}

export type ExecutionState = 
  | 'draft' 
  | 'awaiting_approval' 
  | 'queued' 
  | 'running' 
  | 'waiting_user' 
  | 'validating' 
  | 'succeeded' 
  | 'partially_succeeded' 
  | 'failed' 
  | 'cancelled';

export interface ExecutionStep {
  id: string;
  name: string;
  tool: 'browser' | 'workspace' | 'code' | 'api' | 'scheduler';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  details?: string;
  timestamp?: Date;
}

export interface ValidationCriterion {
  id: string;
  description: string;
  status: 'passed' | 'failed' | 'pending';
  details?: string;
}

export interface ExecutionLedgerEntry {
  runId: string;
  sessionId: string;
  sessionTitle: string;
  intentGoal: string;
  constraints?: string[];
  state: ExecutionState;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  isApproved?: boolean;
  steps: ExecutionStep[];
  validations: ValidationCriterion[];
  artifacts: { id: string; title: string; format: string; url?: string }[];
  evidenceLogs: string[];
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  tokensUsed?: number;
  errorMessage?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  category?: 'write' | 'code' | 'image' | 'analysis' | 'translate' | 'general';
  isUnread?: boolean;
  isScheduled?: boolean;
  isTemporary?: boolean;
  isPublic?: boolean;
  model?: string;
  chatMemoryDoc?: string;
}

export interface Draft {
  id: string;
  inputValue: string;
  attachedText?: string;
  attachments?: {
    name: string;
    type: 'image' | 'video' | 'audio' | 'document';
    size: number;
    url: string;
    mimeType?: string;
    base64?: string;
  }[];
  timestamp: Date;
}
