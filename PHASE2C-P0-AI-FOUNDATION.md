# ENG OSAMA — Phase 2C, Slice P0: Real AI Assistant Foundation

Replaces the hardcoded keyword-matcher in the assistant chat with a real,
server-side AI call. Does not touch the existing human support system
(`conversations`, `conversation_messages`, RLS, triggers, retention,
audit logging) in any way — that system was already correct and is reused
as-is.

## What changed

- **New**: `supabase/functions/_shared/ai/` — provider-agnostic chat
  abstraction (`types.ts`, `provider.ts`, `fallback.ts`,
  `providers/openai_compatible.ts`). `ai-support` (Phase 2C's earlier,
  admin-facing summary/suggested-replies function) is untouched; it can
  adopt this same abstraction in a later slice (P4).
- **New**: `supabase/functions/ai-chat/index.ts` — the student-facing
  educational assistant endpoint. Verifies the caller's Supabase JWT,
  sanitizes input, enforces server-side rate limiting, calls the provider
  abstraction, and always returns a safe, friendly fallback instead of an
  error when no provider is configured.
- **New**: `supabase/V16-PHASE2C-AI-CHAT-FOUNDATION.sql` — one additive
  table, `ai_chat_requests`, used only for server-side rate limiting.
  No client role can read or write it (default-deny RLS); only the
  Edge Function's service-role client touches it.
- **Changed**: `src/components/AssistantBot.tsx` — the `answer()` keyword
  matcher is gone. Sending a message now calls the `ai-chat` function and
  renders a real reply, a "typing" state while waiting, and a retry action
  on failure. The existing human-handoff redirect (if a support
  conversation is already active, the message goes to Support instead of
  the AI) is unchanged.
- **Changed**: `src/i18n.tsx` — added `assistant.thinking`, `assistant.retry`,
  `assistant.replyError`, `assistant.offline` in Arabic and English.
- **Changed**: `src/styles/global.css` — one small rule for the new retry
  action, reusing existing color tokens. No layout, color, or brand change.

## Explicitly out of scope for this slice (by design, see approval doc)

- Course/lesson/page context (Phase 2C P1)
- Persistent conversation memory across reloads / summarization (P2)
- Wiring the AI into the human-handoff state machine itself, and the
  server-side `HUMAN_ACTIVE` auto-reply block (P3) — today the AI chat and
  the support conversation are still two separate systems, so there is
  nothing for the AI to auto-send into a human conversation yet. The
  client-side redirect that already existed (if a support conversation is
  active, route the message to Support) still works, but is not yet a
  server-side guarantee. That must be added when P3 merges the two flows.
- AI Summary / Suggested Replies for admins (P4)
- Telegram (explicitly deprioritized per approval doc)

## Required Edge Function secrets

See `supabase/functions/ai-chat/README.md`. Nothing is required for the
app to keep working — with no secrets set, students see a friendly
"assistant not available, try Support" message instead of a broken chat.

## Manual steps required in Supabase (none of this was run by the assistant)

1. Run `supabase/V16-PHASE2C-AI-CHAT-FOUNDATION.sql` against the project,
   after confirming V2–V15 are already applied (**not independently
   verified in this session** — see the audit's Part 19).
2. Deploy the Edge Function: `supabase functions deploy ai-chat`.
3. Optionally set `AI_PROVIDER` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`
   secrets to enable real replies (see the function's README for current
   free-tier options).

## Status

`BUILD NOT RUN` and `SQL NOT EXECUTED` in the assistant's sandbox — see the
delivery report for exact reasons and what to run yourself before trusting
this in production.
