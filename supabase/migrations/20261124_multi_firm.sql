-- More than one firm
-- Everything that was really "HPC's" moves out of the app's code and into the firm's own
-- settings, so a second firm gets a clean start and never sees another firm's material.
--
--  1. Job numbers are unique per firm, not across QPlan.
--  2. firm_settings: each firm's service stages, fees, checklist items and template list.
--  3. Templates and profile photos are kept per firm in storage.
--  4. The master account remembers its home firm, so it can move between firms.
--  5. The shared job summary returns the firm's own stage names.
--  6. Job import batches (so an import can be undone as one).
--  7. client_errors: the app reports its own crashes.

-- ---------- 1. job numbers per firm ----------
alter table public.jobs drop constraint if exists jobs_code_key;
drop index if exists public.jobs_code_key;
create unique index if not exists jobs_company_code_key on public.jobs (company_id, code);
create index if not exists jobs_company_created_idx on public.jobs (company_id, created_at desc);

-- ---------- 2. firm settings ----------
create table if not exists public.firm_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  stage_label text,                 -- "HPC" gives a tab called "HPC Stages". Empty gives "Service Stages".
  stages jsonb,                     -- [{ id, label, shortLabel, defaultFee, description, items: [] }]. Empty = QPlan's standard three.
  templates jsonb,                  -- [{ stage, groups: [{ name, items: [{ file, label }] }] }]
  legacy_templates boolean not null default false,  -- template files sit at the top of the bucket (the first firm only)
  setup jsonb not null default '{}'::jsonb,         -- the new-firm checklist: what has been ticked off or hidden
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.firm_settings enable row level security;
revoke all on public.firm_settings from anon, authenticated;
grant select on public.firm_settings to authenticated;
grant insert (company_id, stage_label, stages, templates, setup, updated_at, updated_by) on public.firm_settings to authenticated;
-- company_id is in the list because saving is an "insert, or update if there". The row rule pins it to the firm.
grant update (company_id, stage_label, stages, templates, setup, updated_at, updated_by) on public.firm_settings to authenticated;

drop policy if exists firm_settings_select on public.firm_settings;
create policy firm_settings_select on public.firm_settings for select to authenticated
  using (company_id = (select private.my_company_id()));
drop policy if exists firm_settings_insert on public.firm_settings;
create policy firm_settings_insert on public.firm_settings for insert to authenticated
  with check (company_id = (select private.my_company_id()) and (select private.is_director()));
drop policy if exists firm_settings_update on public.firm_settings;
create policy firm_settings_update on public.firm_settings for update to authenticated
  using (company_id = (select private.my_company_id()) and (select private.is_director()))
  with check (company_id = (select private.my_company_id()));

-- Firms that exist today keep what they have. Their stages and template list are filled in
-- by 20261124_multi_firm_seed.sql, and their template files stay where they are.
insert into public.firm_settings (company_id, stage_label, legacy_templates, setup, updated_by)
select c.id, 'HPC', true, '{"hidden": true}'::jsonb, 'migration' from public.companies c
on conflict (company_id) do nothing;

-- ---------- 3. storage per firm ----------
-- Templates: a firm reads its own folder. The first firm's files sit at the top level.
drop policy if exists qplan_templates_select on storage.objects;
create policy qplan_templates_select on storage.objects for select to authenticated
  using (
    bucket_id = 'templates'
    and (select private.my_company_id()) is not null
    and (
      (storage.foldername(name))[1] = (select private.my_company_id())::text
      or (
        array_length(storage.foldername(name), 1) is null
        and exists (select 1 from public.firm_settings fs
                     where fs.company_id = (select private.my_company_id()) and fs.legacy_templates is true)
      )
    )
  );
drop policy if exists qplan_templates_insert on storage.objects;
create policy qplan_templates_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'templates' and (select private.is_director())
              and (storage.foldername(name))[1] = (select private.my_company_id())::text);
drop policy if exists qplan_templates_delete on storage.objects;
create policy qplan_templates_delete on storage.objects for delete to authenticated
  using (bucket_id = 'templates' and (select private.is_director())
         and (storage.foldername(name))[1] = (select private.my_company_id())::text);

-- Profile photos: into the firm's own folder. Photos saved before this keep their old name
-- (the person's id), and only that person or their firm's folder can replace them.
drop policy if exists qplan_avatars_insert on storage.objects;
create policy qplan_avatars_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and (select private.my_company_id()) is not null
    and ((storage.foldername(name))[1] = (select private.my_company_id())::text
         or name like (select auth.uid())::text || '.%')
  );
