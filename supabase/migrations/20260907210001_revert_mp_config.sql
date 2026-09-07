-- Revert: remove mp_config table and role column added in previous migration
drop table if exists public.mp_config;
alter table public.professionals drop column if exists role;
