export interface ProviderConfig {
  id: string;
  name: string;
  protocol: 'openai' | 'anthropic' | 'gemini' | 'custom' | 'suno' | string;
  baseUrl: string;
  apiKey?: string;
  models?: string[];
}

export interface ModelOption {
  key: string;
  providerId?: string;
  protocol?: string;
  baseUrl?: string;
  provider: ProviderConfig;
  model: string;
  label?: string;
}

export interface SubtitleLine {
  id?: string;
  text: string;
  speaker?: string;
  kind?: 'dialogue' | 'scene' | string;
  language?: 'en' | 'es' | 'zh' | string;
  sourceLine?: number;
}

export interface ScriptDraft {
  title: string;
  script: string;
  hint?: string;
  customKeywords?: string;
  subtitleLanguage?: 'auto' | 'en' | 'es' | 'zh';
  geminiKey?: string;
  libraryGeminiKey?: string;
  sunoKey?: string;
  segmented?: boolean;
  segmentCount?: number;
  durationSeconds?: number | string;
}

export interface WorkspaceTab {
  id: 'all' | 'editor' | 'library' | 'queue';
  label: string;
  badge?: string | number;
}
