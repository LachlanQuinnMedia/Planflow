-- The Monday email, and signed Calendly bookings.

-- A Calendly connection made from now on is registered with a signing key, and bookings
-- for it are only accepted with a valid signature. Older connections keep working as before
-- until that person connects Calendly again.
alter table public.calendar_connections add column if not exists webhook_signed boolean not null default false;

-- Settings only the server reads. No rules are added, so nobody signed in can read or write it.
create table if not exists public.server_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.server_settings enable row level security;
revoke all on public.server_settings from anon, authenticated;

-- The schedule: every Monday 7:00am Brisbane (Sunday 21:00 UTC) the database calls the
-- weekly-digest function with a key only the database holds. The function keeps a
-- fingerprint of that key, not the key itself.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

do $$
declare k text;
begin
  if not exists (select 1 from vault.secrets where name = 'weekly_digest_key') then
    k := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(k, 'weekly_digest_key', 'Key the Monday email schedule sends to the weekly-digest function');
    insert into public.server_settings (key, value)
    values ('weekly_digest_key_sha256', encode(extensions.digest(k, 'sha256'), 'hex'))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname = 'qplan-weekly-digest';
select cron.schedule(
  'qplan-weekly-digest',
  '0 21 * * 0',
  $cron$
  select net.http_post(
    url := 'https://sltaaiumviyzgdsdkkbe.supabase.co/functions/v1/weekly-digest?action=run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-key', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_digest_key')
    ),
    body := '{}'::jsonb
  )
  $cron$
);