drop policy if exists qplan_avatars_update on storage.objects;
create policy qplan_avatars_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and (select private.my_company_id()) is not null
    and ((storage.foldername(name))[1] = (select private.my_company_id())::text
         or name like (select auth.uid())::text || '.%')
  )
  with check (
    bucket_id = 'avatars' and (select private.my_company_id()) is not null
    and ((storage.foldername(name))[1] = (select private.my_company_id())::text
         or name like (select auth.uid())::text || '.%')
  );
drop policy if exists qplan_avatars_select on storage.objects;
create policy qplan_avatars_select on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars' and (select private.my_company_id()) is not null
    and ((storage.foldername(name))[1] = (select private.my_company_id())::text
         or array_length(storage.foldername(name), 1) is null)
  );

-- ---------- 4. the master account can move between firms ----------
alter table public.app_users add column if not exists home_company_id uuid references public.companies(id);
update public.app_users set home_company_id = company_id where is_platform_admin is true and home_company_id is null;
comment on column public.app_users.home_company_id is
  'Master account only: the firm whose company code it signs in with. company_id is the firm it is looking at.';

create or replace function private.is_platform_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select exists (
    select 1 from public.app_users u
     where u.id = (select auth.uid()) and u.is_platform_admin is true
       and u.is_approved is true and u.is_active is not false
  )
$function$;
revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;

create or replace function private.guard_app_users()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null then
    if new.id is distinct from old.id
       or new.company_id is distinct from old.company_id
       or new.company_code is distinct from old.company_code
       or new.username is distinct from old.username
       or new.is_platform_admin is distinct from old.is_platform_admin
       or new.home_company_id is distinct from old.home_company_id then
      raise exception 'That account detail cannot be changed here';
    end if;
    if old.is_platform_admin is true
       and (new.role is distinct from old.role
            or new.is_approved is distinct from old.is_approved
            or new.is_active is distinct from old.is_active) then
      raise exception 'The master account cannot be changed here';
    end if;
  end if;
  return new;
end $function$;

-- ---------- 5. the shared job summary can show the firm's own stage names ----------
-- Fees are never sent from here.
create or replace function public.get_job_summary_stages(p_token text)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
           'stage_label', fs.stage_label,
           'stage_defs', (select jsonb_agg(s - 'defaultFee') from jsonb_array_elements(fs.stages) s))
    from public.jobs j
    join public.firm_settings fs on fs.company_id = j.company_id
   where p_token is not null and length(p_token) >= 20
     and j.share_token = p_token and jsonb_typeof(fs.stages) = 'array'
   limit 1
$function$;
revoke all on function public.get_job_summary_stages(text) from public;
grant execute on function public.get_job_summary_stages(text) to anon, authenticated;

-- ---------- 6. job imports ----------
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source text not null,             -- 'folders' or 'file'
  label text,                       -- the folder or file it came from
  job_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
alter table public.import_batches enable row level security;
revoke all on public.import_batches from anon, authenticated;
grant select, insert, update on public.import_batches to authenticated;
drop policy if exists import_batches_director on public.import_batches;
create policy import_batches_director on public.import_batches for all to authenticated
  using (company_id = (select private.my_company_id()) and (select private.is_director()))
  with check (company_id = (select private.my_company_id()) and (select private.is_director()));

alter table public.jobs add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;
alter table public.jobs add column if not exists imported_at timestamptz;
create index if not exists jobs_import_batch_idx on public.jobs (import_batch_id) where import_batch_id is not null;

-- ---------- 7. the app reports its own crashes ----------
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid,
  username text,
  page text,
  message text,
  detail text,
  url text,
  user_agent text,
  app_version text,
  created_at timestamptz not null default now()
);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;
grant select, insert, delete on public.client_errors to authenticated;
drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors for insert to authenticated
  with check (company_id = (select private.my_company_id()) and user_id = (select auth.uid()));
-- Only the QPlan master account reads them, across every firm
drop policy if exists client_errors_select on public.client_errors;
create policy client_errors_select on public.client_errors for select to authenticated
  using ((select private.is_platform_admin()));
drop policy if exists client_errors_delete on public.client_errors;
create policy client_errors_delete on public.client_errors for delete to authenticated
  using ((select private.is_platform_admin()));
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
