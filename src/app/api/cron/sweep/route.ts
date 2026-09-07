import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, refundPayment } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const supabase = createAdminClient();
  const results: Record<string, unknown> = {};

  const { data: released, error: relErr } = await supabase.rpc("release_expired_holds");
  results.released_holds = relErr ? { error: relErr.message } : released;

  const { data: purged, error: purgeErr } = await supabase.rpc("purge_old_hold_attempts");
  results.purged_attempts = purgeErr ? { error: purgeErr.message } : purged;

  const { data: pendingRefunds, error: refundsErr } = await supabase
    .from("refunds")
    .select("id, booking_id, payment_id, amount")
    .eq("status", "pending")
    .limit(20);

  if (refundsErr) {
    results.refunds = { error: refundsErr.message };
  } else if (pendingRefunds && pendingRefunds.length > 0) {
    const processed: unknown[] = [];
    for (const r of pendingRefunds) {
      const { data: booking } = await supabase.from("bookings").select("professional_id").eq("id", r.booking_id).single();
      if (!booking) {
        await supabase.from("refunds").update({ status: "failed", error: "booking_not_found" }).eq("id", r.id);
        processed.push({ id: r.id, status: "failed" });
        continue;
      }
      const token = await getValidAccessToken(booking.professional_id as string);
      if (!token) {
        processed.push({ id: r.id, status: "skipped_no_token" });
        continue;
      }
      try {
        const res = await refundPayment(r.payment_id as number, token) as { id?: string | number };
        await supabase.from("refunds").update({ status: "processed", mp_refund_id: String(res?.id ?? "") }).eq("id", r.id);
        processed.push({ id: r.id, status: "processed" });
      } catch (e) {
        await supabase.from("refunds").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", r.id);
        processed.push({ id: r.id, status: "failed" });
      }
    }
    results.refunds = processed;
  } else {
    results.refunds = [];
  }

  return NextResponse.json({ ok: true, ...results });
}

export async function POST(request: Request) {
  return GET(request);
}
