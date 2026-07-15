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

export interface WsmDocument {
  title: string;
  content: string;
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
  attachments?: {
    name: string;
    type: 'image' | 'video' | 'audio' | 'document';
    size: number;
    url: string;
    mimeType?: string;
    base64?: string;
  }[];
}

export interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
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
  taskId: string;
  taskTitle: string;
  executedAt: Date;
  sessionId: string;
  status: 'success' | 'error';
  error?: string;
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
  model?: string;
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
