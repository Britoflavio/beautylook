revoke execute on function public.availability_windows(uuid, date) from public;
revoke execute on function public.slot_fits_availability(uuid, timestamptz, int) from public;
revoke execute on function public.process_payment_confirmation(bigint, uuid) from public;
revoke execute on function public.release_expired_holds() from public;
revoke execute on function public.purge_old_hold_attempts() from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.guard_mp_columns() from public;

grant execute on function public.process_payment_confirmation(bigint, uuid) to service_role;
