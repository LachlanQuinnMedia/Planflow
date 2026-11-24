-- What QPlan remembers about one person, kept on their account so it follows them to any
-- device: which tutorials they have finished, and when they last opened Notifications at
-- each firm. Before this it lived in the browser, so every new device forgot it.
--
-- One row per person. A person can only ever read or change their own row.

create table if not exists public.user_state (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  tours_done jsonb not null default '{}'::jsonb,          -- { "director": "<when>", "staff": "<when>" }
  notifications_seen jsonb not null default '{}'::jsonb,  -- { "<company id>": "<when>" }
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists user_state_select_own on public.user_state;
create policy user_state_select_own on public.user_state
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists user_state_insert_own on public.user_state;
create policy user_state_insert_own on public.user_state
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists user_state_update_own on public.user_state;
create policy user_state_update_own on public.user_state
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.user_state from anon, authenticated;
grant select, insert, update on public.user_state to authenticated;

-- The master account has already done the tutorial and read its notifications, on several devices.
insert into public.user_state (user_id, tours_done, notifications_seen)
select u.id, jsonb_build_object('director', now()), jsonb_build_object(u.company_id::text, now())
from public.app_users u where u.is_platform_admin is true
on conflict (user_id) do nothing;
