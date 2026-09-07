# Mercado Pago Setup — BeautyBook

## 1. Crear aplicación OAuth

1. Ir a https://applications.mercadopago.com → Crear aplicación.
2. Configurar **Redirect URI**: `https://TU_APP/api/auth/mercadopago/callback` y `http://localhost:3000/api/auth/mercadopago/callback` para dev.
3. Copiar `MP_APP_ID` y `MP_CLIENT_SECRET` a `.env.local` / Vercel env.

## 2. Encryption key

Generar clave 32 bytes base64 para cifrar tokens en `professionals.mp_*_enc`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Guardar en `MP_ENCRYPTION_KEY`. **No rotar sin migrar datos** — los tokens existentes quedarían ilegibles.

## 3. Webhook

En el dashboard MP → Webhooks:

- URL: `https://TU_APP/api/webhooks/mercadopago`
- Eventos: `payment`
- Copiar **Secret / HMAC** a `MP_WEBHOOK_SECRET`

La ruta valida `x-signature: ts=...,v1=...` con:

```
manifest = `id:${data.id};request-id:${x-request-id};ts:${ts};`
hmac = HMAC-SHA256(secret, manifest)
```

Usa `timingSafeEqual`. En `DEV_SIMULATE_WEBHOOK=true` la verificación se omite.

Idempotencia: `payment_events.payment_id` UNIQUE. Duplicados retornan `deduplicated: true` sin reprocesar.

## 4. Flujo OAuth profesional

1. Profesional en `/dashboard/settings` → **Conectar con Mercado Pago** → `GET /api/auth/mercadopago` redirige a `auth.mercadopago.com/authorization`.
2. Callback `/api/auth/mercadopago/callback?code=` → `OAuth.create({client_id, client_secret, code, redirect_uri})` → guarda `encrypt(access_token)`, `encrypt(refresh_token)`, `mp_token_expires_at`, `mp_user_id`, `mp_status=connected`.
3. DB trigger `guard_mp_columns` bloquea que el profesional escriba directo esas columnas — solo `service_role` puede vía callback.

## 5. Lazy refresh

`getValidAccessToken(professionalId)`:

- `decrypt(mp_access_token_enc)`; si `now > expires_at -5min` y hay `refresh_token`, llama `OAuth.refresh({client_id, client_secret, refresh_token})`, re-encripta y actualiza `mp_token_expires_at`.

Usado en `POST /api/bookings/checkout` (crea Preference) y en webhook/cron para `Payment.get` y `PaymentRefund.create`.

## 6. Checkout Pro Preference

`POST /api/bookings/checkout`:

- `rpc create_booking_hold` → `status=held` 25 min.
- Obtiene `service.name/amount` + `getValidAccessToken`.
- `new Preference(MercadoPagoConfig{accessToken}).create({items:[{id:bookingId,title:serviceName,unit_price, currency:ARS}], external_reference:bookingId, metadata:{booking_id, professional_id}, back_urls:{success,failure,pending}=/reserva/[id]?status=, auto_return:"approved", notification_url:/api/webhooks/mercadopago, expires:true, date_of_expiration:hold_expires_at})`
- Guarda `preference_id`, pasa a `status=pending_payment`, retorna `init_point` al cliente (redirect).

Si `DEV_SIMULATE_WEBHOOK=true` omite creación de Preference y deja `held` para simular.

## 7. Webhook processing

`POST /api/webhooks/mercadopago`:

1. Verifica firma (o skip dev).
2. Inserta `payment_events` (idempotencia).
3. Si `paymentId` ya `processed=true` → deduplica.
4. Obtiene `payment` vía `Payment.get` (iterando `professionals where mp_status=connected` hasta encontrar match por `external_reference`).
5. `rpc process_payment_confirmation(p_payment_id, p_booking_id)` — confirma `held→confirmed` o crea `refunds pending` si `cancelled`.
6. Si `refund_due` → `PaymentRefund.create` con token del profesional.
7. Marca `payment_events.processed=true`. Si `payment.status=approved` dispara `bookingConfirmedEmail` a `client_email`.

## 8. Reembolsos

`cancel_booking(p_actor)` genera `refunds pending`; webhook y `GET /api/cron/sweep` (con `Authorization: Bearer CRON_SECRET`) procesa pendientes vía `refundPayment`.

## 9. Cron

- `pg_cron` local: `release_expired_holds` cada 2 min, `purge_old_hold_attempts` diario 03:00.
- Vercel Cron: configurar `GET /api/cron/sweep` cada 2-5 min con header `Authorization: Bearer CRON_SECRET`.

## 10. Env checklist deploy

```
NEXT_PUBLIC_APP_URL=https://...
NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
MP_APP_ID / MP_CLIENT_SECRET / MP_WEBHOOK_SECRET / MP_ENCRYPTION_KEY (b64 32B)
RESEND_API_KEY / EMAIL_FROM
CRON_SECRET (random 32+ chars)
DEV_SIMULATE_WEBHOOK=false en prod
```
