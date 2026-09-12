// Shared AI types for ENG OSAMA Edge Functions.
// Provider-agnostic on purpose: nothing here should know which vendor is active.

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestOptions {
  messages: ChatMessage[];
  language: 'ar' | 'en';
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  ok: boolean;
  text: string;
  provider: string;
  model: string | null;
  fallback: boolean;
  reason?: string;
}
