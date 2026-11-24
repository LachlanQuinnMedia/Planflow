-- Indexes the database adviser asked for. Every screen filters by firm or by job,
-- so these keep things quick as firms and jobs are added.
create index if not exists time_logs_job_id_idx on public.time_logs (job_id);
create index if not exists active_timers_job_id_idx on public.active_timers (job_id);
create index if not exists bookings_company_id_idx on public.bookings (company_id);
create index if not exists bookings_job_id_idx on public.bookings (job_id);
create index if not exists notifications_company_id_idx on public.notifications (company_id);
create index if not exists planner_profiles_company_id_idx on public.planner_profiles (company_id);
create index if not exists app_users_company_id_idx on public.app_users (company_id);
create index if not exists app_users_home_company_id_idx on public.app_users (home_company_id) where home_company_id is not null;
create index if not exists client_errors_company_id_idx on public.client_errors (company_id);
create index if not exists import_batches_company_id_idx on public.import_batches (company_id);
create index if not exists documents_job_id_idx on public.documents (job_id);
