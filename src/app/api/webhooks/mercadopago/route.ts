import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, getPayment, refundPayment } from "@/lib/mercadopago";

function verifySignature(req: Request): { dataId: string | null; valid: boolean } {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const devSim = process.env.DEV_SIMULATE_WEBHOOK === "true";

  const xSignature = req.headers.get("x-signature") ?? req.headers.get("X-Signature");
  const xRequestId = req.headers.get("x-request-id") ?? req.headers.get("X-Request-Id");

  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (devSim) return { dataId: dataId ?? null, valid: true };
  if (!secret) return { dataId: null, valid: false };

  if (!xSignature || !dataId) return { dataId: null, valid: false };

  try {
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k.trim(), (v ?? "").trim()];
      }),
    );
    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return { dataId: null, valid: false };

    const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`;
    const hmac = createHmac("sha256", secret).update(manifest).digest("hex");

    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(v1, "hex");
    const valid = a.length === b.length && timingSafeEqual(a, b);
    return { dataId, valid };
  } catch {
    return { dataId: null, valid: false };
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: Record<string, unknown>;
  try {
    body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { dataId, valid } = verifySignature(request);
  if (!valid) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const type = (body.type as string) ?? (body.topic as string) ?? "";
  const action = (body.action as string) ?? "";

  const topic = type || action;
  if (topic && topic !== "payment" && !rawBody.includes("payment")) {
    return NextResponse.json({ received: true });
  }

  const data = body.data as { id?: string | number } | undefined;
  const paymentIdRaw = data?.id ?? (body["data.id"] as string | number | undefined) ?? dataId;
  if (!paymentIdRaw) return NextResponse.json({ received: true });

  const paymentId = BigInt(String(paymentIdRaw));

  const payloadId = Number(paymentId);
  if (!Number.isSafeInteger(payloadId)) {
    return NextResponse.json({ received: true });
  }

  const { data: existing } = await supabase
    .from("payment_events")
    .select("payment_id, processed")
    .eq("payment_id", Number(paymentId))
    .maybeSingle();

  if (existing?.processed) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  if (!existing) {
    const { error: insErr } = await supabase.from("payment_events").insert({
      payment_id: Number(paymentId),
      payment_status: (body as { status?: string }).status ?? null,
      payload: body as never,
      processed: false,
    });
    if (insErr && !insErr.message.includes("duplicate")) {
      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }
    if (insErr && insErr.message.includes("duplicate")) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
  }

  if (process.env.DEV_SIMULATE_WEBHOOK === "true" && body["booking_id"]) {
    const bookingId = body["booking_id"] as string;
    const { data: res } = await supabase.rpc("process_payment_confirmation", {
      p_payment_id: Number(paymentId),
      p_booking_id: bookingId,
    });
    await supabase.from("payment_events").update({ processed: true, payment_status: "approved" }).eq("payment_id", Number(paymentId));
    return NextResponse.json({ received: true, result: res });
  }

  const devSim2 = process.env.DEV_SIMULATE_WEBHOOK === "true";
  if (devSim2) {
    const bookingId =
      (body["external_reference"] as string) ??
      (body["booking_id"] as string) ??
      String(data?.id ?? "");

    if (bookingId) {
      const { data: res } = await supabase.rpc("process_payment_confirmation", {
        p_payment_id: Number(paymentId),
        p_booking_id: bookingId,
      });
      await supabase.from("payment_events").update({ processed: true }).eq("payment_id", Number(paymentId));
      return NextResponse.json({ received: true, dev: true, result: res });
    }
  }

  let payment: Awaited<ReturnType<typeof getPayment>> | null = null;
  let bookingId: string | null = null;
  let professionalId: string | null = null;

  const tryFetchWithProfessional = async (proId: string): Promise<typeof payment> => {
    const token = await getValidAccessToken(proId);
    if (!token) return null;
    try {
      return await getPayment(paymentId, token);
    } catch {
      return null;
    }
  };

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, professional_id")
    .eq("payment_id", Number(paymentId))
    .limit(1);

  if (bookings && bookings.length > 0) {
    bookingId = bookings[0].id as string;
    professionalId = bookings[0].professional_id as string;
    payment = await tryFetchWithProfessional(professionalId);
  }

  if (!payment) {
    const { data: candidates } = await supabase
      .from("professionals")
      .select("id")
      .eq("mp_status", "connected")
      .limit(10);
    for (const c of candidates ?? []) {
      const p = await tryFetchWithProfessional(c.id as string);
      if (p) {
        const maybePayment = p as unknown as { external_reference?: string; metadata?: { booking_id?: string } };
        const ref = maybePayment.external_reference ?? maybePayment.metadata?.booking_id;
        if (ref) {
          const { data: b } = await supabase.from("bookings").select("id, professional_id").eq("id", ref).maybeSingle();
          if (b) {
            bookingId = b.id as string;
            professionalId = b.professional_id as string;
            payment = p;
            break;
          }
        }
        if (!bookingId) {
          payment = p;
          const ext = maybePayment.external_reference ?? maybePayment.metadata?.booking_id ?? null;
          if (ext) bookingId = ext;
          professionalId = c.id as string;
          break;
        }
      }
    }
  }

  if (!payment) {
    await supabase.from("payment_events").update({ processed: false }).eq("payment_id", Number(paymentId));
    return NextResponse.json({ received: true, pending: true });
  }

  const p = payment as unknown as {
    id: number;
    status: string;
    external_reference?: string;
    metadata?: { booking_id?: string };
    transaction_amount?: number;
  };

  const extRef = p.external_reference ?? p.metadata?.booking_id ?? null;
  if (!bookingId && extRef) {
    bookingId = extRef;
    const { data: b } = await supabase.from("bookings").select("professional_id").eq("id", bookingId).maybeSingle();
    if (b) professionalId = b.professional_id as string;
  }

  if (!bookingId) {
    await supabase.from("payment_events").update({ processed: true, payment_status: p.status }).eq("payment_id", Number(paymentId));
    return NextResponse.json({ received: true, ignored: true });
  }

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("process_payment_confirmation", {
    p_payment_id: Number(paymentId),
    p_booking_id: bookingId,
  });

  if (rpcErr) {
    return NextResponse.json({ error: "RPC_FAILED" }, { status: 500 });
  }

  const result = rpcRes as { action?: string; amount?: number } | null;

  if (result?.action === "refund_due" && professionalId) {
    const token = await getValidAccessToken(professionalId);
    if (token) {
      try {
        await refundPayment(paymentId, token);
        await supabase
          .from("refunds")
          .update({ status: "processed" })
          .eq("booking_id", bookingId)
          .eq("payment_id", Number(paymentId));
      } catch {
        await supabase.from("refunds").update({ status: "failed", error: "refund_failed" }).eq("booking_id", bookingId).eq("payment_id", Number(paymentId));
      }
    }
  }

  if (p.status === "approved" || result?.action === "confirmed" || result?.action === "refund_due") {
    await supabase.from("payment_events").update({ processed: true, payment_status: p.status, payload: payment as never }).eq("payment_id", Number(paymentId));
  } else if (p.status === "rejected" || p.status === "cancelled") {
    await supabase.from("payment_events").update({ processed: true, payment_status: p.status, payload: payment as never }).eq("payment_id", Number(paymentId));
  } else {
    await supabase.from("payment_events").update({ payment_status: p.status, payload: payment as never }).eq("payment_id", Number(paymentId));
  }

  if (p.status === "approved" && bookingId) {
    const { data: b } = await supabase.from("bookings").select("client_email, client_name, starts_at, services(name), professionals(display_name, phone_whatsapp)").eq("id", bookingId).maybeSingle() as { data: { client_email: string | null; client_name: string; starts_at: string; services: { name: string } | null; professionals: { display_name: string; phone_whatsapp: string } | null } | null };
    if (b?.client_email) {
      const { bookingConfirmedEmail } = await import("@/lib/email");
      await bookingConfirmedEmail({
        to: b.client_email,
        clientName: b.client_name,
        serviceName: b.services?.name ?? "Turno",
        startsAt: b.starts_at,
        professionalName: b.professionals?.display_name ?? "",
        professionalPhone: b.professionals?.phone_whatsapp ?? "",
        amount: String(result?.amount ?? ""),
      });
    }
  }

  return NextResponse.json({ received: true, action: result?.action ?? null });
}
