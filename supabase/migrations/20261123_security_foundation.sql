-- Phase 1 security lockdown, part 1 (additive: nothing is taken away yet).
-- Every signed-in person only sees their own company's rows.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Who is calling. Only approved, active accounts count as a member of a company.
create or replace function private.my_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.company_id from public.app_users u
   where u.id = (select auth.uid()) and u.is_approved is true and u.is_active is not false
$$;

create or replace function private.is_director() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_users u
     where u.id = (select auth.uid()) and u.is_approved is true and u.is_active is not false and u.role = 'director'
  )
$$;

revoke all on function private.my_company_id() from public;
revoke all on function private.is_director() from public;
grant execute on function private.my_company_id() to authenticated, service_role;
grant execute on function private.is_director() to authenticated, service_role;

-- Password and security-answer data lives here, out of reach of the browser.
create table if not exists public.user_secrets (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  legacy_password_sha256 text,
  password_ci boolean not null default false,
  security_question text,
  security_answer_hash text,
  updated_at timestamptz not null default now()
);
alter table public.user_secrets enable row level security;
revoke all on public.user_secrets from anon, authenticated;

-- Failed sign-in attempts, for slowing down guessing.
create table if not exists public.auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_attempts_key_created_idx on public.auth_attempts (key, created_at);
alter table public.auth_attempts enable row level security;
revoke all on public.auth_attempts from anon, authenticated;

-- The login function fills these in from now on.
alter table public.app_users alter column password_hash drop not null;
alter table public.app_users alter column security_question drop not null;
alter table public.app_users alter column security_answer_hash drop not null;

alter table public.companies add column if not exists ms_consent_nonce text;

-- ---------- companies ----------
create policy company_select on public.companies for select to authenticated
  using (id = (select private.my_company_id()));
create policy company_update_director on public.companies for update to authenticated
  using (id = (select private.my_company_id()) and (select private.is_director()))
  with check (id = (select private.my_company_id()));

-- ---------- app_users ----------
create policy app_users_select on public.app_users for select to authenticated
  using (company_id = (select private.my_company_id()));
create policy app_users_update_director on public.app_users for update to authenticated
  using (company_id = (select private.my_company_id()) and (select private.is_director()))
  with check (company_id = (select private.my_company_id()));
-- Directors can reject a pending sign-up. Nobody can delete an approved or deactivated account from the browser.
create policy app_users_delete_pending on public.app_users for delete to authenticated
  using (company_id = (select private.my_company_id()) and (select private.is_director())
         and is_approved is not true and is_active is not false);

-- From the browser, nobody can move an account to another company or rename it.
create or replace function private.guard_app_users() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if new.id is distinct from old.id
       or new.company_id is distinct from old.company_id
       or new.company_code is distinct from old.company_code
       or new.username is distinct from old.username then
      raise exception 'That account detail cannot be changed here';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_app_users on public.app_users;
create trigger guard_app_users before update on public.app_users
  for each row execute function private.guard_app_users();

-- Removing an account also removes its sign-in.
create or replace function private.remove_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = old.id;
  return old;
end $$;
drop trigger if exists remove_auth_user on public.app_users;
create trigger remove_auth_user after delete on public.app_users
  for each row execute function private.remove_auth_user();

-- ---------- jobs and everything hanging off a job ----------
create policy jobs_company on public.jobs for all to authenticated
  using (company_id = (select private.my_company_id()))
  with check (company_id = (select private.my_company_id()));

create policy time_logs_company on public.time_logs for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = time_logs.job_id and j.company_id = (select private.my_company_id())))
  with check (exists (select 1 from public.jobs j where j.id = time_logs.job_id and j.company_id = (select private.my_company_id())));

create policy active_timers_company on public.active_timers for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = active_timers.job_id and j.company_id = (select private.my_company_id())))
  with check (exists (select 1 from public.jobs j where j.id = active_timers.job_id and j.company_id = (select private.my_company_id())));

create policy stage_notifications_company on public.stage_notifications for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = stage_notifications.job_id and j.company_id = (select private.my_company_id())))
  with check (exists (select 1 from public.jobs j where j.id = stage_notifications.job_id and j.company_id = (select private.my_company_id())));

-- ---------- company-wide tables ----------
create policy notifications_company on public.notifications for all to authenticated
  using (company_id = (select private.my_company_id()))
  with check (company_id = (select private.my_company_id()));
create policy bookings_company on public.bookings for all to authenticated
  using (company_id = (select private.my_company_id()))
  with check (company_id = (select private.my_company_id()));
create policy documents_company on public.documents for all to authenticated
  using (company_id = (select private.my_company_id()))
  with check (company_id = (select private.my_company_id()));

-- Profiles: everyone at the firm can read them. You edit your own; directors edit anyone's.
create policy planner_profiles_select on public.planner_profiles for select to authenticated
  using (company_id = (select private.my_company_id()));
create policy planner_profiles_insert on public.planner_profiles for insert to authenticated
  with check (company_id = (select private.my_company_id())
              and (user_id = (select auth.uid()) or (select private.is_director())));
create policy planner_profiles_update on public.planner_profiles for update to authenticated
  using (company_id = (select private.my_company_id())
         and (user_id = (select auth.uid()) or (select private.is_director())))
  with check (company_id = (select private.my_company_id()));
create policy planner_profiles_delete on public.planner_profiles for delete to authenticated
  using (company_id = (select private.my_company_id()) and (select private.is_director()));

-- xero_tokens, msgraph_tokens, calendar_connections, user_secrets, auth_attempts and planners
-- get no browser policy at all: only the server functions can touch them.

-- ---------- file storage ----------
-- New uploads go under a folder named after the company id. Older files are matched through the documents table.
create policy qplan_documents_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (
    (storage.foldername(name))[1] = (select private.my_company_id())::text
    or exists (select 1 from public.documents d where d.file_path = storage.objects.name and d.company_id = (select private.my_company_id()))
  ));
create policy qplan_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select private.my_company_id())::text);
create policy qplan_documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (
    (storage.foldername(name))[1] = (select private.my_company_id())::text
    or exists (select 1 from public.documents d where d.file_path = storage.objects.name and d.company_id = (select private.my_company_id()))
  ));
create policy qplan_templates_select on storage.objects for select to authenticated
  using (bucket_id = 'templates' and (select private.my_company_id()) is not null);
create policy qplan_avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (select private.my_company_id()) is not null);
create policy qplan_avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (select private.my_company_id()) is not null);
create policy qplan_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (select private.my_company_id()) is not null)
  with check (bucket_id = 'avatars' and (select private.my_company_id()) is not null);

-- ---------- Microsoft 365 admin approval ----------
-- The firm's Microsoft admin is often not a QPlan user, so this one call works without a login.
-- It only succeeds with the one-off code a director's approval link carries.
create or replace function public.record_ms_admin_consent(p_company_id uuid, p_nonce text, p_tenant text, p_by text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_nonce is null or length(p_nonce) < 16 then return false; end if;
  update public.companies
     set ms_tenant_id = nullif(left(coalesce(p_tenant, ''), 100), ''),
         ms_admin_consent_at = now(),
         ms_admin_consent_by = nullif(left(coalesce(p_by, ''), 100), '')
   where id = p_company_id and ms_consent_nonce = p_nonce;
  return found;
end $$;
revoke all on function public.record_ms_admin_consent(uuid, text, text, text) from public;
grant execute on function public.record_ms_admin_consent(uuid, text, text, text) to anon, authenticated, service_role;
