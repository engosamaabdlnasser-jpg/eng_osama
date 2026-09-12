-- ENG OSAMA — Phase 2B
-- Security foundation for human support: input validation, rate limiting and audit trail.
-- Run once after V13-HUMAN-SUPPORT-FOUNDATION.sql.

create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_logs_created_idx
  on public.security_audit_logs(created_at desc);
create index if not exists security_audit_logs_actor_idx
  on public.security_audit_logs(actor_id, created_at desc);
create index if not exists security_audit_logs_entity_idx
  on public.security_audit_logs(entity_type, entity_id, created_at desc);

alter table public.security_audit_logs enable row level security;
drop policy if exists "admins read security audit logs" on public.security_audit_logs;
create policy "admins read security audit logs"
on public.security_audit_logs for select to authenticated
using (public.is_admin());

-- No client role receives INSERT/UPDATE/DELETE access to audit logs.
revoke all on public.security_audit_logs from anon, authenticated;
grant select on public.security_audit_logs to authenticated;

create or replace function public.validate_support_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minute_count integer;
  v_day_count integer;
begin
  if new.sender_role in ('student', 'admin') then
    if nullif(trim(new.body), '') is null then
      raise exception 'Message cannot be empty';
    end if;
    if char_length(new.body) > 8000 then
      raise exception 'Message is too long';
    end if;
    if new.body ~ '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]' then
      raise exception 'Message contains unsupported control characters';
    end if;
  end if;

  -- Only student traffic is rate limited here. Admin replies must remain available.
  if new.sender_role = 'student' then
    select count(*) into v_minute_count
    from public.conversation_messages
    where sender_id = new.sender_id
      and sender_role = 'student'
      and created_at >= now() - interval '1 minute';

    select count(*) into v_day_count
    from public.conversation_messages
    where sender_id = new.sender_id
      and sender_role = 'student'
      and created_at >= now() - interval '1 day';

    if v_minute_count >= 10 then
      raise exception 'Too many messages. Please wait a minute and try again.';
    end if;
    if v_day_count >= 100 then
      raise exception 'Daily message limit reached. Please try again later.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_support_message on public.conversation_messages;
create trigger validate_support_message
before insert on public.conversation_messages
for each row execute function public.validate_support_message();

create or replace function public.write_support_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'conversations' then
    if old.status is distinct from new.status then
      insert into public.security_audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'conversation.status_changed', 'conversation', new.id,
        jsonb_build_object('from', old.status, 'to', new.status));
    end if;
    if old.assigned_admin_id is distinct from new.assigned_admin_id then
      insert into public.security_audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'conversation.assignment_changed', 'conversation', new.id,
        jsonb_build_object('from', old.assigned_admin_id, 'to', new.assigned_admin_id));
    end if;
    if old.retention_exempt is distinct from new.retention_exempt then
      insert into public.security_audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'conversation.retention_exemption_changed', 'conversation', new.id,
        jsonb_build_object('enabled', new.retention_exempt));
    end if;
  elsif tg_table_name = 'conversation_messages' then
    insert into public.security_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (new.sender_id, 'conversation.message_created', 'conversation_message', new.id,
      jsonb_build_object('conversation_id', new.conversation_id, 'sender_role', new.sender_role));
  end if;
  return new;
end;
$$;

drop trigger if exists audit_conversation_changes on public.conversations;
create trigger audit_conversation_changes
after update on public.conversations
for each row execute function public.write_support_audit_log();

drop trigger if exists audit_conversation_messages on public.conversation_messages;
create trigger audit_conversation_messages
after insert on public.conversation_messages
for each row execute function public.write_support_audit_log();

-- Explicitly keep the audit writer server-side only.
revoke all on function public.write_support_audit_log() from public, anon, authenticated;
revoke all on function public.validate_support_message() from public, anon, authenticated;

comment on table public.security_audit_logs is
  'Server-generated audit trail for sensitive support actions; readable by admins only.';
