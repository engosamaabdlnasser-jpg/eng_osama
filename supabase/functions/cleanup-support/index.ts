import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return new Response('Server configuration error', { status: 500 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('cleanup_expired_support_conversations', { p_batch_size: 100 });
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });

  return new Response(JSON.stringify({ ok: true, deleted: Number(data ?? 0) }), { headers: { 'content-type': 'application/json' } });
});
