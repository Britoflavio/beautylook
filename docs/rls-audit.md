# RLS Audit — BeautyBook

Fecha: 2026-09-07
Migraciones: 20260907194247_schema, 20260907195210_fix_function_grants, 20260907203212_perf_indexes

## Principio

- `anon` sin políticas en ninguna tabla (default deny).
- Todo acceso anónimo va por `SECURITY DEFINER` RPCs.
- `authenticated` solo owner-scoped (`auth.uid() = professional_id` o `id`).
- `service_role` bypass RLS (admin.ts).

## Tablas

| Tabla | Políticas | Comentario |
|---|---|---|
| professionals | insert/select/update where `id=auth.uid()` | `guard_mp_columns` impide que owner escriba `mp_*`. |
| services | insert/select/update/delete where `professional_id=auth.uid()` | CRUD dashboard |
| availability_rules / exceptions | idem | Horarios |
| bookings | `select` only where `professional_id=auth.uid()` | Updates solo via `cancel_booking`, `process_payment_confirmation` RPCs (service_role). `held` creation via `create_booking_hold` (SECURITY DEFINER, anon permitido). |
| refunds | `select` where booking pertenece a `auth.uid()` | Insert solo RPCs |
| payment_events / hold_attempts | sin policy | Solo service_role (webhook / hold RPC) |
| storage `professional-photos` | select public; insert/update/delete donde `foldername = auth.uid()` | Foto perfil |

## RPCs

| RPC | SECURITY DEFINER | GRANT |
|---|---|---|
| `is_slug_available(text)` | yes | anon, authenticated |
| `get_public_profile(text)` | yes | anon, authenticated |
| `get_available_slots(text,uuid,date)` | yes | anon, authenticated |
| `get_booking_status(uuid)` | yes | anon, authenticated |
| `create_booking_hold` | yes | anon, authenticated |
| `cancel_booking` | yes | anon, authenticated (valida `professional` via `auth.uid()`) |
| `process_payment_confirmation` | yes | **service_role only** (revocado a public/anon) |
| `release_expired_holds` / `purge_old_hold_attempts` | yes | service_role only |
| `availability_windows`, `slot_fits_availability`, `set_updated_at`, `guard_mp_columns` | yes | revoked |

Verificación: `20260907195210_fix_function_grants.sql` revoca `public` y otorga solo `service_role` a `process_payment_confirmation`.

## Tests de invariantes

- `UNIQUE(slug)` + `CHECK slug ~` en DB, sugerencias en app, race manejado por `23505`.
- `EXCLUDE USING gist (professional_id, tstzrange)` bloquea solapamiento aunque app valide.
- `payment_events.payment_id UNIQUE` asegura idempotencia webhook.

## No issues

- No hay políticas `FOR ALL` amplias.
- `auto_expose_new_tables` comentado en `supabase/config.toml`.
- Storage no permite overwrite cross-user.
