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
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  category?: 'write' | 'code' | 'image' | 'analysis' | 'translate' | 'general';
}
