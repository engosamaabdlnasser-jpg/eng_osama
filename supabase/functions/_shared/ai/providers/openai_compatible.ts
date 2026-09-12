import type { ChatMessage, ChatResult } from '../types.ts';

// Works with any OpenAI-compatible /chat/completions endpoint — this is a
// deliberately generic adapter, not tied to one vendor. As of this writing,
// providers with a genuinely free tier that speak this exact API shape
// include Groq (api.groq.com/openai/v1) and OpenRouter (openrouter.ai/api/v1,
// using its ":free" model suffix). Swapping providers is an Edge Function
// secret change (AI_BASE_URL / AI_MODEL / AI_API_KEY) — no code change.
export async function callOpenAiCompatible(
  messages: ChatMessage[],
  opts: { baseUrl: string; apiKey: string; model: string; timeoutMs: number; maxOutputTokens: number },
): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const response = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        max_tokens: opts.maxOutputTokens,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, text: '', provider: 'openai_compatible', model: opts.model, fallback: true, reason: `provider_status_${response.status}` };
    }

    const data = await response.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, text: '', provider: 'openai_compatible', model: opts.model, fallback: true, reason: 'empty_response' };
    }

    return { ok: true, text: text.trim(), provider: 'openai_compatible', model: opts.model, fallback: false };
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network_error';
    return { ok: false, text: '', provider: 'openai_compatible', model: opts.model, fallback: true, reason };
  } finally {
    clearTimeout(timer);
  }
}
