// Phase 2C: Telegram webhook boundary. Keep bot token in Edge Function secrets.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const expected = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  const received = request.headers.get('x-telegram-bot-api-secret-token');
  if (!expected || !received || received !== expected) return json({ error: 'Unauthorized' }, 401);
  let update: unknown;
  try { update = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  // Do not trust Telegram text as commands or SQL. Map/link identities only through
  // a server-side verified flow before creating support messages.
  return json({ ok: true, accepted: Boolean(update) });
});
