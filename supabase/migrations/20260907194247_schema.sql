-- Professionals (profile + MP OAuth state)
create table public.professionals (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text not null,
  display_name text not null,
  category text not null default 'otros',
  address text,
  city text,
  phone_whatsapp text not null,
  photo_url text,
  bio text,
  mp_user_id bigint,
  mp_access_token_enc text,
  mp_refresh_token_enc text,
  mp_token_expires_at timestamptz,
  mp_status text not null default 'disconnected'
    check (mp_status in ('connected', 'disconnected', 'error')),
  cancellation_policy_hours int not null default 24
    check (cancellation_policy_hours >= 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professionals_slug_key unique (slug),
  constraint professionals_slug_format check (
    slug ~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$'
  ),
  constraint professionals_phone_format check (
    phone_whatsapp ~ '^\+549[0-9]{8,10}$'
  )
);

-- Services offered
create table public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  name text not null,
  description text,
  duration_min int not null check (duration_min between 5 and 480),
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Weekly recurring availability (0 = Sunday)
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

-- Date overrides (vacation / holiday / custom hours for one day)
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  date date not null,
  is_full_day_off boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  constraint availability_exceptions_professional_date_key unique (professional_id, date),
  constraint availability_exception_window_check check (
    is_full_day_off
    or (start_time is not null and end_time is not null and start_time < end_time)
  )
);

-- Bookings (hold -> pending_payment -> confirmed | cancelled)
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id uuid not null references public.services (id),
  client_name text not null,
  client_phone text not null,
  client_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'held'
    check (status in ('held', 'pending_payment', 'confirmed', 'cancelled')),
  hold_expires_at timestamptz,
  preference_id text,
  payment_id bigint,
  amount numeric(10, 2) not null,
  currency text not null default 'ARS',
  cancelled_by text check (cancelled_by in ('professional', 'client', 'system')),
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_range_check check (starts_at < ends_at),
  constraint bookings_client_phone_format check (
    client_phone ~ '^\+549[0-9]{8,10}$'
  )
);

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('held', 'pending_payment', 'confirmed'));

-- Webhook idempotency (one row per MP payment)
create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id bigint not null,
  payment_status text,
  processed boolean not null default false,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_events_payment_id_key unique (payment_id)
);

-- Refund log
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  payment_id bigint not null,
  amount numeric(10, 2) not null,
  reason text not null
    check (
      reason in (
        'professional_cancel',
        'client_cancel_policy',
        'booking_cancelled',
        'manual'
      )
    ),
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  mp_refund_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hold-attempt log for IP/phone rate limiting
create table public.hold_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index services_professional_idx on public.services (professional_id);
create index availability_rules_professional_idx
  on public.availability_rules (professional_id);
create index availability_exceptions_professional_idx
  on public.availability_exceptions (professional_id);
create index bookings_professional_starts_idx
  on public.bookings (professional_id, starts_at);
create index bookings_status_idx on public.bookings (status);
create index hold_attempts_ip_created_idx
  on public.hold_attempts (ip_hash, created_at);
create index hold_attempts_phone_created_idx
  on public.hold_attempts (phone, created_at);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.professionals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payment_events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

-- Block owner-initiated writes to MP token columns (service role bypasses)
create or replace function public.guard_mp_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = new.id then
    if tg_op = 'UPDATE' then
      new.mp_user_id := old.mp_user_id;
      new.mp_access_token_enc := old.mp_access_token_enc;
      new.mp_refresh_token_enc := old.mp_refresh_token_enc;
      new.mp_token_expires_at := old.mp_token_expires_at;
      new.mp_status := old.mp_status;
    elsif tg_op = 'INSERT' then
      new.mp_user_id := null;
      new.mp_access_token_enc := null;
      new.mp_refresh_token_enc := null;
      new.mp_token_expires_at := null;
      new.mp_status := 'disconnected';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_mp_columns before insert or update on public.professionals
  for each row execute function public.guard_mp_columns();

-- Row Level Security: default deny for anon; owner-scoped policies for authenticated
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.hold_attempts enable row level security;

create policy professionals_owner_insert on public.professionals
  for insert to authenticated with check (auth.uid() = id);
create policy professionals_owner_select on public.professionals
  for select to authenticated using (auth.uid() = id);
create policy professionals_owner_update on public.professionals
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy services_owner_insert on public.services
  for insert to authenticated with check (professional_id = auth.uid());
create policy services_owner_select on public.services
  for select to authenticated using (professional_id = auth.uid());
create policy services_owner_update on public.services
  for update to authenticated
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy services_owner_delete on public.services
  for delete to authenticated using (professional_id = auth.uid());

create policy availability_rules_owner_insert on public.availability_rules
  for insert to authenticated with check (professional_id = auth.uid());
create policy availability_rules_owner_select on public.availability_rules
  for select to authenticated using (professional_id = auth.uid());
create policy availability_rules_owner_update on public.availability_rules
  for update to authenticated
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy availability_rules_owner_delete on public.availability_rules
  for delete to authenticated using (professional_id = auth.uid());

create policy availability_exceptions_owner_insert on public.availability_exceptions
  for insert to authenticated with check (professional_id = auth.uid());
create policy availability_exceptions_owner_select on public.availability_exceptions
  for select to authenticated using (professional_id = auth.uid());
create policy availability_exceptions_owner_update on public.availability_exceptions
  for update to authenticated
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
create policy availability_exceptions_owner_delete on public.availability_exceptions
  for delete to authenticated using (professional_id = auth.uid());

create policy bookings_owner_select on public.bookings
  for select to authenticated using (professional_id = auth.uid());

create policy refunds_owner_select on public.refunds
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = refunds.booking_id and b.professional_id = auth.uid()
    )
  );

-- Storage: public profile photos, owner-scoped writes
insert into storage.buckets (id, name, public)
values ('professional-photos', 'professional-photos', true)
on conflict (id) do nothing;

create policy professional_photos_public_read on storage.objects
  for select using (bucket_id = 'professional-photos');
create policy professional_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'professional-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy professional_photos_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'professional-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'professional-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy professional_photos_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'professional-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
