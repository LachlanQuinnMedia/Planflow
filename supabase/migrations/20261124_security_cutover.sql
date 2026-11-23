-- Phase 1 security lockdown, part 2 (the switch).
-- After this, the public key on its own can read nothing. Run only once the new app is live.

-- 1. Password and security-answer data moves out of app_users, where the browser could read it.
insert into public.user_secrets (user_id, legacy_password_sha256, password_ci, security_question, security_answer_hash)
select id, password_hash, true, security_question,
       case when security_answer_hash is not null then 'sha256$' || security_answer_hash end
  from public.app_users
 where password_hash is not null
on conflict (user_id) do nothing;

alter table public.app_users
  drop column password_hash,
  drop column security_question,
  drop column security_answer_hash;

-- 2. Remove the "anyone can do anything" rules.
drop policy if exists "Allow all" on public.active_timers;
drop policy if exists "Allow all" on public.app_users;
drop policy if exists "Allow all" on public.bookings;
drop policy if exists "Allow all on calendar_connections" on public.calendar_connections;
drop policy if exists "Allow all" on public.companies;
drop policy if exists "Allow all on documents" on public.documents;
drop policy if exists "Allow all" on public.jobs;
drop policy if exists "Allow all" on public.notifications;
drop policy if exists "Allow all" on public.planner_profiles;
drop policy if exists "Allow all" on public.planners;
drop policy if exists "Allow all" on public.stage_notifications;
drop policy if exists "Allow all" on public.time_logs;
drop policy if exists "Allow all" on public.xero_tokens;
drop policy if exists "Allow all on documents bucket" on storage.objects;
drop policy if exists "Allow all on avatars" on storage.objects;

-- 3. Uploaded documents and templates are no longer reachable by web address alone.
update storage.buckets set public = false where id in ('documents', 'templates');

-- 4. Table permissions. Someone who is not signed in gets nothing at all.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Connection keys, password data and the unused planners table: server functions only.
revoke all on public.xero_tokens, public.msgraph_tokens, public.calendar_connections,
              public.planners, public.user_secrets, public.auth_attempts from authenticated;

-- Staff can read their company's name and Microsoft approval status, not its sign-up codes.
revoke all on public.companies from authenticated;
grant select (id, name, created_at, director_emails, ms_tenant_id, ms_admin_consent_at, ms_admin_consent_by, ms_consent_nonce)
  on public.companies to authenticated;
grant update (director_emails, ms_tenant_id, ms_admin_consent_at, ms_admin_consent_by, ms_consent_nonce)
  on public.companies to authenticated;

-- 5. Functions.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.get_job_summary(text) from public;
grant execute on function public.get_job_summary(text) to anon, authenticated, service_role;
