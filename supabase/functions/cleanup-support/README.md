# Support cleanup Edge Function

Deploy this function in the Supabase project and invoke it from the project's supported scheduler (for example Supabase Cron/pg_cron if enabled). It calls the protected `cleanup_expired_support_conversations` RPC using the server-only `SUPABASE_SERVICE_ROLE_KEY`.

Do not expose the service-role key to Vercel/frontend code or commit it to Git.
