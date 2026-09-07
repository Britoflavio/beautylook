import { MercadoPagoConfig, OAuth, Payment, PaymentRefund, Preference } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";

type ProfessionalRow = {
  id: string;
  mp_user_id: number | null;
  mp_access_token_enc: string | null;
  mp_refresh_token_enc: string | null;
  mp_token_expires_at: string | null;
  mp_status: string;
};

export async function getValidAccessToken(professionalId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: pro } = await supabase
    .from("professionals")
    .select("id, mp_user_id, mp_access_token_enc, mp_refresh_token_enc, mp_token_expires_at, mp_status")
    .eq("id", professionalId)
    .single<ProfessionalRow>();

  if (!pro || !pro.mp_access_token_enc) return null;

  const token = decrypt(pro.mp_access_token_enc);
  if (!token) return null;

  const expiresAt = pro.mp_token_expires_at ? new Date(pro.mp_token_expires_at).getTime() : 0;
  const needsRefresh = !expiresAt || Date.now() > expiresAt - 5 * 60 * 1000;

  if (!needsRefresh) return token;

  const refreshEnc = pro.mp_refresh_token_enc;
  if (!refreshEnc) return token;

  const refreshToken = decrypt(refreshEnc);
  if (!refreshToken) return token;

  const clientId = process.env.MP_APP_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return token;

  try {
    const cfg = new MercadoPagoConfig({ accessToken: token });
    const oauth = new OAuth(cfg);
    const res = await oauth.refresh({
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      },
    });

    const newAccess = res.access_token;
    const newRefresh = res.refresh_token;
    if (!newAccess) return token;

    const expiresIn = res.expires_in ?? 21600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const update: Record<string, unknown> = {
      mp_access_token_enc: encrypt(newAccess),
      mp_token_expires_at: newExpiresAt,
      mp_status: "connected",
    };
    if (newRefresh) update.mp_refresh_token_enc = encrypt(newRefresh);
    if (res.user_id) update.mp_user_id = res.user_id;

    await supabase.from("professionals").update(update).eq("id", professionalId);

    return newAccess;
  } catch {
    await supabase.from("professionals").update({ mp_status: "error" }).eq("id", professionalId);
    return token;
  }
}

export function getOAuthClient() {
  const accessToken = process.env.MP_CLIENT_SECRET ? "APP_USR-dummy" : "";
  return new OAuth(new MercadoPagoConfig({ accessToken }));
}

export async function createPreference(params: {
  accessToken: string;
  bookingId: string;
  professionalId: string;
  serviceName: string;
  amount: string | number;
  payerEmail?: string | null;
  holdExpiresAt: string;
}): Promise<{ id: string; init_point: string } | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const cfg = new MercadoPagoConfig({ accessToken: params.accessToken });
  const pref = new Preference(cfg);

  const res = await pref.create({
    body: {
      items: [
        {
          id: params.bookingId,
          title: params.serviceName,
          quantity: 1,
          unit_price: Number(params.amount),
          currency_id: "ARS",
        },
      ],
      external_reference: params.bookingId,
      metadata: { booking_id: params.bookingId, professional_id: params.professionalId },
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      back_urls: {
        success: `${appUrl}/reserva/${params.bookingId}?status=approved`,
        failure: `${appUrl}/reserva/${params.bookingId}?status=rejected`,
        pending: `${appUrl}/reserva/${params.bookingId}?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      expires: true,
      date_of_expiration: new Date(params.holdExpiresAt).toISOString(),
      statement_descriptor: "BeautyBook",
    },
  });

  if (!res.id || !res.init_point) return null;
  return { id: res.id, init_point: res.init_point };
}

export async function getPayment(paymentId: bigint | number, accessToken: string) {
  const cfg = new MercadoPagoConfig({ accessToken });
  const payment = new Payment(cfg);
  return payment.get({ id: String(paymentId) });
}

export async function refundPayment(paymentId: bigint | number, accessToken: string) {
  const cfg = new MercadoPagoConfig({ accessToken });
  const refund = new PaymentRefund(cfg);
  return refund.create({ payment_id: String(paymentId) });
}
