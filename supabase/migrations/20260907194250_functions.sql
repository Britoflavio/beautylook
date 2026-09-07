-- Internal helpers (execution revoked from anon/authenticated below)

create or replace function public.availability_windows(p_pro uuid, p_date date)
returns table (start_ts timestamptz, end_ts timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select
    (p_date + r.start_time) at time zone 'America/Argentina/Buenos_Aires',
    (p_date + r.end_time) at time zone 'America/Argentina/Buenos_Aires'
  from public.availability_rules r
  where r.professional_id = p_pro
    and r.weekday = extract(dow from p_date)::int
    and not exists (
      select 1
      from public.availability_exceptions e
      where e.professional_id = p_pro and e.date = p_date
    )
  union all
  select
    (p_date + e.start_time) at time zone 'America/Argentina/Buenos_Aires',
    (p_date + e.end_time) at time zone 'America/Argentina/Buenos_Aires'
  from public.availability_exceptions e
  where e.professional_id = p_pro
    and e.date = p_date
    and not e.is_full_day_off;
$$;

create or replace function public.slot_fits_availability(
  p_pro uuid,
  p_starts_at timestamptz,
  p_duration_min int
) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    p_starts_at >= now() + interval '60 minutes'
    and p_starts_at <= now() + interval '60 days'
    and extract(
      minute from p_starts_at at time zone 'America/Argentina/Buenos_Aires'
    )::int % 15 = 0
    and extract(second from p_starts_at) = 0
    and exists (
      select 1
      from public.availability_windows(
        p_pro,
        (p_starts_at at time zone 'America/Argentina/Buenos_Aires')::date
      ) w
      where w.start_ts <= p_starts_at
        and w.end_ts >= p_starts_at + make_interval(mins => p_duration_min)
    );
$$;

-- Public RPCs (anon-accessible)

create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (select 1 from public.professionals where slug = p_slug);
$$;

create or replace function public.get_public_profile(p_slug text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'slug', p.slug,
    'display_name', p.display_name,
    'category', p.category,
    'address', p.address,
    'city', p.city,
    'bio', p.bio,
    'photo_url', p.photo_url,
    'accepts_payments', p.mp_status = 'connected',
    'phone_whatsapp', p.phone_whatsapp,
    'cancellation_policy_hours', p.cancellation_policy_hours,
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'duration_min', s.duration_min,
          'price', s.price
        ) order by s.sort_order, s.created_at
      )
      from public.services s
      where s.professional_id = p.id and s.is_active
    ), '[]'::jsonb)
  )
  from public.professionals p
  where p.slug = p_slug;
$$;

