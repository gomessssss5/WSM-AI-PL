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

export interface ValidationState {
  status: 'pending' | 'running' | 'success' | 'failed' | 'unvalidated';
  testsPassed?: number;
  testsTotal?: number;
  version?: string;
  hash?: string;
  filesGenerated?: string[];
  commandsReproduced?: string[];
  logs?: string;
}

export interface WsmDocument {
  title: string;
  content: string;
  format?: 'pdf' | 'md' | string;
  validation?: ValidationState;
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
}

export interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone?: string; // IANA timezone, e.g., 'America/Sao_Paulo'
  date?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  expirationDate?: string;
  isActive: boolean;
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt: Date;
}

export interface TaskExecution {
  id: string;
  runId?: string;
  taskId: string;
  taskTitle: string;
  executedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  triggerType?: 'manual' | 'scheduled' | 'event';
  sessionId: string;
  status: 'queued' | 'planning' | 'waiting_approval' | 'running' | 'waiting_user' | 'partial' | 'succeeded' | 'failed' | 'canceled' | 'expired';
  outputSummary?: string;
  error?: string;
  steps?: ExecutionStep[];
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
