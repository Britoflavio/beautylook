-- Revert mp_config and role column
drop table if exists public.mp_config;
alter table public.professionals drop column if exists role;