create or replace function public.get_available_slots(
  p_slug text,
  p_service_id uuid,
  p_date date
) returns table (slot_start timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_pro_id uuid;
  v_duration_min int;
begin
  select p.id into v_pro_id from public.professionals p where p.slug = p_slug;
  if v_pro_id is null then
    return;
  end if;

  select s.duration_min into v_duration_min
  from public.services s
  where s.id = p_service_id and s.professional_id = v_pro_id and s.is_active;
  if v_duration_min is null then
    return;
  end if;

  return query
  select g
  from public.availability_windows(v_pro_id, p_date) w,
       generate_series(
         w.start_ts,
         w.end_ts - make_interval(mins => v_duration_min),
         interval '15 minutes'
       ) g
  where g >= now() + interval '60 minutes'
    and g <= now() + interval '60 days'
    and not exists (
      select 1
      from public.bookings b
      where b.professional_id = v_pro_id
        and b.status in ('held', 'pending_payment', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)')
          && tstzrange(g, g + make_interval(mins => v_duration_min), '[)')
    );
end;
$$;

create or replace function public.get_booking_status(p_booking_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'status', b.status,
    'starts_at', b.starts_at,
    'ends_at', b.ends_at,
    'amount', b.amount,
    'currency', b.currency,
    'client_name', b.client_name,
    'hold_expires_at', b.hold_expires_at,
    'cancelled_by', b.cancelled_by,
    'cancel_reason', b.cancel_reason,
    'payment_id', b.payment_id,
    'service_name', s.name,
    'service_duration_min', s.duration_min,
    'professional_name', p.display_name,
    'professional_slug', p.slug,
    'professional_photo_url', p.photo_url,
    'professional_phone', p.phone_whatsapp,
    'professional_address', p.address,
    'cancellation_policy_hours', p.cancellation_policy_hours
  )
  from public.bookings b
  join public.professionals p on p.id = b.professional_id
  join public.services s on s.id = b.service_id
  where b.id = p_booking_id;
$$;

create or replace function public.create_booking_hold(
  p_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_ip text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pro public.professionals%rowtype;
  v_service public.services%rowtype;
  v_ip_hash text;
  v_ip_attempts int;
  v_active_other_pros int;
  v_booking_id uuid;
begin
  v_ip_hash := encode(
    extensions.digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex'
  );

  insert into public.hold_attempts (ip_hash, phone)
  values (v_ip_hash, p_client_phone);

  select count(*) into v_ip_attempts
  from public.hold_attempts
  where ip_hash = v_ip_hash and created_at > now() - interval '1 hour';
  if v_ip_attempts > 10 then
    return jsonb_build_object('error', 'RATE_LIMITED');
  end if;

  select * into v_pro from public.professionals where slug = p_slug;
  if v_pro.id is null then
    return jsonb_build_object('error', 'PROFESSIONAL_NOT_FOUND');
  end if;
  if v_pro.mp_status <> 'connected' then
    return jsonb_build_object('error', 'PAYMENT_UNAVAILABLE');
  end if;

  select * into v_service from public.services
  where id = p_service_id and professional_id = v_pro.id and is_active;
  if v_service.id is null then
    return jsonb_build_object('error', 'SERVICE_NOT_FOUND');
  end if;
  if v_service.price <= 0 then
    return jsonb_build_object('error', 'SERVICE_INVALID');
  end if;

  if char_length(trim(p_client_name)) < 2 then
    return jsonb_build_object('error', 'INVALID_CLIENT');
  end if;
  if p_client_phone !~ '^\+549[0-9]{8,10}$' then
    return jsonb_build_object('error', 'INVALID_PHONE');
  end if;

  select count(*) into v_active_other_pros
  from public.bookings
  where client_phone = p_client_phone
    and professional_id <> v_pro.id
    and status in ('held', 'pending_payment')
    and hold_expires_at > now();
  if v_active_other_pros >= 3 then
    return jsonb_build_object('error', 'TOO_MANY_HOLDS');
  end if;

  if not public.slot_fits_availability(v_pro.id, p_starts_at, v_service.duration_min)
  then
    return jsonb_build_object('error', 'SLOT_UNAVAILABLE');
  end if;

  begin
    insert into public.bookings (
      professional_id, service_id, client_name, client_phone, client_email,
      starts_at, ends_at, status, hold_expires_at, amount, currency
    ) values (
      v_pro.id, v_service.id, trim(p_client_name), p_client_phone,
      nullif(trim(coalesce(p_client_email, '')), ''),
      p_starts_at,
      p_starts_at + make_interval(mins => v_service.duration_min),
      'held',
      now() + interval '25 minutes',
      v_service.price,
      'ARS'
    )
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('error', 'SLOT_TAKEN');
  end;

  update public.bookings
  set status = 'cancelled',
      cancelled_by = 'system',
      cancel_reason = 'superseded',
      updated_at = now()
  where client_phone = p_client_phone
    and professional_id = v_pro.id
    and id <> v_booking_id
    and status in ('held', 'pending_payment');

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'amount', v_service.price,
    'hold_expires_at', now() + interval '25 minutes'
  );
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_policy_hours int;
  v_refund_due boolean := false;
begin
  if p_actor not in ('client', 'professional') then
    return jsonb_build_object('error', 'INVALID_ACTOR');
  end if;

  select * into v_booking from public.bookings
  where id = p_booking_id for update;
  if v_booking.id is null then
    return jsonb_build_object('error', 'BOOKING_NOT_FOUND');
  end if;

  if p_actor = 'professional' then
    if auth.uid() is null or auth.uid() <> v_booking.professional_id then
      return jsonb_build_object('error', 'FORBIDDEN');
    end if;
    v_refund_due := v_booking.status = 'confirmed';
  elsif v_booking.status = 'confirmed' then
    select cancellation_policy_hours into v_policy_hours
    from public.professionals where id = v_booking.professional_id;
    v_refund_due := now() <= v_booking.starts_at
      - make_interval(hours => coalesce(v_policy_hours, 24));
  end if;

  if v_booking.status not in ('held', 'pending_payment', 'confirmed') then
    return jsonb_build_object('error', 'NOT_CANCELLABLE');
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_by = p_actor,
      cancel_reason = case
        when p_actor = 'professional' then 'professional_cancel'
        when v_refund_due then 'client_cancel_refund'
        else 'client_cancel_no_refund'
      end,
      updated_at = now()
  where id = v_booking.id;

  if v_refund_due and v_booking.payment_id is not null then
    insert into public.refunds (booking_id, payment_id, amount, reason, status)
    values (
      v_booking.id,
      v_booking.payment_id,
      v_booking.amount,
      case
        when p_actor = 'professional' then 'professional_cancel'
        else 'client_cancel_policy'
      end,
      'pending'
    );
  end if;

  return jsonb_build_object(
    'cancelled', true,
    'refund_due', v_refund_due and v_booking.payment_id is not null,
    'refund_amount', case
      when v_refund_due and v_booking.payment_id is not null then v_booking.amount
    end
  );
end;
$$;

-- Service-role RPCs (webhook processing, cron)

create or replace function public.process_payment_confirmation(
  p_payment_id bigint,
  p_booking_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings
  where id = p_booking_id for update;
  if v_booking.id is null then
    return jsonb_build_object('action', 'ignored', 'reason', 'booking_not_found');
  end if;

  if v_booking.status in ('held', 'pending_payment') then
    update public.bookings
    set status = 'confirmed',
        payment_id = p_payment_id,
        updated_at = now()
    where id = v_booking.id;
    return jsonb_build_object('action', 'confirmed', 'booking_id', v_booking.id);
  end if;

  if v_booking.status = 'cancelled' then
    if not exists (
      select 1 from public.refunds r
      where r.booking_id = v_booking.id and r.payment_id = p_payment_id
    ) then
      insert into public.refunds (booking_id, payment_id, amount, reason, status)
        values (v_booking.id, p_payment_id, v_booking.amount, 'booking_cancelled', 'pending');
    end if;
    return jsonb_build_object(
      'action', 'refund_due',
      'booking_id', v_booking.id,
      'payment_id', p_payment_id,
      'amount', v_booking.amount
    );
  end if;

  return jsonb_build_object('action', 'ignored', 'booking_id', v_booking.id);
end;
$$;

create or replace function public.release_expired_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.bookings
  set status = 'cancelled',
      cancelled_by = 'system',
      cancel_reason = 'hold_expired',
      updated_at = now()
  where status in ('held', 'pending_payment')
    and hold_expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.purge_old_hold_attempts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.hold_attempts
  where created_at < now() - interval '24 hours';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Keep internal functions off the public API surface
revoke execute on function public.availability_windows(uuid, date) from anon, authenticated;
revoke execute on function public.slot_fits_availability(uuid, timestamptz, int) from anon, authenticated;
revoke execute on function public.process_payment_confirmation(bigint, uuid) from anon, authenticated;
revoke execute on function public.release_expired_holds() from anon, authenticated;
revoke execute on function public.purge_old_hold_attempts() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.guard_mp_columns() from anon, authenticated;
