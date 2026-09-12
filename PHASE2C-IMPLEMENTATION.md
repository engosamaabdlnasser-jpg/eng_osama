# ENG OSAMA — Phase 2C

Added a secure foundation for:

- AI summaries
- Suggested replies
- In-app notifications
- Telegram webhook boundary
- AI provider abstraction
- Prompt-injection isolation boundary
- Server-side notification idempotency

## Apply database migration

Run `supabase/V15-PHASE2C-AI-NOTIFICATIONS-TELEGRAM.sql` **after V13 and V14**.

## Edge Functions

Deploy:

- `supabase/functions/ai-support`
- `supabase/functions/telegram-webhook`

Required server-side secrets:

- `AI_PROVIDER`
- `AI_API_KEY` (when the selected provider needs it)
- `AI_MODEL`
- `TELEGRAM_WEBHOOK_SECRET`

Never place these secrets in `VITE_*` variables or browser code.

## Important scope boundary

This slice creates the protected data model and server boundaries. It does **not** claim that a live AI provider, Telegram account, or external notification delivery is configured. Those require explicit provider credentials, deployment, webhook configuration, and end-to-end tests in the real Supabase project.

Existing Phase 2B rate limiting remains active and is reused; it was not duplicated.
