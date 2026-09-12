import type { ChatResult } from './types.ts';

// Shown to the student whenever the assistant cannot produce a real answer —
// missing configuration, provider timeout, provider error, or an unknown
// provider name. Never an HTTP error page; always a calm, honest message
// that points them at Support instead.
const FALLBACK_TEXT: Record<'ar' | 'en', string> = {
  ar: 'المساعد الذكي غير متاح حاليًا. جرّب مرة أخرى بعد قليل، أو اضغط على "دعم" للتواصل مع فريق الدعم.',
  en: 'The AI assistant is not available right now. Please try again shortly, or press "Support" to reach our team.',
};

export function safeFallback(language: 'ar' | 'en', reason: string): ChatResult {
  return {
    ok: false,
    text: FALLBACK_TEXT[language] ?? FALLBACK_TEXT.en,
    provider: 'disabled',
    model: null,
    fallback: true,
    reason,
  };
}
