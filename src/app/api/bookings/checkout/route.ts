import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeARPhone } from "@/lib/phone";
import { createPreference, getValidAccessToken } from "@/lib/mercadopago";

const CheckoutSchema = z.object({
  slug: z.string().min(1).max(60),
  service_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  client_name: z.string().trim().min(2).max(80),
  client_phone: z.string().min(8).max(20),
  client_email: z.string().trim().email().max(120).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const phone = normalizeARPhone(parsed.data.client_phone);
  if (!phone) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const supabase = createAdminClient();
  const { data: hold, error } = await supabase.rpc("create_booking_hold", {
    p_slug: parsed.data.slug,
    p_service_id: parsed.data.service_id,
    p_starts_at: parsed.data.starts_at,
    p_client_name: parsed.data.client_name,
    p_client_phone: phone,
    p_client_email: parsed.data.client_email || null,
    p_ip: ip,
  });

  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const result = hold as {
    error?: string;
    booking_id?: string;
    hold_expires_at?: string;
    amount?: string;
  };

  if (result.error) {
    const status =
      result.error === "RATE_LIMITED" ||
      result.error === "TOO_MANY_HOLDS" ||
      result.error === "PROFESSIONAL_NOT_FOUND" ||
      result.error === "SERVICE_NOT_FOUND"
        ? 429
        : result.error === "SLOT_TAKEN" || result.error === "SLOT_UNAVAILABLE"
          ? 409
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const bookingId = result.booking_id as string;

  if (process.env.DEV_SIMULATE_WEBHOOK === "true") {
    return NextResponse.json({
      booking_id: bookingId,
      redirect_url: `/reserva/${bookingId}`,
    });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, professional_id, service_id, amount, hold_expires_at")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ booking_id: bookingId, redirect_url: `/reserva/${bookingId}` });
  }

  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", booking.service_id)
    .single();

  const accessToken = await getValidAccessToken(booking.professional_id);

  if (!accessToken) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_by: "system", cancel_reason: "payment_failed" })
      .eq("id", bookingId);
    return NextResponse.json({ error: "PAYMENT_UNAVAILABLE" }, { status: 400 });
  }

  try {
    const pref = await createPreference({
      accessToken,
      bookingId,
      professionalId: booking.professional_id,
      serviceName: service?.name ?? "Reserva",
      amount: booking.amount,
      payerEmail: parsed.data.client_email || null,
      holdExpiresAt: booking.hold_expires_at as string,
    });

    if (!pref) throw new Error("preference_failed");

    await supabase
      .from("bookings")
      .update({ preference_id: pref.id, status: "pending_payment" })
      .eq("id", bookingId);

    return NextResponse.json({
      booking_id: bookingId,
      redirect_url: pref.init_point,
      preference_id: pref.id,
    });
  } catch {
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_by: "system", cancel_reason: "payment_failed" })
      .eq("id", bookingId);
    return NextResponse.json({ error: "PAYMENT_UNAVAILABLE" }, { status: 502 });
  }
}
