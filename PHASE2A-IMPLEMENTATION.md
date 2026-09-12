# ENG OSAMA — Phase 2A Foundation

This phase adds the production foundation for Human Support without removing the existing V12 `support_requests` table.

## Apply

1. Keep the existing V12 SQL applied.
2. Run `supabase/V13-HUMAN-SUPPORT-FOUNDATION.sql` once in the Supabase SQL Editor.
3. Deploy `supabase/functions/cleanup-support` as a Supabase Edge Function.
4. Configure a supported server-side scheduler to invoke the cleanup function at least hourly. The migration does **not** assume `pg_cron` is enabled because that differs by project/environment.

## Retention semantics

- Default human-support retention: 72 hours.
- Admin can change the value from the existing site settings UI (24h, 48h, 72h, 7d, 14d, 30d, Never).
- The timer starts when an admin resolves/closes a conversation.
- Active conversations are never eligible for cleanup.
- A student reply to a closed/retention-pending conversation reopens the same conversation and clears the timer.
- `retention_exempt` removes the conversation from automatic deletion.
- Cleanup is batch-based and uses row locking to avoid competing workers deleting the same records.

## Security

Student conversation creation happens through a server-side SECURITY DEFINER RPC. Student RLS only exposes the student's own conversations/messages. Admin actions require `public.is_admin()`. The service role is restricted to the cleanup RPC.

## Phase 2A scope

Implemented: persistent conversations/messages, human handoff foundation, Admin support inbox, server-side accept, admin replies, Realtime subscriptions, retention state, cleanup function, and migration of existing support requests.

Not yet implemented: automatic assignment strategies, admin presence/max concurrency, typing/read receipts, saved replies, AI summary/provider/tools, notifications, Telegram, rate limiting, and prompt-injection/tool isolation. Those remain later Phase 2 slices.
