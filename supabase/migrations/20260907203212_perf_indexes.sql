-- M7 perf pass: missing indexes + RLS audit notes
-- RLS: verified default deny for anon, owner-scoped policies only, SECURITY DEFINER RPCs for anon.
-- No additional RLS changes needed; see docs/rls-audit.md

create index if not exists bookings_payment_id_idx on public.bookings (payment_id);
create index if not exists bookings_professional_status_idx on public.bookings (professional_id, status);
create index if not exists bookings_hold_expires_idx on public.bookings (hold_expires_at) where status in ('held', 'pending_payment');
create index if not exists refunds_status_idx on public.refunds (status);
create index if not exists refunds_booking_payment_idx on public.refunds (booking_id, payment_id);
create index if not exists payment_events_processed_idx on public.payment_events (processed) where not processed;

