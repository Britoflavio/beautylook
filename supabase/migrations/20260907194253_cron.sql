create extension if not exists pg_cron;

select cron.schedule(
  'release-expired-holds',
  '*/2 * * * *',
  $job$ select public.release_expired_holds(); $job$
);

select cron.schedule(
  'purge-old-hold-attempts',
  '0 3 * * *',
  $job$ select public.purge_old_hold_attempts(); $job$
);
