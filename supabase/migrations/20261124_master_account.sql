-- Master account
-- One QPlan-level account (the founder's) that is not a planner at any firm.
--  * Staff at a firm never see it in lists and cannot change or remove it.
--  * It always counts as a director.
--  * The flag can only be set from the database, never from the app.

alter table public.app_users
  add column if not exists is_platform_admin boolean not null default false;

comment on column public.app_users.is_platform_admin is
  'QPlan master account. Hidden from firm staff lists. Set from the database only.';

do $$
declare n int;
begin
  update public.app_users set is_platform_admin = true
   where lower(username) = 'lachlan quinn' and role = 'director' and is_approved is true;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Expected exactly one master account, found %', n;
  end if;
end $$;

-- The master account is always a director
create or replace function private.is_director()
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select exists (
    select 1 from public.app_users u
     where u.id = (select auth.uid()) and u.is_approved is true and u.is_active is not false
       and (u.role = 'director' or u.is_platform_admin is true)
  )
$function$;

-- Nobody can hand out, remove or alter the master account from the app
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
       or new.is_platform_admin is distinct from old.is_platform_admin then
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

-- Firm staff do not see the master account. It still sees its own row.
alter policy app_users_select on public.app_users
  using (
    company_id = (select private.my_company_id())
    and (is_platform_admin is not true or id = (select auth.uid()))
  );

alter policy app_users_update_director on public.app_users
  using (
    company_id = (select private.my_company_id())
    and (select private.is_director())
    and (is_platform_admin is not true or id = (select auth.uid()))
  );

alter policy app_users_delete_pending on public.app_users
  using (
    company_id = (select private.my_company_id())
    and (select private.is_director())
    and is_approved is not true
    and is_active is not false
    and is_platform_admin is not true
  );
