import type { ChatRequestOptions, ChatResult } from './types.ts';
import { safeFallback } from './fallback.ts';
import { callOpenAiCompatible } from './providers/openai_compatible.ts';

// Single entry point for every AI Edge Function. Nothing outside this file
// should know which provider is configured. Configure via Edge Function
// secrets (never Vite/browser env):
//   AI_PROVIDER   = "disabled" (default, safe) | "openai_compatible"
//   AI_BASE_URL   = e.g. https://api.groq.com/openai/v1
//   AI_API_KEY    = provider key
//   AI_MODEL      = provider model name
//
// Adding a second provider shape later means adding one more `if` block
// here and one more file under providers/ — nothing else in the app changes.
export async function generateChatReply(opts: ChatRequestOptions): Promise<ChatResult> {
  const provider = Deno.env.get('AI_PROVIDER') ?? 'disabled';

  if (provider === 'disabled') {
    return safeFallback(opts.language, 'provider_disabled');
  }

  if (provider === 'openai_compatible') {
    const baseUrl = Deno.env.get('AI_BASE_URL');
    const apiKey = Deno.env.get('AI_API_KEY');
    const model = Deno.env.get('AI_MODEL');
    if (!baseUrl || !apiKey || !model) {
      return safeFallback(opts.language, 'provider_misconfigured');
    }
    const result = await callOpenAiCompatible(opts.messages, {
      baseUrl,
      apiKey,
      model,
      timeoutMs: opts.timeoutMs ?? 20000,
      maxOutputTokens: opts.maxOutputTokens ?? 700,
    });
    return result.ok ? result : safeFallback(opts.language, result.reason ?? 'provider_error');
  }

  return safeFallback(opts.language, 'unknown_provider');
}
