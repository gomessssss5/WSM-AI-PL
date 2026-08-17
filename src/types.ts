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

export type MemoryNatureType = 
  | 'declared'    // Declarada explicitamente pelo usuário (consentimento explícito, alta retenção)
  | 'inferred'    // Inferida pelo modelo/agente (hipótese/dedução temporária, TTL estrito, requer validação para virar fato)
  | 'retrieved';  // Recuperada de arquivos/documentos/índice semântico com hash e link de origem

export interface MemoryDerivativeCopies {
  semantic_index: boolean;
  logs: boolean;
  cache: boolean;
  storage_keys?: string[];
}

export interface MemoryLayerItem {
  id: string;
  layer: MemoryLayerType;
  nature: MemoryNatureType; // 'declared' | 'inferred' | 'retrieved'
  title: string;
  content: string;
  origin: string; // e.g. "Entrada do Usuário (Declarada)", "Hipótese Inferida pelo Agente", "Documento: /data/spec.md"
  originUri?: string; // URI ou caminho do arquivo quando retrieved
  sourceArtifactId?: string;
  confidence: 'high' | 'medium' | 'low'; // Alta (90-100%), Média (60-89%), Baixa (<60%)
  confidenceScore: number; // 0 to 1
  consentRequired?: boolean;
  ttlSeconds?: number;
  ttlDays?: number;
  expiresAt?: string;
  retentionPolicy?: 'permanent' | 'session' | '30_days' | '90_days' | 'until_revoked';
  derivativeCopies?: MemoryDerivativeCopies;
  isStale?: boolean; // If older than threshold or flagged for verification
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
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
  notes?: string;
}

export interface SkillFixture {
  name: string;
  type: 'file' | 'json' | 'mock_response' | 'env_var';
  path?: string;
  content?: string;
}

export interface SkillTest {
  name: string;
  input: string;
  fixtures?: SkillFixture[];
  assertions: string[];
}

export interface SkillRetryPolicy {
  max_retries: number;
  backoff: 'fixed' | 'exponential';
  backoff_delay_ms: number;
  retry_on_errors?: string[];
}

export interface SkillRollbackPlan {
  enabled: boolean;
  cleanup_artifacts?: boolean;
  revert_files?: boolean;
  rollback_instructions?: string;
}

export interface ComposableSkill {
  id: string;
  name: string;
  version: string;
  description: string;
  instructions: string;
  tools_allowed: string[];
  data_access?: {
    read_paths?: string[];
    write_paths?: string[];
    network_domains?: string[];
    allow_env_secrets?: boolean;
  };
  inputs: { name: string; type: string; description: string; required?: boolean; default?: any }[];
  outputs: { name: string; type: string; description: string; schema?: Record<string, any> }[];
  risk_policy: 'low' | 'medium' | 'high' | 'strict_confirmation';
  timeout: number; // in seconds (e.g. 30, 60, 120)
  retry_policy: SkillRetryPolicy;
  examples: SkillExample[];
  fixtures?: SkillFixture[];
  tests: SkillTest[];
  permissions: string[]; // Scoped grants e.g. ["workspace:read", "workspace:write", "web:search"]
  rollback: SkillRollbackPlan;
  resources: { name: string; uri?: string; description?: string }[];
  category?: 'pesquisa' | 'dados' | 'codigo' | 'produtividade' | 'custom';
  isOfficial?: boolean;
  author?: string;
  updatedAt?: string | Date;
}

export interface CodeContract {
  functionName: string;
  signature: string;
  expectedReturnType: string;
  invariants: string[];
  edgeCases: string[];
  desiredBehavior: string;
  observedBehavior?: string;
  diffSummary?: string;
  requiresClarification?: boolean;
}

export interface CodeExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  filesChanged: string[];
  coveragePercentage?: number;
  testsStatus: {
    passed: number;
    failed: number;
    total: number;
    assertionsResults: { name: string; status: 'passed' | 'failed'; error?: string }[];
  };
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

export interface MessageContentPart {
  type: 'text' | 'image' | 'file';
  text?: string;
  url?: string;
  mimeType?: string;
  name?: string;
}

export interface ClientMessageMetadata {
  clientTimestamp: number;
  charCount: number;
  lineCount: number;
  payloadHash: string; // SHA-256
  isMultiline: boolean;
  clientVersion?: string;
}

export interface UnifiedChatPayload {
  content: MessageContentPart[];
  text: string;
  attachments?: any[];
  language?: string;
  metadata: ClientMessageMetadata;
  sessionId: string;
  chatMemoryDoc?: string;
  workspaceFiles?: any[];
  isSearchEnabled?: boolean;
  isComputerEnabled?: boolean;
  model?: string;
  reasoningLevel?: string;
  skills?: any[];
  layeredMemories?: any;
  userContext?: any;
  userInfo?: any;
  history?: any[];
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  userQuery?: string;
  timestamp: Date;
  payloadHash?: string;
  metadata?: ClientMessageMetadata;
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
  toolsInvoked?: string[];
  error?: string;
  errorDetails?: string;
  steps?: ExecutionStep[];
  logs?: string[];
}

export interface DetailedToolCall {
  id: string;
  tool_name: string;
  arguments: Record<string, any>;
  normalized_input: string;
  permission: 'granted' | 'denied' | 'auto_scoped';
  risk: 'low' | 'medium' | 'high' | 'critical';
  started_at: string;
  finished_at?: string;
  result_ref?: string;
  error?: string;
  retry_count: number;
  approval_id?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'retrying';
}

export interface RunVerifiableTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  errorDetails?: string;
}

export interface RunStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'replanned';
  isExplicitCheckbox?: boolean;
  toolCalls?: DetailedToolCall[];
  startedAt?: string;
  completedAt?: string;
}

export interface PendingApproval {
  id: string;
  toolName: string;
  description: string;
  risk: 'medium' | 'high' | 'critical';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface OmnixRun {
  id: string;
  sessionId: string;
  messageId?: string;
  objective: string;
  status: 'planning' | 'running' | 'waiting_approval' | 'validating' | 'succeeded' | 'failed' | 'replanning' | 'cancelled';
  plan: {
    id: string;
    objective: string;
    steps: RunStep[];
    replanCount: number;
    verifiableTests: RunVerifiableTest[];
  };
  toolCalls: DetailedToolCall[];
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  pendingApprovals: PendingApproval[];
  approxCost: {
    currency: string;
    amount: number;
    tokensEstimated?: number;
  };
  elapsedTimeMs: number;
  progressPercentage: number;
  artifacts: ArtifactRecord[];
  nextSteps: string[];
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
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
  | 'cancelled'
  | 'auth_required';

export interface ExecutionAuthDetails {
  cause: string;
  stage: string;
  recommendedAction: string;
}

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
  authDetails?: ExecutionAuthDetails;
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
