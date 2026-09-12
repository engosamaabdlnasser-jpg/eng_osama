// Phase 2C: provider-agnostic AI boundary.
// This function intentionally does not trust conversation text as instructions.
// Configure AI_PROVIDER, AI_API_KEY and AI_MODEL as server-side Edge Function secrets.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max) : '';

serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  let payload: { task?: string; language?: string; messages?: Array<{ role?: string; body?: string }> };
  try { payload = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-20).map(item => ({
    role: item.role === 'admin' ? 'admin' : item.role === 'student' ? 'student' : 'system',
    body: clean(item.body, 4000),
  })) : [];
  const task = payload.task === 'suggested_replies' ? 'suggested_replies' : 'summary';
  const language = payload.language === 'en' ? 'en' : 'ar';
  const provider = Deno.env.get('AI_PROVIDER') ?? 'disabled';

  // Deliberate isolation: conversation content is data, never a system instruction.
  const protectedInput = JSON.stringify({ task, language, messages });
  if (provider === 'disabled') return json({ provider: 'disabled', task, result: null, reason: 'AI provider is not configured' }, 503);

  // Provider adapter is intentionally kept behind this boundary. No provider key is
  // returned to the browser and no raw prompt is accepted from the client.
  return json({ provider, task, result: null, pending: true, protected_input_bytes: protectedInput.length }, 202);
});
