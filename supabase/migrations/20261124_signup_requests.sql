-- Firms asking for access from the public sales page. Only the server can read or write this.
create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  firm_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  team_size text,
  message text,
  status text not null default 'new'
);
alter table public.signup_requests enable row level security;
revoke all on public.signup_requests from anon, authenticated;
