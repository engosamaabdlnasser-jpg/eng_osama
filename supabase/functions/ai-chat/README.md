# ai-chat Edge Function

Real, server-side educational assistant chat for students. Replaces the old
client-only keyword matcher in `src/components/AssistantBot.tsx`.

## Required Edge Function secrets

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
provided automatically by the Supabase Edge Runtime — do not set them
yourself.

To actually enable AI replies, set these (Supabase Dashboard → Edge
Functions → Secrets, or `supabase secrets set KEY=value`):

```
AI_PROVIDER=openai_compatible
AI_BASE_URL=https://api.groq.com/openai/v1     # or any OpenAI-compatible endpoint
AI_API_KEY=your-provider-api-key
AI_MODEL=llama-3.3-70b-versatile                # or your provider's free model name
```

If `AI_PROVIDER` is unset or left as `disabled` (the default), the function
returns a friendly "assistant not available, try Support" message instead
of an error — the app keeps working with zero AI configuration.

**Never** put any of the `AI_*` values in `.env` / Vite env / the frontend
bundle / Git. They belong only in Edge Function secrets.

## Free-tier providers (verified at time of writing)

Any endpoint that implements the OpenAI `/chat/completions` shape works
without code changes — just change the three secrets above. Two providers
with a currently-free, no-credit-card tier that speak this exact API:

- **Groq** — `https://api.groq.com/openai/v1`, free tier reported around
  30 requests/minute — get a key at console.groq.com.
- **OpenRouter** — `https://openrouter.ai/api/v1`, offers 25+ free models
  (model names ending in `:free`) — get a key at openrouter.ai/keys.

Free-tier limits and terms change; re-check the provider's own docs before
relying on a specific number. Nothing in this project requires a paid plan.

## Deploy

```bash
supabase functions deploy ai-chat
```

## What this function does NOT do yet

- It does not know the student's current course/lesson (Phase 2C P1).
- It does not persist conversation history across page reloads (Phase 2C P2).
- It is not yet wired into the human-support handoff (Phase 2C P3).

These are intentionally out of scope for this change — see
`PHASE2C-P0-AI-FOUNDATION.md` at the project root for the full P0 report.
